import {
  AlertCircle,
  Calendar,
  Car,
  Clock,
  Coffee,
  TrendingUp,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useGetTimeEntries } from "../hooks/useQueries";
import {
  computeAstreinteHours,
  computeInterventionHours,
  computeNormalHours,
  formatMinutes,
} from "../utils/timeFormatting";
import {
  type WeekOption,
  getWeeksForMonth,
  isDateInWeek,
} from "../utils/weekOptions";

type PeriodType = "weekly" | "monthly" | "yearly";

const MONTHS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

export default function Dashboard() {
  const { identity } = useInternetIdentity();
  const { data: allEntries = [], isLoading } = useGetTimeEntries();

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  const [periodType, setPeriodType] = useState<PeriodType>("weekly");
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0);

  const years = useMemo(() => {
    const y: number[] = [];
    for (let i = currentYear - 2; i <= currentYear + 1; i++) y.push(i);
    return y;
  }, [currentYear]);

  const weeksForMonth = useMemo(
    () => getWeeksForMonth(selectedYear, selectedMonth + 1),
    [selectedMonth, selectedYear],
  );

  const safeWeekIndex = Math.min(
    selectedWeekIndex,
    Math.max(0, weeksForMonth.length - 1),
  );

  const userEntries = useMemo(() => {
    if (!identity) return [];
    const principal = identity.getPrincipal().toString();
    return allEntries.filter((e) => e.user.toString() === principal);
  }, [allEntries, identity]);

  const filteredEntries = useMemo(() => {
    return userEntries.filter((entry) => {
      const date = new Date(Number(entry.date) / 1_000_000);
      const entryYear = date.getFullYear();
      if (periodType === "yearly") return entryYear === selectedYear;
      if (periodType === "monthly")
        return entryYear === selectedYear && date.getMonth() === selectedMonth;
      const week: WeekOption | undefined = weeksForMonth[safeWeekIndex];
      if (!week) return false;
      return isDateInWeek(entry.date, week.startDate, week.endDate);
    });
  }, [
    userEntries,
    periodType,
    selectedYear,
    selectedMonth,
    safeWeekIndex,
    weeksForMonth,
  ]);

  const stats = useMemo(() => {
    let totalNormal = 0;
    let totalAstreinte = 0;
    let totalRepas = 0;
    let totalTrajet = 0;
    let workDays = 0;
    let congeDays = 0;
    let astreinteDays = 0;

    for (const entry of filteredEntries) {
      totalNormal += computeNormalHours(entry);
      totalAstreinte += computeAstreinteHours(entry);
      totalRepas += Number(entry.heuresRepas);
      totalTrajet += Number(entry.heuresTrajet);

      const date = new Date(Number(entry.date) / 1_000_000);
      const dayOfWeek = date.getDay();
      const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;

      if (entry.typeOfDay === "work") workDays++;
      else if (entry.typeOfDay === "conge") congeDays++;
      else if (entry.typeOfDay === "astreinte") {
        astreinteDays++;
        if (isWeekday) workDays++;
      }
    }
    return {
      totalNormal,
      totalAstreinte,
      totalRepas,
      totalTrajet,
      workDays,
      congeDays,
      astreinteDays,
    };
  }, [filteredEntries]);

  const barChartData = useMemo(() => {
    return filteredEntries.map((entry) => {
      const date = new Date(Number(entry.date) / 1_000_000);
      const label = `${date.getDate()}/${date.getMonth() + 1}`;
      return {
        date: label,
        normal: computeNormalHours(entry),
        astreinte: computeAstreinteHours(entry),
        repas: Number(entry.heuresRepas),
        trajet: Number(entry.heuresTrajet),
        intervention: computeInterventionHours(entry.interventionSlots),
      };
    });
  }, [filteredEntries]);

  const monthlyBarData = useMemo(() => {
    if (periodType !== "yearly") return [];
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
      return { month: month.substring(0, 3), normal, astreinte };
    });
  }, [periodType, userEntries, selectedYear]);

  const pieData = useMemo(() => {
    return [
      { name: "Travail", value: stats.totalNormal, color: "#1e3a8a" },
      { name: "Astreinte", value: stats.totalAstreinte, color: "#ea580c" },
      { name: "Repas", value: stats.totalRepas, color: "#64748b" },
      { name: "Trajet", value: stats.totalTrajet, color: "#94a3b8" },
    ].filter((d) => d.value > 0);
  }, [stats]);

  const statCards = [
    {
      label: "Heures travail",
      value: formatMinutes(stats.totalNormal),
      icon: Clock,
      colorClass: "text-blue-700",
      bgClass: "bg-blue-50 border-blue-200",
    },
    {
      label: "Astreinte",
      value: formatMinutes(stats.totalAstreinte),
      icon: AlertCircle,
      colorClass: "text-orange-600",
      bgClass: "bg-orange-50 border-orange-200",
    },
    {
      label: "Repas",
      value: formatMinutes(stats.totalRepas),
      icon: Coffee,
      colorClass: "text-slate-500",
      bgClass: "bg-slate-50 border-slate-200",
    },
    {
      label: "Trajet",
      value: formatMinutes(stats.totalTrajet),
      icon: Car,
      colorClass: "text-slate-400",
      bgClass: "bg-slate-50 border-slate-100",
    },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-sm">
          <p className="font-semibold text-foreground mb-1">{label}</p>
          {payload.map((p: any) => (
            <p key={p.name} style={{ color: p.color }}>
              {p.name}: {formatMinutes(p.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Get display name for greeting

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div
          className="animate-spin rounded-full h-8 w-8 border-b-2"
          style={{ borderColor: "oklch(var(--vts-orange))" }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-6">
      {/* ── Greeting banner (Dashboard only) ── */}
      <div
        className="rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm"
        style={{
          background:
            "linear-gradient(135deg, oklch(var(--navy-dark)) 0%, oklch(var(--navy)) 100%)",
          borderLeft: "4px solid oklch(var(--vts-green))",
        }}
      >
        <span className="text-2xl">🐄</span>
        <div>
          <p className="text-white font-extrabold text-base leading-tight">
            Vial Traite Service
          </p>
          <p className="text-white/60 text-xs mt-0.5">
            Tableau de bord — Gestion du temps
          </p>
        </div>
      </div>

      {/* ── Period selector ── */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex rounded-lg overflow-hidden border border-border">
          {(["weekly", "monthly", "yearly"] as PeriodType[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriodType(p)}
              className="px-3 py-1.5 text-sm font-semibold transition-colors"
              style={{
                backgroundColor:
                  periodType === p
                    ? "oklch(var(--vts-orange))"
                    : "oklch(var(--card))",
                color:
                  periodType === p ? "white" : "oklch(var(--muted-foreground))",
              }}
            >
              {p === "weekly" ? "Semaine" : p === "monthly" ? "Mois" : "Année"}
            </button>
          ))}
        </div>

        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="px-3 py-1.5 text-sm rounded-lg border border-border bg-card text-foreground"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>

        {(periodType === "monthly" || periodType === "weekly") && (
          <select
            value={selectedMonth}
            onChange={(e) => {
              setSelectedMonth(Number(e.target.value));
              setSelectedWeekIndex(0);
            }}
            className="px-3 py-1.5 text-sm rounded-lg border border-border bg-card text-foreground"
          >
            {MONTHS.map((m) => (
              <option key={m} value={MONTHS.indexOf(m)}>
                {m}
              </option>
            ))}
          </select>
        )}

        {periodType === "weekly" && weeksForMonth.length > 0 && (
          <select
            value={safeWeekIndex}
            onChange={(e) => setSelectedWeekIndex(Number(e.target.value))}
            className="px-3 py-1.5 text-sm rounded-lg border border-border bg-card text-foreground"
          >
            {weeksForMonth.map((week) => (
              <option key={week.label} value={weeksForMonth.indexOf(week)}>
                {week.label}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className={`rounded-xl border p-4 flex flex-col gap-2 bg-card ${card.bgClass}`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${card.bgClass}`}
            >
              <card.icon className={`w-4 h-4 ${card.colorClass}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{card.value}</p>
              <p className="text-xs text-muted-foreground">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Day type summary ── */}
      <div
        className="bg-card rounded-xl border border-border p-4"
        style={{ borderLeft: "3px solid oklch(var(--vts-green))" }}
      >
        <h3
          className="text-sm font-semibold mb-3 flex items-center gap-2"
          style={{ color: "oklch(var(--navy))" }}
        >
          <Calendar
            className="w-4 h-4"
            style={{ color: "oklch(var(--vts-orange))" }}
          />
          Répartition des journées
        </h3>
        <div className="flex gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-700 inline-block" />
            <span className="text-sm text-foreground">
              {stats.workDays} jour{stats.workDays !== 1 ? "s" : ""} travail
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-orange-500 inline-block" />
            <span className="text-sm text-foreground">
              {stats.astreinteDays} jour{stats.astreinteDays !== 1 ? "s" : ""}{" "}
              astreinte
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-600 inline-block" />
            <span className="text-sm text-foreground">
              {stats.congeDays} jour{stats.congeDays !== 1 ? "s" : ""} congé
            </span>
          </div>
        </div>
      </div>

      {/* ── Bar chart — daily ── */}
      {periodType !== "yearly" && barChartData.length > 0 && (
        <div
          className="bg-card rounded-xl border border-border p-4"
          style={{ borderLeft: "3px solid oklch(var(--vts-green))" }}
        >
          <h3
            className="text-sm font-semibold mb-4 flex items-center gap-2"
            style={{ color: "oklch(var(--navy))" }}
          >
            <TrendingUp
              className="w-4 h-4"
              style={{ color: "oklch(var(--vts-orange))" }}
            />
            Heures par jour
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={barChartData}
              margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="oklch(0.92 0.02 250)"
              />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => formatMinutes(v)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar
                dataKey="normal"
                name="Travail"
                fill="#1e3a8a"
                radius={[3, 3, 0, 0]}
              />
              <Bar
                dataKey="astreinte"
                name="Astreinte"
                fill="#ea580c"
                radius={[3, 3, 0, 0]}
              />
              <Bar
                dataKey="repas"
                name="Repas"
                fill="#64748b"
                radius={[3, 3, 0, 0]}
              />
              <Bar
                dataKey="trajet"
                name="Trajet"
                fill="#94a3b8"
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Monthly bar chart for yearly view ── */}
      {periodType === "yearly" && (
        <div
          className="bg-card rounded-xl border border-border p-4"
          style={{ borderLeft: "3px solid oklch(var(--vts-green))" }}
        >
          <h3
            className="text-sm font-semibold mb-4 flex items-center gap-2"
            style={{ color: "oklch(var(--navy))" }}
          >
            <TrendingUp
              className="w-4 h-4"
              style={{ color: "oklch(var(--vts-orange))" }}
            />
            Heures par mois — {selectedYear}
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={monthlyBarData}
              margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="oklch(0.92 0.02 250)"
              />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => formatMinutes(v)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar
                dataKey="normal"
                name="Travail"
                fill="#1e3a8a"
                radius={[3, 3, 0, 0]}
              />
              <Bar
                dataKey="astreinte"
                name="Astreinte"
                fill="#ea580c"
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Pie chart ── */}
      {pieData.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-4">
          <h3
            className="text-sm font-semibold mb-4"
            style={{ color: "oklch(var(--navy))" }}
          >
            Répartition des heures
          </h3>
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
                {pieData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatMinutes(value)} />
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
