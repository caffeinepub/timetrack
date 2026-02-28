import { useGetTimeEntries, useGetVacationDaysCount, useGetOnCallDaysCount } from '../hooks/useQueries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Calendar as CalendarIcon, Briefcase, Coffee, Zap, Utensils, Car, Umbrella } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import { DayType } from '../backend';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getWeeksForMonth, getCurrentWeekOption, isDateInWeek, type WeekOption } from '../utils/weekOptions';

type PeriodType = 'weekly' | 'monthly' | 'yearly';

// Helper function to check if a date is a weekday (Monday-Friday)
function isWeekday(date: Date): boolean {
  const day = date.getDay();
  return day >= 1 && day <= 5;
}

export default function Dashboard() {
  const { data: timeEntries = [], isLoading: entriesLoading } = useGetTimeEntries();
  const { data: vacationDaysCount = 0, isLoading: vacationLoading } = useGetVacationDaysCount();
  const { data: onCallDaysCount = 0, isLoading: onCallLoading } = useGetOnCallDaysCount();

  const [periodType, setPeriodType] = useState<PeriodType>('monthly');
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  
  // Weekly mode: month and week selection
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth() + 1);
  const [selectedWeek, setSelectedWeek] = useState<WeekOption | null>(null);
  const [availableWeeks, setAvailableWeeks] = useState<WeekOption[]>([]);

  const isLoading = entriesLoading || vacationLoading || onCallLoading;

  // Update available weeks when year or month changes in weekly mode
  useEffect(() => {
    if (periodType === 'weekly') {
      const weeks = getWeeksForMonth(selectedYear, selectedMonth);
      setAvailableWeeks(weeks);
      
      // Auto-select current week if it's in the list, otherwise select first week
      const currentWeek = getCurrentWeekOption();
      const matchingWeek = weeks.find(w => 
        w.weekNumber === currentWeek.weekNumber && 
        w.year === currentWeek.year
      );
      
      if (matchingWeek) {
        setSelectedWeek(matchingWeek);
      } else if (weeks.length > 0) {
        setSelectedWeek(weeks[0]);
      } else {
        setSelectedWeek(null);
      }
    }
  }, [periodType, selectedYear, selectedMonth]);

  // Initialize to current week on mount
  useEffect(() => {
    if (periodType === 'weekly' && !selectedWeek) {
      const currentWeek = getCurrentWeekOption();
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      
      setSelectedMonth(currentMonth);
      setSelectedYear(currentYear);
      
      const weeks = getWeeksForMonth(currentYear, currentMonth);
      setAvailableWeeks(weeks);
      
      const matchingWeek = weeks.find(w => 
        w.weekNumber === currentWeek.weekNumber && 
        w.year === currentWeek.year
      );
      
      setSelectedWeek(matchingWeek || (weeks.length > 0 ? weeks[0] : null));
    }
  }, [periodType, selectedWeek]);

  const stats = useMemo(() => {
    let filteredEntries = timeEntries;

    // Filter by period
    if (periodType === 'weekly') {
      if (selectedWeek) {
        filteredEntries = timeEntries.filter((entry) => 
          isDateInWeek(entry.date, selectedWeek.startDate, selectedWeek.endDate)
        );
      } else {
        filteredEntries = [];
      }
    } else if (periodType === 'monthly') {
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
    
    if (periodType === 'weekly' && selectedWeek) {
      // Show daily breakdown for the selected week
      const dailyData: { [key: string]: { normales: number; astreinte: number; repas: number; trajet: number } } = {};
      
      filteredEntries.forEach((entry) => {
        const date = new Date(Number(entry.date) / 1000000);
        const dayKey = date.toISOString().split('T')[0];
        
        if (!dailyData[dayKey]) {
          dailyData[dayKey] = { normales: 0, astreinte: 0, repas: 0, trajet: 0 };
        }
        
        const morning = (Number(entry.endMorning) - Number(entry.startMorning)) / 60;
        const afternoon = (Number(entry.endAfternoon) - Number(entry.startAfternoon)) / 60;
        dailyData[dayKey].normales += morning + afternoon;
        
        if (entry.startAstreinte !== undefined && entry.endAstreinte !== undefined) {
          dailyData[dayKey].astreinte += (Number(entry.endAstreinte) - Number(entry.startAstreinte)) / 60;
        }
        
        dailyData[dayKey].repas += Number(entry.heuresRepas) / 60;
        dailyData[dayKey].trajet += Number(entry.heuresTrajet) / 60;
      });

      const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
      chartData = Object.entries(dailyData)
        .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
        .map(([dateStr, hours]) => {
          const date = new Date(dateStr);
          const dayName = dayNames[date.getDay()];
          const dayNum = date.getDate();
          return {
            period: `${dayName} ${dayNum}`,
            normales: Math.round(hours.normales * 10) / 10,
            astreinte: Math.round(hours.astreinte * 10) / 10,
            repas: Math.round(hours.repas * 10) / 10,
            trajet: Math.round(hours.trajet * 10) / 10,
          };
        });
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
  }, [timeEntries, periodType, selectedYear, selectedWeek]);

  const getPeriodLabel = () => {
    if (periodType === 'weekly') {
      return selectedWeek ? selectedWeek.label : 'Aucune semaine sélectionnée';
    }
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

  const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

  return (
    <div className="space-y-6 sm:space-y-8 min-w-0">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Tableau de bord</h2>
        <p className="text-sm sm:text-base text-muted-foreground">Vue d'ensemble de votre activité par période</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Période d'affichage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <label className="text-sm font-medium whitespace-nowrap">Type :</label>
              <Select value={periodType} onValueChange={(value) => setPeriodType(value as PeriodType)}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Hebdomadaire</SelectItem>
                  <SelectItem value="monthly">Mensuel</SelectItem>
                  <SelectItem value="yearly">Annuel</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <label className="text-sm font-medium whitespace-nowrap">Année :</label>
              <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                <SelectTrigger className="w-full sm:w-[100px]">
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

            {periodType === 'weekly' && (
              <>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <label className="text-sm font-medium whitespace-nowrap">Mois :</label>
                  <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
                    <SelectTrigger className="w-full sm:w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {monthNames.map((name, index) => (
                        <SelectItem key={index + 1} value={(index + 1).toString()}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <label className="text-sm font-medium whitespace-nowrap">Semaine :</label>
                  <Select 
                    value={selectedWeek ? `${selectedWeek.year}-${selectedWeek.weekNumber}` : ''} 
                    onValueChange={(value) => {
                      const week = availableWeeks.find(w => `${w.year}-${w.weekNumber}` === value);
                      if (week) setSelectedWeek(week);
                    }}
                    disabled={availableWeeks.length === 0}
                  >
                    <SelectTrigger className="w-full sm:w-[220px]">
                      <SelectValue placeholder="Sélectionner une semaine" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableWeeks.map((week) => (
                        <SelectItem key={`${week.year}-${week.weekNumber}`} value={`${week.year}-${week.weekNumber}`}>
                          {week.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="w-full sm:w-auto sm:ml-auto">
              <p className="text-xs sm:text-sm text-muted-foreground">
                Affichage : <strong>{getPeriodLabel()}</strong>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-3 sm:gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs sm:text-sm font-medium text-blue-900 dark:text-blue-100">
              Heures normales
            </CardTitle>
            <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl md:text-3xl font-bold text-blue-900 dark:text-blue-100">
              {stats.totalHeuresNormales}h
            </div>
            <p className="text-[10px] sm:text-xs text-blue-700 dark:text-blue-300 mt-1 truncate">{getPeriodLabel()}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 border-amber-200 dark:border-amber-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs sm:text-sm font-medium text-amber-900 dark:text-amber-100">
              Heures astreinte
            </CardTitle>
            <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl md:text-3xl font-bold text-amber-900 dark:text-amber-100">
              {stats.totalHeuresAstreinte}h
            </div>
            <p className="text-[10px] sm:text-xs text-amber-700 dark:text-amber-300 mt-1 truncate">Calculées précisément</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-950 dark:to-rose-900 border-rose-200 dark:border-rose-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs sm:text-sm font-medium text-rose-900 dark:text-rose-100">
              Heures repas
            </CardTitle>
            <Utensils className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600 dark:text-rose-400 flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl md:text-3xl font-bold text-rose-900 dark:text-rose-100">
              {stats.totalHeuresRepas}h
            </div>
            <p className="text-[10px] sm:text-xs text-rose-700 dark:text-rose-300 mt-1 truncate">Exclues du travail</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-950 dark:to-cyan-900 border-cyan-200 dark:border-cyan-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs sm:text-sm font-medium text-cyan-900 dark:text-cyan-100">
              Heures trajet
            </CardTitle>
            <Car className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl md:text-3xl font-bold text-cyan-900 dark:text-cyan-100">
              {stats.totalHeuresTrajet}h
            </div>
            <p className="text-[10px] sm:text-xs text-cyan-700 dark:text-cyan-300 mt-1 truncate">{getPeriodLabel()}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs sm:text-sm font-medium text-green-900 dark:text-green-100">
              Jours travaillés
            </CardTitle>
            <Briefcase className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl md:text-3xl font-bold text-green-900 dark:text-green-100">
              {stats.workDays}
            </div>
            <p className="text-[10px] sm:text-xs text-green-700 dark:text-green-300 mt-1 truncate">Incl. astreintes semaine</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs sm:text-sm font-medium text-purple-900 dark:text-purple-100">
              Jours de congé
            </CardTitle>
            <Umbrella className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 dark:text-purple-400 flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl md:text-3xl font-bold text-purple-900 dark:text-purple-100">
              {vacationDaysCount}
            </div>
            <p className="text-[10px] sm:text-xs text-purple-700 dark:text-purple-300 mt-1 truncate">Total annuel</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-950 dark:to-indigo-900 border-indigo-200 dark:border-indigo-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs sm:text-sm font-medium text-indigo-900 dark:text-indigo-100">
              Congés période
            </CardTitle>
            <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl md:text-3xl font-bold text-indigo-900 dark:text-indigo-100">
              {stats.congeDays}
            </div>
            <p className="text-[10px] sm:text-xs text-indigo-700 dark:text-indigo-300 mt-1 truncate">{getPeriodLabel()}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs sm:text-sm font-medium text-orange-900 dark:text-orange-100">
              Jours astreinte
            </CardTitle>
            <Coffee className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600 dark:text-orange-400 flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl md:text-3xl font-bold text-orange-900 dark:text-orange-100">
              {onCallDaysCount}
            </div>
            <p className="text-[10px] sm:text-xs text-orange-700 dark:text-orange-300 mt-1 truncate">Total annuel</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Répartition des heures</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full overflow-x-auto">
              <div className="min-w-[300px]">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats.chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="normales" fill="oklch(0.646 0.222 41.116)" name="Heures normales" />
                    <Bar dataKey="astreinte" fill="oklch(0.769 0.188 70.08)" name="Heures astreinte" />
                    <Bar dataKey="repas" fill="oklch(0.6 0.118 184.704)" name="Heures repas" />
                    <Bar dataKey="trajet" fill="oklch(0.7 0.15 220)" name="Heures trajet" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Répartition des jours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full overflow-x-auto">
              <div className="min-w-[300px]">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={stats.pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {stats.pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {stats.hoursDistribution.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Distribution des heures</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full overflow-x-auto">
              <div className="min-w-[300px]">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={stats.hoursDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${Math.round(value * 10) / 10}h`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {stats.hoursDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `${Math.round(value * 10) / 10}h`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
