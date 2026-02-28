import { useState } from 'react';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useGetTimeEntries, useGetPdfReportData } from '../hooks/useQueries';
import { TimeEntry, DayType } from '../backend';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, Calendar, Clock } from 'lucide-react';

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

function timestampToDate(ts: bigint): Date {
  return new Date(Number(ts / 1_000_000n));
}

function formatDate(ts: bigint): string {
  const d = timestampToDate(ts);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function calcNormalHours(entry: TimeEntry): number {
  const morning = Math.max(0, Number(entry.endMorning) - Number(entry.startMorning));
  const afternoon = Math.max(0, Number(entry.endAfternoon) - Number(entry.startAfternoon));
  return morning + afternoon;
}

function calcAstreinteHours(entry: TimeEntry): number {
  if (entry.startAstreinte != null && entry.endAstreinte != null) {
    return Math.max(0, Number(entry.endAstreinte) - Number(entry.startAstreinte));
  }
  return 0;
}

function calcInterventionMinutes(entry: TimeEntry): number {
  if (!entry.interventionSlots || entry.interventionSlots.length === 0) return 0;
  return entry.interventionSlots.reduce((acc, s) => {
    const start = Number(s.startHour) * 60 + Number(s.startMinute);
    const end = Number(s.endHour) * 60 + Number(s.endMinute);
    return acc + Math.max(0, end - start);
  }, 0);
}

function formatMinutesAsHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, '0')}`;
}

function getDayTypeLabel(type: DayType): string {
  if (type === DayType.work) return 'Travail';
  if (type === DayType.astreinte) return 'Astreinte';
  if (type === DayType.conge) return 'Congé';
  return type;
}

function getDayTypeBadgeVariant(type: DayType): 'default' | 'secondary' | 'outline' {
  if (type === DayType.work) return 'default';
  if (type === DayType.astreinte) return 'secondary';
  return 'outline';
}

type PeriodType = 'week' | 'month';

export default function Reports() {
  const { identity } = useInternetIdentity();
  const { data: timeEntries = [] } = useGetTimeEntries();

  const today = new Date();
  const [periodType, setPeriodType] = useState<PeriodType>('month');
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedWeek, setSelectedWeek] = useState(getWeekNumber(today));
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const getPdfData = useGetPdfReportData();

  // Filter entries by period
  const filteredEntries = timeEntries.filter(entry => {
    const d = timestampToDate(entry.date);
    if (periodType === 'month') {
      return d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear;
    } else {
      return getWeekNumber(d) === selectedWeek && d.getFullYear() === selectedYear;
    }
  });

  // Sort by date
  const sortedEntries = [...filteredEntries].sort((a, b) => Number(a.date - b.date));

  // Totals
  const totalNormal = sortedEntries.reduce((acc, e) => acc + calcNormalHours(e), 0);
  const totalAstreinte = sortedEntries.reduce((acc, e) => acc + calcAstreinteHours(e), 0);
  const totalRepas = sortedEntries.reduce((acc, e) => acc + Number(e.heuresRepas), 0);
  const totalTrajet = sortedEntries.reduce((acc, e) => acc + Number(e.heuresTrajet), 0);
  const totalInterventionMin = sortedEntries.reduce((acc, e) => acc + calcInterventionMinutes(e), 0);

  // CSV export
  const exportCsv = () => {
    const headers = ['Date', 'Type', 'Heures normales', 'Heures astreinte', 'Interventions', 'Repas', 'Trajet', 'Description'];
    const rows = sortedEntries.map(e => [
      formatDate(e.date),
      getDayTypeLabel(e.typeOfDay),
      calcNormalHours(e).toString(),
      calcAstreinteHours(e).toString(),
      formatMinutesAsHours(calcInterventionMinutes(e)),
      e.heuresRepas.toString(),
      e.heuresTrajet.toString(),
      `"${e.description.replace(/"/g, '""')}"`,
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport-${periodType === 'month' ? `${selectedYear}-${String(selectedMonth).padStart(2, '0')}` : `${selectedYear}-S${selectedWeek}`}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // PDF export
  const exportPdf = async () => {
    if (!identity) return;
    setIsExportingPdf(true);
    try {
      const principal = identity.getPrincipal();
      const typePeriode = periodType === 'month'
        ? { __kind__: 'mois' as const, mois: [BigInt(selectedMonth), BigInt(selectedYear)] as [bigint, bigint] }
        : { __kind__: 'semaine' as const, semaine: [BigInt(selectedWeek), BigInt(selectedYear)] as [bigint, bigint] };

      const data = await getPdfData.mutateAsync({ typePeriode, user: principal });

      // Build intervention rows for PDF
      const interventionRows = sortedEntries
        .filter(e => e.interventionSlots && e.interventionSlots.length > 0)
        .map(e => {
          const slots = e.interventionSlots.map(s =>
            `${String(Number(s.startHour)).padStart(2, '0')}:${String(Number(s.startMinute)).padStart(2, '0')} → ${String(Number(s.endHour)).padStart(2, '0')}:${String(Number(s.endMinute)).padStart(2, '0')}`
          ).join(', ');
          return `<tr><td>${formatDate(e.date)}</td><td>${slots}</td><td>${formatMinutesAsHours(calcInterventionMinutes(e))}</td></tr>`;
        }).join('');

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8"/>
          <title>${data.titre}</title>
          <style>
            body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; color: #222; }
            h1 { font-size: 18px; margin-bottom: 4px; }
            h2 { font-size: 14px; margin: 16px 0 8px; color: #444; }
            p { margin: 4px 0; color: #555; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
            th { background: #f0f0f0; padding: 6px 8px; text-align: left; border: 1px solid #ccc; font-size: 11px; }
            td { padding: 5px 8px; border: 1px solid #ddd; font-size: 11px; }
            tr:nth-child(even) td { background: #fafafa; }
            .totals { background: #f5f5f5; padding: 12px; border-radius: 6px; margin-top: 16px; }
            .totals table { margin: 0; }
            .totals td { border: none; padding: 3px 8px; }
            .intervention-section { background: #fff8f0; border: 1px solid #f0c080; border-radius: 6px; padding: 12px; margin-top: 16px; }
            .intervention-section h2 { color: #b06000; margin-top: 0; }
            @media print { body { margin: 10px; } }
          </style>
        </head>
        <body>
          <h1>${data.titre}</h1>
          <p>${data.periode}</p>
          <table>
            <thead><tr>${data.enteteTableau.map((h: string) => `<th>${h}</th>`).join('')}</tr></thead>
            <tbody>${data.lignesTableau.map((row: string[]) => `<tr>${row.map((cell: string) => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody>
          </table>
          ${interventionRows ? `
          <div class="intervention-section">
            <h2>&#9201; Interventions durant l'astreinte</h2>
            <table>
              <thead><tr><th>Date</th><th>Créneaux</th><th>Durée totale</th></tr></thead>
              <tbody>${interventionRows}</tbody>
            </table>
          </div>` : ''}
          <div class="totals">
            <h2>Totaux</h2>
            <table>
              <tr><td><strong>Heures normales :</strong></td><td>${data.totaux.heuresTravailNormales}</td></tr>
              <tr><td><strong>Heures astreinte :</strong></td><td>${data.totaux.heuresAstreinte}</td></tr>
              <tr><td><strong>Heures repas :</strong></td><td>${data.totaux.heuresRepas}</td></tr>
              <tr><td><strong>Heures trajet :</strong></td><td>${data.totaux.heuresTrajet}</td></tr>
              <tr><td><strong>Heures d'intervention :</strong></td><td>${formatMinutesAsHours(totalInterventionMin)}</td></tr>
            </table>
          </div>
        </body>
        </html>
      `;

      const win = window.open('', '_blank');
      if (win) {
        win.document.write(html);
        win.document.close();
        win.focus();
        setTimeout(() => { win.print(); }, 500);
      }
    } finally {
      setIsExportingPdf(false);
    }
  };

  const periodLabel = periodType === 'month'
    ? `${MONTHS_FR[selectedMonth - 1]} ${selectedYear}`
    : `Semaine ${selectedWeek} - ${selectedYear}`;

  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-4 py-4 space-y-4">
      {/* Period selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="w-4 h-4" />
            Période du rapport
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Button
              variant={periodType === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriodType('month')}
            >
              Mensuel
            </Button>
            <Button
              variant={periodType === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriodType('week')}
            >
              Hebdomadaire
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            {periodType === 'month' ? (
              <>
                <select
                  className="bg-background border border-border rounded px-2 py-1 text-sm"
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(Number(e.target.value))}
                >
                  {MONTHS_FR.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
                <select
                  className="bg-background border border-border rounded px-2 py-1 text-sm"
                  value={selectedYear}
                  onChange={e => setSelectedYear(Number(e.target.value))}
                >
                  {Array.from({ length: 5 }, (_, i) => today.getFullYear() - 2 + i).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </>
            ) : (
              <>
                <select
                  className="bg-background border border-border rounded px-2 py-1 text-sm"
                  value={selectedWeek}
                  onChange={e => setSelectedWeek(Number(e.target.value))}
                >
                  {Array.from({ length: 53 }, (_, i) => i + 1).map(w => (
                    <option key={w} value={w}>Semaine {w}</option>
                  ))}
                </select>
                <select
                  className="bg-background border border-border rounded px-2 py-1 text-sm"
                  value={selectedYear}
                  onChange={e => setSelectedYear(Number(e.target.value))}
                >
                  {Array.from({ length: 5 }, (_, i) => today.getFullYear() - 2 + i).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary totals */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Card className="col-span-1">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Heures normales</p>
            <p className="text-2xl font-bold text-primary">{totalNormal}h</p>
          </CardContent>
        </Card>
        <Card className="col-span-1">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Heures astreinte</p>
            <p className="text-2xl font-bold text-secondary">{totalAstreinte}h</p>
          </CardContent>
        </Card>
        <Card className="col-span-1 border-accent/40 bg-accent/5">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3 text-accent" />
              Interventions
            </p>
            <p className="text-2xl font-bold text-accent">{formatMinutesAsHours(totalInterventionMin)}</p>
          </CardContent>
        </Card>
        <Card className="col-span-1">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Heures repas</p>
            <p className="text-2xl font-bold">{totalRepas}h</p>
          </CardContent>
        </Card>
        <Card className="col-span-1">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Heures trajet</p>
            <p className="text-2xl font-bold">{totalTrajet}h</p>
          </CardContent>
        </Card>
      </div>

      {/* Export buttons */}
      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={exportCsv} disabled={sortedEntries.length === 0}>
          <Download className="w-4 h-4 mr-1" />
          Export CSV
        </Button>
        <Button variant="outline" size="sm" onClick={exportPdf} disabled={sortedEntries.length === 0 || isExportingPdf || !identity}>
          <FileText className="w-4 h-4 mr-1" />
          {isExportingPdf ? 'Génération...' : 'Export PDF'}
        </Button>
      </div>

      {/* Entries table */}
      {sortedEntries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Aucune entrée pour {periodLabel}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-normal">
              {sortedEntries.length} entrée{sortedEntries.length > 1 ? 's' : ''} — {periodLabel}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Date</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Type</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground">Normales</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground">Astreinte</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-accent">Interventions</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground">Repas</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground">Trajet</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedEntries.map(entry => {
                    const interventionMin = calcInterventionMinutes(entry);
                    return (
                      <tr key={entry.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="px-3 py-2 font-medium">{formatDate(entry.date)}</td>
                        <td className="px-3 py-2">
                          <Badge variant={getDayTypeBadgeVariant(entry.typeOfDay)} className="text-xs">
                            {getDayTypeLabel(entry.typeOfDay)}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-right">{calcNormalHours(entry)}h</td>
                        <td className="px-3 py-2 text-right">{calcAstreinteHours(entry)}h</td>
                        <td className="px-3 py-2 text-right">
                          {interventionMin > 0 ? (
                            <span className="text-accent font-semibold">{formatMinutesAsHours(interventionMin)}</span>
                          ) : (
                            <span className="text-muted-foreground/40">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">{Number(entry.heuresRepas)}h</td>
                        <td className="px-3 py-2 text-right">{Number(entry.heuresTrajet)}h</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/50 font-semibold">
                    <td className="px-3 py-2 text-xs" colSpan={2}>Total</td>
                    <td className="px-3 py-2 text-right text-xs">{totalNormal}h</td>
                    <td className="px-3 py-2 text-right text-xs">{totalAstreinte}h</td>
                    <td className="px-3 py-2 text-right text-xs text-accent">{formatMinutesAsHours(totalInterventionMin)}</td>
                    <td className="px-3 py-2 text-right text-xs">{totalRepas}h</td>
                    <td className="px-3 py-2 text-right text-xs">{totalTrajet}h</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Intervention details */}
            {sortedEntries.some(e => e.interventionSlots && e.interventionSlots.length > 0) && (
              <div className="border-t border-border/50 p-3 bg-accent/5">
                <p className="text-xs font-semibold text-accent mb-2 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Détail des interventions
                </p>
                <div className="space-y-1">
                  {sortedEntries
                    .filter(e => e.interventionSlots && e.interventionSlots.length > 0)
                    .map(entry => (
                      <div key={entry.id} className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                        <span className="font-medium text-muted-foreground w-20 shrink-0">{formatDate(entry.date)}</span>
                        <span className="flex flex-wrap gap-2">
                          {entry.interventionSlots.map((s, i) => (
                            <span key={i} className="bg-accent/20 text-accent-foreground px-2 py-0.5 rounded-full">
                              {String(Number(s.startHour)).padStart(2, '0')}:{String(Number(s.startMinute)).padStart(2, '0')}
                              {' → '}
                              {String(Number(s.endHour)).padStart(2, '0')}:{String(Number(s.endMinute)).padStart(2, '0')}
                            </span>
                          ))}
                          <span className="text-muted-foreground">({formatMinutesAsHours(calcInterventionMinutes(entry))})</span>
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
