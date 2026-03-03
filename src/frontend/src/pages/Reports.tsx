import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  Loader2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useGetPdfReportData, useGetTimeEntries } from "../hooks/useQueries";
import {
  computeAstreinteHours,
  computeInterventionHours,
  computeNormalHours,
  formatInterventionRange,
  formatMinutes,
} from "../utils/timeFormatting";
import {
  type WeekOption,
  getISOWeekNumber,
  getWeeksForMonth,
  isDateInWeek,
} from "../utils/weekOptions";

type PeriodType = "weekly" | "monthly";

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

export default function Reports() {
  const { identity } = useInternetIdentity();
  const { data: allEntries = [], isLoading } = useGetTimeEntries();
  const { mutateAsync: generatePdf, isPending: isPdfLoading } =
    useGetPdfReportData();

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  const [periodType, setPeriodType] = useState<PeriodType>("monthly");
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

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
    return userEntries
      .filter((entry) => {
        const date = new Date(Number(entry.date) / 1_000_000);
        const entryYear = date.getFullYear();
        if (periodType === "monthly") {
          return (
            entryYear === selectedYear && date.getMonth() === selectedMonth
          );
        }
        const week: WeekOption | undefined = weeksForMonth[safeWeekIndex];
        if (!week) return false;
        return isDateInWeek(entry.date, week.startDate, week.endDate);
      })
      .sort((a, b) => Number(a.date) - Number(b.date));
  }, [
    userEntries,
    periodType,
    selectedYear,
    selectedMonth,
    safeWeekIndex,
    weeksForMonth,
  ]);

  const totals = useMemo(() => {
    let totalNormal = 0;
    let totalAstreinte = 0;
    let totalRepas = 0;
    let totalTrajet = 0;
    let totalIntervention = 0;

    for (const entry of filteredEntries) {
      totalNormal += computeNormalHours(entry);
      totalAstreinte += computeAstreinteHours(entry);
      totalRepas += Number(entry.heuresRepas);
      totalTrajet += Number(entry.heuresTrajet);
      totalIntervention += computeInterventionHours(entry.interventionSlots);
    }

    return {
      totalNormal,
      totalAstreinte,
      totalRepas,
      totalTrajet,
      totalIntervention,
    };
  }, [filteredEntries]);

  const handleExportCsv = () => {
    const headers = [
      "Date",
      "Type",
      "Heures normales",
      "Astreinte",
      "Interventions",
      "Repas",
      "Trajet",
      "Description",
    ];
    const rows = filteredEntries.map((entry) => {
      const date = new Date(Number(entry.date) / 1_000_000);
      const dateStr = date.toLocaleDateString("fr-FR");
      const typeMap: Record<string, string> = {
        work: "Travail",
        conge: "Congé",
        astreinte: "Astreinte",
      };
      return [
        dateStr,
        typeMap[entry.typeOfDay] ?? entry.typeOfDay,
        formatMinutes(computeNormalHours(entry)),
        formatMinutes(computeAstreinteHours(entry)),
        formatMinutes(computeInterventionHours(entry.interventionSlots)),
        formatMinutes(Number(entry.heuresRepas)),
        formatMinutes(Number(entry.heuresTrajet)),
        `"${entry.description.replace(/"/g, '""')}"`,
      ].join(",");
    });
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rapport_${periodType === "monthly" ? `${selectedMonth + 1}_${selectedYear}` : `sem${safeWeekIndex + 1}_${selectedYear}`}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = async () => {
    if (!identity) return;
    const principal = identity.getPrincipal();
    try {
      if (periodType === "monthly") {
        await generatePdf({
          typePeriode: {
            __kind__: "mois",
            mois: [BigInt(selectedMonth + 1), BigInt(selectedYear)],
          },
          user: principal,
        });
      } else {
        const week: WeekOption | undefined = weeksForMonth[safeWeekIndex];
        if (!week) return;
        const weekNum = getISOWeekNumber(week.startDate);
        await generatePdf({
          typePeriode: {
            __kind__: "semaine",
            semaine: [BigInt(weekNum), BigInt(selectedYear)],
          },
          user: principal,
        });
      }
    } catch (e) {
      console.error("PDF generation error:", e);
    }
  };

  const formatDate = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) / 1_000_000);
    return date.toLocaleDateString("fr-FR", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  };

  const typeLabel: Record<string, string> = {
    work: "Travail",
    conge: "Congé",
    astreinte: "Astreinte",
  };

  // Color-coded badges per type
  const typeBadgeClass: Record<string, string> = {
    work: "bg-blue-100 text-blue-700",
    conge: "bg-emerald-100 text-emerald-700",
    astreinte: "bg-orange-100 text-orange-700",
  };

  const typeDotClass: Record<string, string> = {
    work: "bg-blue-600",
    conge: "bg-emerald-600",
    astreinte: "bg-orange-500",
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
      {/* Controls */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex rounded-lg overflow-hidden border border-border">
          {(["monthly", "weekly"] as PeriodType[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriodType(p)}
              data-ocid={`reports.${p}_period.tab`}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                periodType === p
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:bg-muted"
              }`}
            >
              {p === "monthly" ? "Mensuel" : "Hebdomadaire"}
            </button>
          ))}
        </div>

        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="px-3 py-1.5 text-sm rounded-lg border border-border bg-card text-foreground"
          data-ocid="reports.year.select"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>

        <select
          value={selectedMonth}
          onChange={(e) => {
            setSelectedMonth(Number(e.target.value));
            setSelectedWeekIndex(0);
          }}
          className="px-3 py-1.5 text-sm rounded-lg border border-border bg-card text-foreground"
          data-ocid="reports.month.select"
        >
          {MONTHS.map((m) => (
            <option key={m} value={MONTHS.indexOf(m)}>
              {m}
            </option>
          ))}
        </select>

        {periodType === "weekly" && weeksForMonth.length > 0 && (
          <select
            value={safeWeekIndex}
            onChange={(e) => setSelectedWeekIndex(Number(e.target.value))}
            className="px-3 py-1.5 text-sm rounded-lg border border-border bg-card text-foreground"
            data-ocid="reports.week.select"
          >
            {weeksForMonth.map((week) => (
              <option key={week.label} value={weeksForMonth.indexOf(week)}>
                {week.label}
              </option>
            ))}
          </select>
        )}

        <div className="flex gap-2 ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={filteredEntries.length === 0}
            data-ocid="reports.export_csv.button"
          >
            <Download className="w-4 h-4 mr-1" />
            CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPdf}
            disabled={filteredEntries.length === 0 || isPdfLoading || !identity}
            data-ocid="reports.export_pdf.button"
          >
            {isPdfLoading ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <FileText className="w-4 h-4 mr-1" />
            )}
            PDF
          </Button>
        </div>
      </div>

      {/* Totals summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          {
            label: "Heures travail",
            value: formatMinutes(totals.totalNormal),
            colorClass: "text-blue-600",
          },
          {
            label: "Astreinte",
            value: formatMinutes(totals.totalAstreinte),
            colorClass: "text-orange-500",
          },
          {
            label: "Interventions",
            value: formatMinutes(totals.totalIntervention),
            colorClass: "text-foreground",
          },
          {
            label: "Repas",
            value: formatMinutes(totals.totalRepas),
            colorClass: "text-slate-500",
          },
          {
            label: "Trajet",
            value: formatMinutes(totals.totalTrajet),
            colorClass: "text-slate-400",
          },
        ].map((item) => (
          <div
            key={item.label}
            className="bg-card rounded-xl border border-border p-3 text-center"
          >
            <p className={`text-xl font-bold ${item.colorClass}`}>
              {item.value}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Entries table */}
      {filteredEntries.length === 0 ? (
        <div
          className="text-center py-12 text-muted-foreground"
          data-ocid="reports.entries.empty_state"
        >
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Aucune entrée pour cette période</p>
        </div>
      ) : (
        <div
          className="bg-card rounded-xl border border-border overflow-hidden"
          data-ocid="reports.entries.table"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    Date
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    Type
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                    Normal
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                    Astreinte
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                    Repas
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                    Trajet
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                    Interv.
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry) => {
                  const normal = computeNormalHours(entry);
                  const astreinte = computeAstreinteHours(entry);
                  const intervention = computeInterventionHours(
                    entry.interventionSlots,
                  );
                  const isExpanded = expandedRow === entry.id;
                  const hasDetails =
                    entry.interventionSlots.length > 0 || !!entry.description;

                  return (
                    <>
                      <tr
                        key={entry.id}
                        className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() =>
                          setExpandedRow(isExpanded ? null : entry.id)
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter")
                            setExpandedRow(isExpanded ? null : entry.id);
                        }}
                        data-ocid="reports.entry.row"
                      >
                        <td className="px-4 py-3 font-medium text-foreground">
                          {formatDate(entry.date)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${typeBadgeClass[entry.typeOfDay] ?? ""}`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${typeDotClass[entry.typeOfDay] ?? "bg-muted"}`}
                            />
                            {typeLabel[entry.typeOfDay] ?? entry.typeOfDay}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-blue-600 font-medium">
                          {formatMinutes(normal)}
                        </td>
                        <td className="px-4 py-3 text-right text-orange-500 font-medium">
                          {formatMinutes(astreinte)}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-500">
                          {formatMinutes(Number(entry.heuresRepas))}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-400">
                          {formatMinutes(Number(entry.heuresTrajet))}
                        </td>
                        <td className="px-4 py-3 text-right text-foreground">
                          {formatMinutes(intervention)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {hasDetails &&
                            (isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            ))}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${entry.id}-detail`} className="bg-muted/20">
                          <td colSpan={8} className="px-4 py-3">
                            {entry.description && (
                              <p className="text-sm text-muted-foreground mb-2 italic">
                                "{entry.description}"
                              </p>
                            )}
                            {entry.interventionSlots.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-foreground mb-1">
                                  Interventions :
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {entry.interventionSlots.map((slot) => {
                                    const slotMin =
                                      Number(slot.endHour) * 60 +
                                      Number(slot.endMinute) -
                                      (Number(slot.startHour) * 60 +
                                        Number(slot.startMinute));
                                    const slotKey = `${slot.startHour}-${slot.startMinute}-${slot.endHour}-${slot.endMinute}`;
                                    return (
                                      <span
                                        key={slotKey}
                                        className="text-xs bg-orange-50 border border-orange-200 rounded px-2 py-1 text-orange-700"
                                      >
                                        {formatInterventionRange(
                                          slot.startHour,
                                          slot.startMinute,
                                          slot.endHour,
                                          slot.endMinute,
                                        )}{" "}
                                        ({formatMinutes(slotMin)})
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                            {entry.startAstreinte != null &&
                              entry.endAstreinte != null && (
                                <p className="text-xs text-orange-600 mt-1">
                                  Astreinte :{" "}
                                  {formatMinutes(Number(entry.startAstreinte))}{" "}
                                  → {formatMinutes(Number(entry.endAstreinte))}
                                </p>
                              )}
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/50 font-semibold">
                  <td className="px-4 py-3 text-foreground" colSpan={2}>
                    Total
                  </td>
                  <td className="px-4 py-3 text-right text-blue-600">
                    {formatMinutes(totals.totalNormal)}
                  </td>
                  <td className="px-4 py-3 text-right text-orange-500">
                    {formatMinutes(totals.totalAstreinte)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-500">
                    {formatMinutes(totals.totalRepas)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-400">
                    {formatMinutes(totals.totalTrajet)}
                  </td>
                  <td className="px-4 py-3 text-right text-foreground">
                    {formatMinutes(totals.totalIntervention)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
