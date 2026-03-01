import { useState, useMemo } from 'react';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useGetTimeEntries, useGetPdfReportData } from '../hooks/useQueries';
import { TimeEntry } from '../backend';
import {
  formatHours,
  computeNormalHours,
  computeAstreinteHours,
  computeInterventionHours,
  formatInterventionRange,
} from '../utils/timeFormatting';
import { getWeeksForMonth, isDateInWeek, getISOWeekNumber, type WeekOption } from '../utils/weekOptions';
import { FileText, Download, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

type PeriodType = 'weekly' | 'monthly';

const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

export default function Reports() {
  const { identity } = useInternetIdentity();
  const { data: allEntries = [], isLoading } = useGetTimeEntries();
  const { mutateAsync: generatePdf, isPending: isPdfLoading } = useGetPdfReportData();

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth(); // 0-indexed

  const [periodType, setPeriodType] = useState<PeriodType>('monthly');
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth); // 0-indexed
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

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

  const safeWeekIndex = Math.min(selectedWeekIndex, Math.max(0, weeksForMonth.length - 1));

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
        if (periodType === 'monthly') {
          return entryYear === selectedYear && date.getMonth() === selectedMonth;
        } else {
          const week: WeekOption | undefined = weeksForMonth[safeWeekIndex];
          if (!week) return false;
          return isDateInWeek(entry.date, week.startDate, week.endDate);
        }
      })
      .sort((a, b) => Number(a.date) - Number(b.date));
  }, [userEntries, periodType, selectedYear, selectedMonth, safeWeekIndex, weeksForMonth]);

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

    return { totalNormal, totalAstreinte, totalRepas, totalTrajet, totalIntervention };
  }, [filteredEntries]);

  const handleExportCsv = () => {
    const headers = ['Date', 'Type', 'Heures normales', 'Astreinte', 'Interventions', 'Repas', 'Trajet', 'Description'];
    const rows = filteredEntries.map((entry) => {
      const date = new Date(Number(entry.date) / 1_000_000);
      const dateStr = date.toLocaleDateString('fr-FR');
      const typeMap: Record<string, string> = { work: 'Travail', conge: 'Congé', astreinte: 'Astreinte' };
      return [
        dateStr,
        typeMap[entry.typeOfDay] ?? entry.typeOfDay,
        formatHours(computeNormalHours(entry)),
        formatHours(computeAstreinteHours(entry)),
        formatHours(computeInterventionHours(entry.interventionSlots)),
        formatHours(Number(entry.heuresRepas)),
        formatHours(Number(entry.heuresTrajet)),
        `"${entry.description.replace(/"/g, '""')}"`,
      ].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport_${periodType === 'monthly' ? `${selectedMonth + 1}_${selectedYear}` : `sem${safeWeekIndex + 1}_${selectedYear}`}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = async () => {
    if (!identity) return;
    const principal = identity.getPrincipal();
    try {
      if (periodType === 'monthly') {
        await generatePdf({
          typePeriode: { __kind__: 'mois', mois: [BigInt(selectedMonth + 1), BigInt(selectedYear)] },
          user: principal,
        });
      } else {
        const week: WeekOption | undefined = weeksForMonth[safeWeekIndex];
        if (!week) return;
        const weekNum = getISOWeekNumber(week.startDate);
        await generatePdf({
          typePeriode: { __kind__: 'semaine', semaine: [BigInt(weekNum), BigInt(selectedYear)] },
          user: principal,
        });
      }
    } catch (e) {
      console.error('PDF generation error:', e);
    }
  };

  const formatDate = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) / 1_000_000);
    return date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const typeLabel: Record<string, string> = {
    work: 'Travail',
    conge: 'Congé',
    astreinte: 'Astreinte',
  };

  const typeBadgeClass: Record<string, string> = {
    work: 'bg-primary/10 text-primary',
    conge: 'bg-secondary/10 text-secondary-foreground',
    astreinte: 'bg-accent/10 text-accent-foreground',
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
          {(['monthly', 'weekly'] as PeriodType[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriodType(p)}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                periodType === p
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card text-muted-foreground hover:bg-muted'
              }`}
            >
              {p === 'monthly' ? 'Mensuel' : 'Hebdomadaire'}
            </button>
          ))}
        </div>

        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="px-3 py-1.5 text-sm rounded-lg border border-border bg-card text-foreground"
        >
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

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

        <div className="flex gap-2 ml-auto">
          <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={filteredEntries.length === 0}>
            <Download className="w-4 h-4 mr-1" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={filteredEntries.length === 0 || isPdfLoading || !identity}>
            {isPdfLoading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <FileText className="w-4 h-4 mr-1" />}
            PDF
          </Button>
        </div>
      </div>

      {/* Totals summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Heures normales', value: formatHours(totals.totalNormal), colorClass: 'text-primary' },
          { label: 'Astreinte', value: formatHours(totals.totalAstreinte), colorClass: 'text-accent' },
          { label: 'Interventions', value: formatHours(totals.totalIntervention), colorClass: 'text-foreground' },
          { label: 'Repas', value: formatHours(totals.totalRepas), colorClass: 'text-secondary-foreground' },
          { label: 'Trajet', value: formatHours(totals.totalTrajet), colorClass: 'text-muted-foreground' },
        ].map((item) => (
          <div key={item.label} className="bg-card rounded-xl border border-border p-3 text-center">
            <p className={`text-xl font-bold ${item.colorClass}`}>{item.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Entries table */}
      {filteredEntries.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Aucune entrée pour cette période</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Normal</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Astreinte</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Repas</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Trajet</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Interventions</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry) => {
                  const normal = computeNormalHours(entry);
                  const astreinte = computeAstreinteHours(entry);
                  const intervention = computeInterventionHours(entry.interventionSlots);
                  const isExpanded = expandedRow === entry.id;
                  const hasDetails = entry.interventionSlots.length > 0 || !!entry.description;

                  return (
                    <>
                      <tr
                        key={entry.id}
                        className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => setExpandedRow(isExpanded ? null : entry.id)}
                      >
                        <td className="px-4 py-3 text-foreground font-medium">{formatDate(entry.date)}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeBadgeClass[entry.typeOfDay] ?? ''}`}>
                            {typeLabel[entry.typeOfDay] ?? entry.typeOfDay}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-foreground">{formatHours(normal)}</td>
                        <td className="px-4 py-3 text-right text-foreground">{formatHours(astreinte)}</td>
                        <td className="px-4 py-3 text-right text-foreground">{formatHours(Number(entry.heuresRepas))}</td>
                        <td className="px-4 py-3 text-right text-foreground">{formatHours(Number(entry.heuresTrajet))}</td>
                        <td className="px-4 py-3 text-right text-foreground">{formatHours(intervention)}</td>
                        <td className="px-4 py-3 text-right">
                          {hasDetails && (
                            isExpanded
                              ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                              : <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          )}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${entry.id}-detail`} className="bg-muted/20">
                          <td colSpan={8} className="px-4 py-3">
                            {entry.description && (
                              <p className="text-sm text-muted-foreground mb-2 italic">"{entry.description}"</p>
                            )}
                            {entry.interventionSlots.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-foreground mb-1">Interventions :</p>
                                <div className="flex flex-wrap gap-2">
                                  {entry.interventionSlots.map((slot, i) => (
                                    <span key={i} className="text-xs bg-card border border-border rounded px-2 py-1">
                                      {formatInterventionRange(slot.startHour, slot.startMinute, slot.endHour, slot.endMinute)}
                                      {' '}({formatHours(
                                        (Number(slot.endHour) * 60 + Number(slot.endMinute) - Number(slot.startHour) * 60 - Number(slot.startMinute)) / 60
                                      )})
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {entry.startAstreinte != null && entry.endAstreinte != null && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Astreinte : {Number(entry.startAstreinte)}h → {Number(entry.endAstreinte)}h
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
                  <td className="px-4 py-3 text-foreground" colSpan={2}>Total</td>
                  <td className="px-4 py-3 text-right text-primary">{formatHours(totals.totalNormal)}</td>
                  <td className="px-4 py-3 text-right text-accent">{formatHours(totals.totalAstreinte)}</td>
                  <td className="px-4 py-3 text-right text-foreground">{formatHours(totals.totalRepas)}</td>
                  <td className="px-4 py-3 text-right text-foreground">{formatHours(totals.totalTrajet)}</td>
                  <td className="px-4 py-3 text-right text-foreground">{formatHours(totals.totalIntervention)}</td>
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
