import { useGetTimeEntries, useGetVacationDaysCount, useGetOnCallDaysCount } from '../hooks/useQueries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Calendar as CalendarIcon, Briefcase, Coffee, Zap, Utensils, Car, Umbrella } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DayType } from '../backend';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

type PeriodType = 'weekly' | 'monthly' | 'yearly';

// Helper function to check if a date is a weekday (Monday-Friday)
function isWeekday(date: Date): boolean {
  const day = date.getDay();
  return day >= 1 && day <= 5;
}

// Helper function to get ISO week number (1-52/53)
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export default function Dashboard() {
  const { data: timeEntries = [], isLoading: entriesLoading } = useGetTimeEntries();
  const { data: vacationDaysCount = 0, isLoading: vacationLoading } = useGetVacationDaysCount();
  const { data: onCallDaysCount = 0, isLoading: onCallLoading } = useGetOnCallDaysCount();

  const [periodType, setPeriodType] = useState<PeriodType>('monthly');
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth() + 1);

  const isLoading = entriesLoading || vacationLoading || onCallLoading;

  const stats = useMemo(() => {
    let filteredEntries = timeEntries;

    // Filter by period
    if (periodType === 'weekly' || periodType === 'monthly') {
      filteredEntries = timeEntries.filter((entry) => {
        const entryDate = new Date(Number(entry.date) / 1000000);
        return entryDate.getFullYear() === selectedYear;
      });
    } else if (periodType === 'yearly') {
      filteredEntries = timeEntries.filter((entry) => {
        const entryDate = new Date(Number(entry.date) / 1000000);
        return entryDate.getFullYear() === selectedYear;
      });
    }

    // Count work days: regular work days + weekday on-call days
    let workDaysCount = 0;
    const workDays = filteredEntries.filter((e) => e.typeOfDay === DayType.work);
    workDaysCount += workDays.length;
    
    const astreinteDays = filteredEntries.filter((e) => e.typeOfDay === DayType.astreinte);
    astreinteDays.forEach((entry) => {
      const date = new Date(Number(entry.date) / 1000000);
      if (isWeekday(date)) {
        workDaysCount++;
      }
    });

    const congeDays = filteredEntries.filter((e) => e.typeOfDay === DayType.conge);

    // Calculate total hours
    const totalHeuresNormales = filteredEntries.reduce((sum, entry) => {
      const morning = (Number(entry.endMorning) - Number(entry.startMorning)) / 60;
      const afternoon = (Number(entry.endAfternoon) - Number(entry.startAfternoon)) / 60;
      return sum + morning + afternoon;
    }, 0);

    const totalHeuresAstreinte = filteredEntries.reduce((sum, entry) => {
      if (entry.startAstreinte !== undefined && entry.endAstreinte !== undefined) {
        return sum + (Number(entry.endAstreinte) - Number(entry.startAstreinte)) / 60;
      }
      return sum;
    }, 0);

    const totalHeuresRepas = filteredEntries.reduce((sum, entry) => {
      return sum + Number(entry.heuresRepas) / 60;
    }, 0);

    const totalHeuresTrajet = filteredEntries.reduce((sum, entry) => {
      return sum + Number(entry.heuresTrajet) / 60;
    }, 0);

    // Chart data based on period type
    let chartData: any[] = [];
    
    if (periodType === 'weekly') {
      // Group by ISO week number
      const weeklyData: { [key: number]: { normales: number; astreinte: number; repas: number; trajet: number } } = {};
      filteredEntries.forEach((entry) => {
        const date = new Date(Number(entry.date) / 1000000);
        const weekNumber = getWeekNumber(date);
        
        if (!weeklyData[weekNumber]) {
          weeklyData[weekNumber] = { normales: 0, astreinte: 0, repas: 0, trajet: 0 };
        }
        
        const morning = (Number(entry.endMorning) - Number(entry.startMorning)) / 60;
        const afternoon = (Number(entry.endAfternoon) - Number(entry.startAfternoon)) / 60;
        weeklyData[weekNumber].normales += morning + afternoon;
        
        if (entry.startAstreinte !== undefined && entry.endAstreinte !== undefined) {
          weeklyData[weekNumber].astreinte += (Number(entry.endAstreinte) - Number(entry.startAstreinte)) / 60;
        }
        
        weeklyData[weekNumber].repas += Number(entry.heuresRepas) / 60;
        weeklyData[weekNumber].trajet += Number(entry.heuresTrajet) / 60;
      });

      chartData = Object.entries(weeklyData)
        .sort(([weekA], [weekB]) => Number(weekA) - Number(weekB))
        .map(([weekNum, hours]) => ({
          period: `S${weekNum}`,
          weekNumber: Number(weekNum),
          normales: Math.round(hours.normales * 10) / 10,
          astreinte: Math.round(hours.astreinte * 10) / 10,
          repas: Math.round(hours.repas * 10) / 10,
          trajet: Math.round(hours.trajet * 10) / 10,
        }));
    } else if (periodType === 'monthly') {
      // Group by month
      const monthlyData: { [key: number]: { normales: number; astreinte: number; repas: number; trajet: number } } = {};
      filteredEntries.forEach((entry) => {
        const date = new Date(Number(entry.date) / 1000000);
        const month = date.getMonth() + 1;
        
        if (!monthlyData[month]) {
          monthlyData[month] = { normales: 0, astreinte: 0, repas: 0, trajet: 0 };
        }
        
        const morning = (Number(entry.endMorning) - Number(entry.startMorning)) / 60;
        const afternoon = (Number(entry.endAfternoon) - Number(entry.startAfternoon)) / 60;
        monthlyData[month].normales += morning + afternoon;
        
        if (entry.startAstreinte !== undefined && entry.endAstreinte !== undefined) {
          monthlyData[month].astreinte += (Number(entry.endAstreinte) - Number(entry.startAstreinte)) / 60;
        }
        
        monthlyData[month].repas += Number(entry.heuresRepas) / 60;
        monthlyData[month].trajet += Number(entry.heuresTrajet) / 60;
      });

      const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
      chartData = Object.entries(monthlyData)
        .sort(([monthA], [monthB]) => Number(monthA) - Number(monthB))
        .map(([month, hours]) => ({
          period: monthNames[Number(month) - 1],
          monthNumber: Number(month),
          normales: Math.round(hours.normales * 10) / 10,
          astreinte: Math.round(hours.astreinte * 10) / 10,
          repas: Math.round(hours.repas * 10) / 10,
          trajet: Math.round(hours.trajet * 10) / 10,
        }));
    } else {
      // Yearly: show totals
      chartData = [{
        period: selectedYear.toString(),
        normales: Math.round(totalHeuresNormales * 10) / 10,
        astreinte: Math.round(totalHeuresAstreinte * 10) / 10,
        repas: Math.round(totalHeuresRepas * 10) / 10,
        trajet: Math.round(totalHeuresTrajet * 10) / 10,
      }];
    }

    const pieData = [
      { name: 'Travail', value: workDaysCount, color: 'oklch(0.646 0.222 41.116)' },
      { name: 'Congés', value: congeDays.length, color: 'oklch(0.6 0.118 184.704)' },
      { name: 'Astreintes', value: astreinteDays.length, color: 'oklch(0.769 0.188 70.08)' },
    ];

    const hoursDistribution = [
      { name: 'Travail', value: totalHeuresNormales, color: 'oklch(0.646 0.222 41.116)' },
      { name: 'Repas', value: totalHeuresRepas, color: 'oklch(0.769 0.188 70.08)' },
      { name: 'Trajet', value: totalHeuresTrajet, color: 'oklch(0.6 0.118 184.704)' },
    ].filter(item => item.value > 0);

    return {
      totalHeuresNormales: Math.round(totalHeuresNormales * 10) / 10,
      totalHeuresAstreinte: Math.round(totalHeuresAstreinte * 10) / 10,
      totalHeuresRepas: Math.round(totalHeuresRepas * 10) / 10,
      totalHeuresTrajet: Math.round(totalHeuresTrajet * 10) / 10,
      workDays: workDaysCount,
      congeDays: congeDays.length,
      astreinteDays: astreinteDays.length,
      chartData,
      pieData,
      hoursDistribution,
    };
  }, [timeEntries, periodType, selectedYear, selectedMonth]);

  const getPeriodLabel = () => {
    if (periodType === 'weekly') return `Semaines de ${selectedYear}`;
    if (periodType === 'monthly') return `Mois de ${selectedYear}`;
    return `Année ${selectedYear}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement des données...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-foreground mb-2">Tableau de bord</h2>
        <p className="text-muted-foreground">Vue d'ensemble de votre activité par période</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Période d'affichage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Type :</label>
              <Select value={periodType} onValueChange={(value) => setPeriodType(value as PeriodType)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Hebdomadaire</SelectItem>
                  <SelectItem value="monthly">Mensuel</SelectItem>
                  <SelectItem value="yearly">Annuel</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Année :</label>
              <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="ml-auto">
              <p className="text-sm text-muted-foreground">
                Affichage : <strong>{getPeriodLabel()}</strong>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Heures normales
            </CardTitle>
            <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">
              {stats.totalHeuresNormales}h
            </div>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">{getPeriodLabel()}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 border-amber-200 dark:border-amber-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-amber-900 dark:text-amber-100">
              Heures astreinte
            </CardTitle>
            <Zap className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-900 dark:text-amber-100">
              {stats.totalHeuresAstreinte}h
            </div>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">Calculées précisément</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-950 dark:to-rose-900 border-rose-200 dark:border-rose-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-rose-900 dark:text-rose-100">
              Heures repas
            </CardTitle>
            <Utensils className="w-5 h-5 text-rose-600 dark:text-rose-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-rose-900 dark:text-rose-100">
              {stats.totalHeuresRepas}h
            </div>
            <p className="text-xs text-rose-700 dark:text-rose-300 mt-1">Exclues du travail</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-950 dark:to-cyan-900 border-cyan-200 dark:border-cyan-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-cyan-900 dark:text-cyan-100">
              Heures trajet
            </CardTitle>
            <Car className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-cyan-900 dark:text-cyan-100">
              {stats.totalHeuresTrajet}h
            </div>
            <p className="text-xs text-cyan-700 dark:text-cyan-300 mt-1">{getPeriodLabel()}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-green-900 dark:text-green-100">
              Jours travaillés
            </CardTitle>
            <Briefcase className="w-5 h-5 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-900 dark:text-green-100">
              {stats.workDays}
            </div>
            <p className="text-xs text-green-700 dark:text-green-300 mt-1">Incl. astreintes semaine</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-purple-900 dark:text-purple-100">
              Jours de congé
            </CardTitle>
            <Umbrella className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-900 dark:text-purple-100">
              {vacationDaysCount}
            </div>
            <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">Total annuel</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-950 dark:to-indigo-900 border-indigo-200 dark:border-indigo-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-indigo-900 dark:text-indigo-100">
              Congés période
            </CardTitle>
            <CalendarIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-indigo-900 dark:text-indigo-100">
              {stats.congeDays}
            </div>
            <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-1">{getPeriodLabel()}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-orange-900 dark:text-orange-100">
              Jours astreinte
            </CardTitle>
            <Coffee className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-900 dark:text-orange-100">
              {onCallDaysCount}
            </div>
            <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">Total annuel</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Heures par {periodType === 'weekly' ? 'semaine' : periodType === 'monthly' ? 'mois' : 'année'}</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="period" 
                    className="text-xs"
                    label={{ 
                      value: periodType === 'weekly' ? 'Semaine' : periodType === 'monthly' ? 'Mois' : 'Année', 
                      position: 'insideBottom', 
                      offset: -5, 
                      style: { fontSize: '12px' } 
                    }}
                  />
                  <YAxis 
                    className="text-xs"
                    label={{ value: 'Heures', angle: -90, position: 'insideLeft', style: { fontSize: '12px' } }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'oklch(var(--card))',
                      border: '1px solid oklch(var(--border))',
                      borderRadius: '0.5rem',
                    }}
                    labelFormatter={(label) => {
                      const item = stats.chartData.find(d => d.period === label);
                      if (periodType === 'weekly' && item) {
                        return `Semaine ${item.weekNumber}`;
                      } else if (periodType === 'monthly' && item) {
                        return `Mois ${item.monthNumber}`;
                      }
                      return label;
                    }}
                  />
                  <Legend />
                  <Bar dataKey="normales" fill="oklch(0.646 0.222 41.116)" name="Heures normales" />
                  <Bar dataKey="astreinte" fill="oklch(0.769 0.188 70.08)" name="Heures astreinte" />
                  <Bar dataKey="repas" fill="oklch(0.7 0.15 25)" name="Heures repas" />
                  <Bar dataKey="trajet" fill="oklch(0.65 0.15 220)" name="Heures trajet" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Aucune donnée disponible pour cette période
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Répartition des jours ({getPeriodLabel()})</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.pieData.some((d) => d.value > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stats.pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      percent > 0 ? `${name}: ${(percent * 100).toFixed(0)}%` : ''
                    }
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {stats.pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'oklch(var(--card))',
                      border: '1px solid oklch(var(--border))',
                      borderRadius: '0.5rem',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Aucune donnée disponible pour cette période
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Répartition Travail / Repas / Trajet ({getPeriodLabel()})</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.hoursDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stats.hoursDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value, percent }) =>
                      percent > 0 ? `${name}: ${value.toFixed(1)}h (${(percent * 100).toFixed(0)}%)` : ''
                    }
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {stats.hoursDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'oklch(var(--card))',
                      border: '1px solid oklch(var(--border))',
                      borderRadius: '0.5rem',
                    }}
                    formatter={(value: number) => `${value.toFixed(1)}h`}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Aucune donnée disponible pour cette période
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
