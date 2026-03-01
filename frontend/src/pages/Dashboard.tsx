import { useState, useMemo } from 'react';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useGetTimeEntries } from '../hooks/useQueries';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { TrendingUp, Clock, Coffee, Car, AlertCircle, Calendar } from 'lucide-react';
import {
  formatHours,
  computeNormalHours,
  computeAstreinteHours,
  computeInterventionHours,
} from '../utils/timeFormatting';
import { getWeeksForMonth, isDateInWeek, type WeekOption } from '../utils/weekOptions';

type PeriodType = 'weekly' | 'monthly' | 'yearly';

const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

export default function Dashboard() {
  const { identity } = useInternetIdentity();
  const { data: allEntries = [], isLoading } = useGetTimeEntries();

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth(); // 0-indexed

  const [periodType, setPeriodType] = useState<PeriodType>('weekly');
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth); // 0-indexed
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0);

  const years = useMemo(() => {
    const y: number[] = [];
    for (let i = currentYear - 2; i <= currentYear + 1; i++) y.push(i);
    return y;
  }, [currentYear]);

  // getWeeksForMonth expects (year, month) where month is 1-indexed
  const weeksForMonth = useMemo(
    () => getWeeksForMonth(selectedYear, selectedMonth + 1),
    [selectedMonth, selectedYear]
  );

  // Clamp selectedWeekIndex when month/year changes
  const safeWeekIndex = Math.min(selectedWeekIndex, Math.max(0, weeksForMonth.length - 1));

  const userEntries = useMemo(() => {
    if (!identity) return [];
    const principal = identity.getPrincipal().toString();
    return allEntries.filter((e) => e.user.toString() === principal);
  }, [allEntries, identity]);

  const filteredEntries = useMemo(() => {
    return userEntries.filter((entry) => {
      const date = new Date(Number(entry.date) / 1_000_000);
      const entryYear = date.getFullYear();

      if (periodType === 'yearly') {
        return entryYear === selectedYear;
      } else if (periodType === 'monthly') {
        return entryYear === selectedYear && date.getMonth() === selectedMonth;
      } else {
        // weekly — use WeekOption.startDate / endDate
        const week: WeekOption | undefined = weeksForMonth[safeWeekIndex];
        if (!week) return false;
        return isDateInWeek(entry.date, week.startDate, week.endDate);
      }
    });
  }, [userEntries, periodType, selectedYear, selectedMonth, safeWeekIndex, weeksForMonth]);

  // Aggregate stats
  const stats = useMemo(() => {
    let totalNormal = 0;
    let totalAstreinte = 0;
    let totalRepas = 0;
    let totalTrajet = 0;
    let totalIntervention = 0;
    let workDays = 0;
    let congeDays = 0;
    let astreinteDays = 0;

    for (const entry of filteredEntries) {
      const normal = computeNormalHours(entry);
      const astreinte = computeAstreinteHours(entry);
      const intervention = computeInterventionHours(entry.interventionSlots);

      totalNormal += normal;
      totalAstreinte += astreinte;
      totalRepas += Number(entry.heuresRepas);
      totalTrajet += Number(entry.heuresTrajet);
      totalIntervention += intervention;

      if (entry.typeOfDay === 'work') workDays++;
      else if (entry.typeOfDay === 'conge') congeDays++;
      else if (entry.typeOfDay === 'astreinte') astreinteDays++;
    }

    return {
      totalNormal,
      totalAstreinte,
      totalRepas,
      totalTrajet,
      totalIntervention,
      workDays,
      congeDays,
      astreinteDays,
    };
  }, [filteredEntries]);

  // Chart data for bar chart (per day)
  const barChartData = useMemo(() => {
    return filteredEntries.map((entry) => {
      const date = new Date(Number(entry.date) / 1_000_000);
      const label = `${date.getDate()}/${date.getMonth() + 1}`;
      const normal = computeNormalHours(entry);
      const astreinte = computeAstreinteHours(entry);
      const intervention = computeInterventionHours(entry.interventionSlots);
      return {
        date: label,
        normal: parseFloat(normal.toFixed(2)),
        astreinte: parseFloat(astreinte.toFixed(2)),
        repas: Number(entry.heuresRepas),
        trajet: Number(entry.heuresTrajet),
        intervention: parseFloat(intervention.toFixed(2)),
      };
    });
  }, [filteredEntries]);

  // Monthly bar chart for yearly view
  const monthlyBarData = useMemo(() => {
    if (periodType !== 'yearly') return [];
    return MONTHS.map((month, idx) => {
      const monthEntries = userEntries.filter((entry) => {
        const date = new Date(Number(entry.date) / 1_000_000);
        return date.getFullYear() === selectedYear && date.getMonth() === idx;
      });
      let normal = 0;
      let astreinte = 0;
      for (const entry of monthEntries) {
        normal += computeNormalHours(entry);
        astreinte += computeAstreinteHours(entry);
      }
      return {
        month: month.substring(0, 3),
        normal: parseFloat(normal.toFixed(2)),
        astreinte: parseFloat(astreinte.toFixed(2)),
      };
    });
  }, [periodType, userEntries, selectedYear]);

  // Pie chart data
  const pieData = useMemo(() => {
    return [
      { name: 'Travail normal', value: parseFloat(stats.totalNormal.toFixed(2)), color: 'oklch(0.646 0.222 41.116)' },
      { name: 'Astreinte', value: parseFloat(stats.totalAstreinte.toFixed(2)), color: 'oklch(0.769 0.188 70.08)' },
      { name: 'Repas', value: parseFloat(stats.totalRepas.toFixed(2)), color: 'oklch(0.6 0.118 184.704)' },
      { name: 'Trajet', value: parseFloat(stats.totalTrajet.toFixed(2)), color: 'oklch(0.55 0.05 240)' },
    ].filter((d) => d.value > 0);
  }, [stats]);

  const statCards = [
    {
      label: 'Heures normales',
      value: formatHours(stats.totalNormal),
      icon: Clock,
      colorClass: 'text-primary',
      bgClass: 'bg-primary/10',
    },
    {
      label: 'Astreinte',
      value: formatHours(stats.totalAstreinte),
      icon: AlertCircle,
      colorClass: 'text-accent',
      bgClass: 'bg-accent/10',
    },
    {
      label: 'Repas',
      value: formatHours(stats.totalRepas),
      icon: Coffee,
      colorClass: 'text-secondary-foreground',
      bgClass: 'bg-secondary/10',
    },
    {
      label: 'Trajet',
      value: formatHours(stats.totalTrajet),
      icon: Car,
      colorClass: 'text-muted-foreground',
      bgClass: 'bg-muted',
    },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-sm">
          <p className="font-semibold text-foreground mb-1">{label}</p>
          {payload.map((p: any) => (
            <p key={p.name} style={{ color: p.color }}>
              {p.name}: {formatHours(p.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      {/* Period selector */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex rounded-lg overflow-hidden border border-border">
          {(['weekly', 'monthly', 'yearly'] as PeriodType[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriodType(p)}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                periodType === p
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card text-muted-foreground hover:bg-muted'
              }`}
            >
              {p === 'weekly' ? 'Semaine' : p === 'monthly' ? 'Mois' : 'Année'}
            </button>
          ))}
        </div>

        {/* Year selector */}
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="px-3 py-1.5 text-sm rounded-lg border border-border bg-card text-foreground"
        >
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        {/* Month selector (weekly + monthly) */}
        {(periodType === 'monthly' || periodType === 'weekly') && (
          <select
            value={selectedMonth}
            onChange={(e) => {
              setSelectedMonth(Number(e.target.value));
              setSelectedWeekIndex(0);
            }}
            className="px-3 py-1.5 text-sm rounded-lg border border-border bg-card text-foreground"
          >
            {MONTHS.map((m, i) => (
              <option key={i} value={i}>{m}</option>
            ))}
          </select>
        )}

        {/* Week selector */}
        {periodType === 'weekly' && weeksForMonth.length > 0 && (
          <select
            value={safeWeekIndex}
            onChange={(e) => setSelectedWeekIndex(Number(e.target.value))}
            className="px-3 py-1.5 text-sm rounded-lg border border-border bg-card text-foreground"
          >
            {weeksForMonth.map((week, i) => (
              <option key={i} value={i}>{week.label}</option>
            ))}
          </select>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statCards.map((card) => (
          <div key={card.label} className="bg-card rounded-xl border border-border p-4 flex flex-col gap-2">
            <div className={`w-8 h-8 rounded-lg ${card.bgClass} flex items-center justify-center`}>
              <card.icon className={`w-4 h-4 ${card.colorClass}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{card.value}</p>
              <p className="text-xs text-muted-foreground">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Day type summary */}
      <div className="bg-card rounded-xl border border-border p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          Répartition des journées
        </h3>
        <div className="flex gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-primary inline-block" />
            <span className="text-sm text-foreground">{stats.workDays} jour{stats.workDays !== 1 ? 's' : ''} travail</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-accent inline-block" />
            <span className="text-sm text-foreground">{stats.astreinteDays} jour{stats.astreinteDays !== 1 ? 's' : ''} astreinte</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-secondary inline-block" />
            <span className="text-sm text-foreground">{stats.congeDays} jour{stats.congeDays !== 1 ? 's' : ''} congé</span>
          </div>
        </div>
      </div>

      {/* Bar chart — daily breakdown */}
      {periodType !== 'yearly' && barChartData.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-4">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Heures par jour
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barChartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0 0)" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatHours(v)} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="normal" name="Normal" fill="oklch(0.646 0.222 41.116)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="astreinte" name="Astreinte" fill="oklch(0.769 0.188 70.08)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="repas" name="Repas" fill="oklch(0.6 0.118 184.704)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="trajet" name="Trajet" fill="oklch(0.55 0.05 240)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Monthly bar chart for yearly view */}
      {periodType === 'yearly' && (
        <div className="bg-card rounded-xl border border-border p-4">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Heures par mois — {selectedYear}
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyBarData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0 0)" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatHours(v)} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="normal" name="Normal" fill="oklch(0.646 0.222 41.116)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="astreinte" name="Astreinte" fill="oklch(0.769 0.188 70.08)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Pie chart */}
      {pieData.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-4">
          <h3 className="text-sm font-semibold text-foreground mb-4">Répartition des heures</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatHours(value)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {filteredEntries.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Aucune entrée pour cette période</p>
        </div>
      )}
    </div>
  );
}
