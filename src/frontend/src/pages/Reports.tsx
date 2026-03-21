import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Download,
  FileText,
  Loader2,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { InterventionAvecPieces } from "../backend.d";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useGetAllInterventions, useGetTimeEntries } from "../hooks/useQueries";
import { exportAnnualPdf } from "../utils/exportAnnualPdf";
import { exportPdf } from "../utils/exportPdf";
import {
  computeAstreinteHours,
  computeInterventionHours,
  computeNormalHours,
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

function toDateKey(nanoTs: bigint): string {
  const d = new Date(Number(nanoTs) / 1_000_000);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatHeure(h: bigint, m: bigint): string {
  const mm = String(Number(m)).padStart(2, "0");
  return `${Number(h)}h${mm}`;
}

function InterventionCard({
  intervention,
  index,
}: { intervention: InterventionAvecPieces; index: number }) {
  const date = new Date(Number(intervention.date) / 1_000_000);
  const dateStr = date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const hasSignatureClient = intervention.signatureClient.length > 0;
  const hasSignatureIntervenant = intervention.signatureIntervenant.length > 0;
  const hasPieces = intervention.pieces.length > 0;
  const hasDescription = intervention.description.trim().length > 0;

  const matinDebut = formatHeure(
    intervention.heureMatinDebutH,
    intervention.heureMatinDebutMin,
  );
  const matinFin = formatHeure(
    intervention.heureMatinFinH,
    intervention.heureMatinFinMin,
  );
  const apremDebut = formatHeure(
    intervention.heureApremDebutH,
    intervention.heureApremDebutMin,
  );
  const apremFin = formatHeure(
    intervention.heureApremFinH,
    intervention.heureApremFinMin,
  );

  const hasMatin =
    Number(intervention.heureMatinDebutH) > 0 ||
    Number(intervention.heureMatinFinH) > 0;
  const hasAprem =
    Number(intervention.heureApremDebutH) > 0 ||
    Number(intervention.heureApremFinH) > 0;

  return (
    <div
      className="bg-card border border-border rounded-xl p-3 space-y-2"
      data-ocid={`reports.intervention.item.${index}`}
    >
      {/* Header: date + signatures */}
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold text-muted-foreground capitalize">
          {dateStr}
        </p>
        <div className="flex gap-1 shrink-0">
          {hasSignatureClient && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
              ✓ Client
            </span>
          )}
          {hasSignatureIntervenant && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
              ✓ Intervenant
            </span>
          )}
        </div>
      </div>

      {/* Client */}
      <div>
        <p className="text-sm font-bold text-foreground">
          {intervention.clientNom || "—"}
        </p>
        {intervention.clientAdresse && (
          <p className="text-xs text-muted-foreground">
            {intervention.clientAdresse}
          </p>
        )}
      </div>

      {/* Hours */}
      {(hasMatin || hasAprem) && (
        <div className="flex flex-wrap gap-3">
          {hasMatin && (
            <div className="text-xs">
              <span className="text-muted-foreground">Matin : </span>
              <span className="font-medium text-foreground">
                {matinDebut} → {matinFin}
              </span>
            </div>
          )}
          {hasAprem && (
            <div className="text-xs">
              <span className="text-muted-foreground">Après-midi : </span>
              <span className="font-medium text-foreground">
                {apremDebut} → {apremFin}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Description */}
      {hasDescription && (
        <p className="text-xs text-muted-foreground italic border-l-2 border-border pl-2">
          {intervention.description}
        </p>
      )}

      {/* Pieces */}
      {hasPieces && (
        <div>
          <p className="text-xs font-semibold text-foreground mb-1">
            Pièces utilisées
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-1 pr-2 text-muted-foreground font-medium">
                    Réf.
                  </th>
                  <th className="text-left py-1 pr-2 text-muted-foreground font-medium">
                    Article
                  </th>
                  <th className="text-right py-1 text-muted-foreground font-medium">
                    Qté
                  </th>
                </tr>
              </thead>
              <tbody>
                {intervention.pieces.map((piece, i) => (
                  <tr
                    key={`${piece.reference}-${i}`}
                    className="border-b border-border/50 last:border-0"
                  >
                    <td className="py-1 pr-2 text-foreground">
                      {piece.reference}
                    </td>
                    <td className="py-1 pr-2 text-foreground">
                      {piece.article}
                    </td>
                    <td className="py-1 text-right text-foreground">
                      {Number(piece.quantite)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Reports() {
  const { identity } = useInternetIdentity();
  const { data: allEntries = [], isLoading } = useGetTimeEntries();
  const { data: allInterventions = [], isLoading: isLoadingInterventions } =
    useGetAllInterventions();

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

  const filteredInterventions = useMemo(() => {
    if (!identity) return [];
    const principal = identity.getPrincipal().toString();
    return allInterventions
      .filter((intervention) => {
        if (intervention.user.toString() !== principal) return false;
        const date = new Date(Number(intervention.date) / 1_000_000);
        const entryYear = date.getFullYear();
        if (periodType === "monthly") {
          return (
            entryYear === selectedYear && date.getMonth() === selectedMonth
          );
        }
        const week: WeekOption | undefined = weeksForMonth[safeWeekIndex];
        if (!week) return false;
        return isDateInWeek(intervention.date, week.startDate, week.endDate);
      })
      .sort((a, b) => Number(a.date) - Number(b.date));
  }, [
    allInterventions,
    identity,
    periodType,
    selectedYear,
    selectedMonth,
    safeWeekIndex,
    weeksForMonth,
  ]);

  // Build a map dateKey -> interventions[] for fast lookup in expanded rows
  const interventionsByDate = useMemo(() => {
    const map = new Map<string, InterventionAvecPieces[]>();
    for (const intervention of allInterventions) {
      const key = toDateKey(intervention.date);
      const existing = map.get(key) ?? [];
      existing.push(intervention);
      map.set(key, existing);
    }
    return map;
  }, [allInterventions]);

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

  const getPeriodTitle = () => {
    if (periodType === "monthly") {
      return `Rapport Mensuel - ${MONTHS[selectedMonth]} ${selectedYear}`;
    }
    const week = weeksForMonth[safeWeekIndex];
    return week
      ? `Rapport Hebdomadaire - ${week.label} ${selectedYear}`
      : `Rapport Hebdomadaire - ${selectedYear}`;
  };

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

    // Add interventions section
    const interventionHeaders = [
      "\n\nFICHES INTERVENTIONS",
      "Date",
      "Client",
      "Adresse",
      "Matin début",
      "Matin fin",
      "Après-midi début",
      "Après-midi fin",
      "Description",
      "Signature client",
      "Signature intervenant",
    ];
    const interventionRows = filteredInterventions.map((inv) => {
      const date = new Date(Number(inv.date) / 1_000_000).toLocaleDateString(
        "fr-FR",
      );
      return [
        date,
        `"${inv.clientNom.replace(/"/g, '""')}"`,
        `"${inv.clientAdresse.replace(/"/g, '""')}"`,
        formatHeure(inv.heureMatinDebutH, inv.heureMatinDebutMin),
        formatHeure(inv.heureMatinFinH, inv.heureMatinFinMin),
        formatHeure(inv.heureApremDebutH, inv.heureApremDebutMin),
        formatHeure(inv.heureApremFinH, inv.heureApremFinMin),
        `"${inv.description.replace(/"/g, '""')}"`,
        inv.signatureClient ? "Oui" : "Non",
        inv.signatureIntervenant ? "Oui" : "Non",
      ].join(",");
    });

    const csv = [
      headers.join(","),
      ...rows,
      interventionHeaders.join(","),
      ...interventionRows,
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rapport_${periodType === "monthly" ? `${selectedMonth + 1}_${selectedYear}` : `sem${safeWeekIndex + 1}_${selectedYear}`}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = () => {
    exportPdf(getPeriodTitle(), filteredEntries, filteredInterventions, totals);
  };

  const handleExportAnnualPdf = () => {
    if (!identity) return;
    exportAnnualPdf(
      selectedYear,
      allEntries,
      allInterventions,
      identity.getPrincipal().toString(),
    );
  };

  // Unused but kept for potential future use
  const _getISOWeekNumber = getISOWeekNumber;

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

        <div className="flex gap-2 ml-auto flex-wrap">
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
            disabled={
              filteredEntries.length === 0 && filteredInterventions.length === 0
            }
            data-ocid="reports.export_pdf.button"
          >
            <FileText className="w-4 h-4 mr-1" />
            PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportAnnualPdf}
            disabled={!identity}
            data-ocid="reports.export_annual_pdf.button"
          >
            <FileText className="w-4 h-4 mr-1" />
            PDF Annuel
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
                  const entryDateKey = toDateKey(entry.date);
                  const dateInterventions =
                    interventionsByDate.get(entryDateKey) ?? [];
                  const hasDetails = dateInterventions.length > 0;

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
                          <td colSpan={8} className="px-4 py-3 space-y-3">
                            {entry.startAstreinte != null &&
                              entry.endAstreinte != null && (
                                <p className="text-xs text-orange-600">
                                  Astreinte :{" "}
                                  {formatMinutes(Number(entry.startAstreinte))}{" "}
                                  → {formatMinutes(Number(entry.endAstreinte))}
                                </p>
                              )}
                            <div>
                              <p className="text-xs font-semibold text-foreground mb-2">
                                Interventions :
                              </p>
                              {dateInterventions.length === 0 ? (
                                <p className="text-xs text-muted-foreground">
                                  Aucune intervention
                                </p>
                              ) : (
                                <div className="grid gap-2">
                                  {dateInterventions.map((i, idx) => (
                                    <InterventionCard
                                      key={i.id}
                                      intervention={i}
                                      index={idx + 1}
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
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

      {/* Fiches Interventions section */}
      <div className="space-y-3" data-ocid="reports.interventions.section">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-orange-500" />
          <h2 className="text-base font-semibold text-foreground">
            Fiches Interventions
          </h2>
          <Badge
            variant="secondary"
            className="text-xs"
            data-ocid="reports.interventions.panel"
          >
            {isLoadingInterventions ? "…" : filteredInterventions.length}
          </Badge>
        </div>

        {isLoadingInterventions ? (
          <div
            className="flex items-center justify-center py-8"
            data-ocid="reports.interventions.loading_state"
          >
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredInterventions.length === 0 ? (
          <div
            className="text-center py-8 text-muted-foreground text-sm bg-card border border-border rounded-xl"
            data-ocid="reports.interventions.empty_state"
          >
            <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-30" />
            Aucune intervention pour cette période
          </div>
        ) : (
          <div className="grid gap-3" data-ocid="reports.interventions.list">
            {filteredInterventions.map((intervention, index) => (
              <InterventionCard
                key={intervention.id}
                intervention={intervention}
                index={index + 1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
