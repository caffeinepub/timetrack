import {
  AlertCircle,
  Calendar,
  Car,
  Clock,
  Coffee,
  FileText,
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

export default function Dashboard({
  readOnly = false,
}: { readOnly?: boolean }) {
  const { identity } = useInternetIdentity();
  const { data: allEntries = [], isLoading } = useGetTimeEntries();

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  const [periodType, setPeriodType] = useState<PeriodType>("weekly");
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  // Compute initial week index matching today's date
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(() => {
    const todayWeeks = getWeeksForMonth(
      new Date().getFullYear(),
      new Date().getMonth() + 1,
    );
    const todayIndex = todayWeeks.findIndex((w) =>
      isDateInWeek(BigInt(Date.now() * 1_000_000), w.startDate, w.endDate),
    );
    return todayIndex >= 0 ? todayIndex : 0;
  });

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
    let maladeDays = 0;

    for (const entry of filteredEntries) {
      const _entryDay1 = new Date(Number(entry.date) / 1_000_000).getDay();
      const _isArretMaladie =
        entry.description?.includes("[ARRET_MALADIE]") ||
        entry.typeOfDay === "arretMaladie";
      totalNormal +=
        (entry.typeOfDay === "astreinte" &&
          (_entryDay1 === 0 || _entryDay1 === 6)) ||
        _isArretMaladie
          ? 0
          : computeNormalHours(entry);
      totalAstreinte += computeAstreinteHours(entry);
      totalRepas += Number(entry.heuresRepas);
      totalTrajet += Number(entry.heuresTrajet);

      const date = new Date(Number(entry.date) / 1_000_000);
      const dayOfWeek = date.getDay();
      const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;

      if (_isArretMaladie) {
        maladeDays++;
      } else if (entry.typeOfDay === "work") workDays++;
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
      maladeDays,
    };
  }, [filteredEntries]);

  const barChartData = useMemo(() => {
    return filteredEntries.map((entry) => {
      const date = new Date(Number(entry.date) / 1_000_000);
      const label = `${date.getDate()}/${date.getMonth() + 1}`;
      return {
        date: label,
        normal: (() => {
          const _d = new Date(Number(entry.date) / 1_000_000).getDay();
          return entry.typeOfDay === "astreinte" && (_d === 0 || _d === 6)
            ? 0
            : computeNormalHours(entry);
        })(),
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
        const _mDay = new Date(Number(entry.date) / 1_000_000).getDay();
        normal +=
          entry.typeOfDay === "astreinte" && (_mDay === 0 || _mDay === 6)
            ? 0
            : computeNormalHours(entry);
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
      const readOnlyBanner = readOnly ? (
        <div
          className="mb-4 px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm font-medium"
          style={{
            backgroundColor: "rgba(59,130,246,0.12)",
            color: "#60a5fa",
            border: "1px solid rgba(59,130,246,0.25)",
          }}
        >
          <span>👁</span>
          <span>Mode lecture seule — modifications désactivées</span>
        </div>
      ) : null;

      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-sm">
          {readOnlyBanner}
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

  function getPeriodLabel(): string {
    if (periodType === "yearly") return `Année ${selectedYear}`;
    if (periodType === "monthly")
      return `${MONTHS[selectedMonth]} ${selectedYear}`;
    const week = weeksForMonth[safeWeekIndex];
    return week ? `Semaine ${week.label}` : "Semaine";
  }

  function buildDashboardPdfHtml(
    entries: typeof filteredEntries,
    label: string,
  ): string {
    const typeLabel: Record<string, string> = {
      work: "Travail",
      conge: "Congé",
      astreinte: "Astreinte",
    };
    const typeColor: Record<string, string> = {
      work: "#1d4ed8",
      conge: "#059669",
      astreinte: "#f97316",
    };
    const rows = entries
      .map((e) => {
        const date = new Date(Number(e.date) / 1_000_000).toLocaleDateString(
          "fr-FR",
          { weekday: "short", day: "numeric", month: "short" },
        );
        const type = typeLabel[e.typeOfDay] ?? e.typeOfDay;
        const color = typeColor[e.typeOfDay] ?? "#333";
        const _rDay = new Date(Number(e.date) / 1_000_000).getDay();
        const normal = formatMinutes(
          e.typeOfDay === "astreinte" && (_rDay === 0 || _rDay === 6)
            ? 0
            : computeNormalHours(e),
        );
        const astreinte = formatMinutes(computeAstreinteHours(e));
        return `<tr>
          <td style="padding:5px 8px;border:1px solid #e5e7eb">${date}</td>
          <td style="padding:5px 8px;border:1px solid #e5e7eb;color:${color};font-weight:600">${type}</td>
          <td style="padding:5px 8px;border:1px solid #e5e7eb;text-align:right;color:#1d4ed8">${normal}</td>
          <td style="padding:5px 8px;border:1px solid #e5e7eb;text-align:right;color:#f97316">${astreinte}</td>
          <td style="padding:5px 8px;border:1px solid #e5e7eb;font-size:11px;color:#666;max-width:120px">${e.description || ""}</td>
        </tr>`;
      })
      .join("");
    const table =
      entries.length === 0
        ? "<p style='color:#888;font-style:italic'>Aucune journée pour cette période.</p>"
        : `<table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead><tr style="background:#f8fafc">
            <th style="padding:6px 8px;border:1px solid #e5e7eb;text-align:left">Date</th>
            <th style="padding:6px 8px;border:1px solid #e5e7eb;text-align:left">Type</th>
            <th style="padding:6px 8px;border:1px solid #e5e7eb;text-align:right">Travail</th>
            <th style="padding:6px 8px;border:1px solid #e5e7eb;text-align:right">Astreinte</th>
            <th style="padding:6px 8px;border:1px solid #e5e7eb;text-align:left">Description</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>`;
    let totalNormal = 0;
    let totalAstreinte = 0;
    for (const e of entries) {
      const _pDay = new Date(Number(e.date) / 1_000_000).getDay();
      totalNormal +=
        e.typeOfDay === "astreinte" && (_pDay === 0 || _pDay === 6)
          ? 0
          : computeNormalHours(e);
      totalAstreinte += computeAstreinteHours(e);
    }
    const genDate = new Date().toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
      <title>Vial Traite Service — ${label}</title>
      <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:13px;color:#1a1a1a;background:#fff;padding:20px}
      .header{background:#0f1e4a;color:#fff;padding:16px 20px;border-radius:8px;margin-bottom:20px;display:flex;align-items:center;gap:16px}
      .header img{width:56px;height:56px}
      .header-text .title{font-size:20px;font-weight:800;letter-spacing:0.5px}
      .header-text .sub{font-size:12px;color:rgba(255,255,255,0.7);margin-top:2px}
      h2{font-size:14px;font-weight:600;margin:16px 0 8px;border-bottom:2px solid #e5e7eb;padding-bottom:4px}
      .summary{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px}
      .sum-card{border:1px solid #e5e7eb;border-radius:6px;padding:10px;text-align:center}
      .sum-val{font-size:18px;font-weight:700}.sum-label{font-size:10px;color:#666;margin-top:2px}
      @media print{body{padding:1cm}.no-print{display:none}}</style>
    </head><body>
      <div class="header">
        <img src="/assets/generated/vache-logo-transparent.dim_300x300.png" alt="Logo Vial Traite Service" />
        <div class="header-text">
          <div class="title">Vial Traite Service</div>
          <div class="sub">Tableau de bord — ${label}</div>
        </div>
      </div>
      <p style="font-size:11px;color:#666;margin-bottom:16px">Généré le ${genDate}</p>
      <h2>Résumé</h2>
      <div class="summary">
        <div class="sum-card"><div class="sum-val" style="color:#1d4ed8">${formatMinutes(totalNormal)}</div><div class="sum-label">Heures travail</div></div>
        <div class="sum-card"><div class="sum-val" style="color:#f97316">${formatMinutes(totalAstreinte)}</div><div class="sum-label">Astreinte</div></div>
        <div class="sum-card"><div class="sum-val">${entries.length}</div><div class="sum-label">Journées</div></div>
      </div>
      <h2>Journées (${entries.length})</h2>
      ${table}
    </body></html>`;
  }

  function handleExportPdf(scope: "week" | "month" | "year") {
    let entriesToExport = filteredEntries;
    let label = getPeriodLabel();
    if (scope === "month") {
      entriesToExport = userEntries.filter((entry) => {
        const date = new Date(Number(entry.date) / 1_000_000);
        return (
          date.getFullYear() === selectedYear &&
          date.getMonth() === selectedMonth
        );
      });
      label = `${MONTHS[selectedMonth]} ${selectedYear}`;
    } else if (scope === "year") {
      entriesToExport = userEntries.filter((entry) => {
        const date = new Date(Number(entry.date) / 1_000_000);
        return date.getFullYear() === selectedYear;
      });
      label = `Année ${selectedYear}`;
    }
    const html = buildDashboardPdfHtml(entriesToExport, label);
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) {
      alert("Popup bloqué. Veuillez autoriser les popups.");
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
  }

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

      {/* ── PDF Export buttons ── */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => handleExportPdf("week")}
          data-ocid="dashboard.pdf_week.button"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: "oklch(var(--vts-orange))" }}
        >
          <FileText className="w-3.5 h-3.5" />
          PDF Semaine
        </button>
        <button
          type="button"
          onClick={() => handleExportPdf("month")}
          data-ocid="dashboard.pdf_month.button"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: "oklch(var(--vts-orange))" }}
        >
          <FileText className="w-3.5 h-3.5" />
          PDF Mois
        </button>
        <button
          type="button"
          onClick={() => handleExportPdf("year")}
          data-ocid="dashboard.pdf_year.button"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: "oklch(var(--vts-orange))" }}
        >
          <FileText className="w-3.5 h-3.5" />
          PDF Année
        </button>
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
          {stats.maladeDays > 0 && (
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
              <span className="text-sm text-foreground">
                {stats.maladeDays} jour{stats.maladeDays !== 1 ? "s" : ""} arrêt
                maladie
              </span>
            </div>
          )}
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
