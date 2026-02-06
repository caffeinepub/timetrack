import { useMemo, useState } from 'react';
import { useGetTimeEntries, useGeneratePdfReportData } from '../hooks/useQueries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Table as TableIcon, Download } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DayType } from '../backend';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';

// Helper function to check if a date is a weekday (Monday-Friday)
function isWeekday(date: Date): boolean {
  const day = date.getDay();
  return day >= 1 && day <= 5; // 1 = Monday, 5 = Friday
}

// Helper function to get week number
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export default function Reports() {
  const { data: timeEntries = [], isLoading } = useGetTimeEntries();
  const [reportType, setReportType] = useState<'weekly' | 'monthly'>('monthly');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('current');
  const generatePdfData = useGeneratePdfReportData();

  const reportData = useMemo(() => {
    const now = new Date();
    let filteredEntries = timeEntries;

    if (reportType === 'monthly') {
      if (selectedPeriod === 'current') {
        filteredEntries = timeEntries.filter((entry) => {
          const date = new Date(Number(entry.date) / 1000000);
          return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        });
      }
    } else {
      // Weekly
      if (selectedPeriod === 'current') {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 7);

        filteredEntries = timeEntries.filter((entry) => {
          const date = new Date(Number(entry.date) / 1000000);
          return date >= startOfWeek && date < endOfWeek;
        });
      }
    }

    // Count work days: regular work days + weekday on-call days
    let workDaysCount = 0;
    const workEntries = filteredEntries.filter((e) => e.typeOfDay === DayType.work);
    workDaysCount += workEntries.length;
    
    const astreinteEntries = filteredEntries.filter((e) => e.typeOfDay === DayType.astreinte);
    astreinteEntries.forEach((entry) => {
      const date = new Date(Number(entry.date) / 1000000);
      if (isWeekday(date)) {
        workDaysCount++;
      }
    });

    const congeEntries = filteredEntries.filter((e) => e.typeOfDay === DayType.conge);

    // Calculate total hours from time differences
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

    return {
      entries: filteredEntries.sort((a, b) => Number(b.date - a.date)),
      totalHeuresNormales: Math.round(totalHeuresNormales * 10) / 10,
      totalHeuresAstreinte: Math.round(totalHeuresAstreinte * 10) / 10,
      totalHeuresRepas: Math.round(totalHeuresRepas * 10) / 10,
      totalHeuresTrajet: Math.round(totalHeuresTrajet * 10) / 10,
      workDays: workDaysCount,
      congeDays: congeEntries.length,
      astreinteDays: astreinteEntries.length,
    };
  }, [timeEntries, reportType, selectedPeriod]);

  const handleExportCSV = () => {
    const headers = ['Date', 'Jour', 'Type', 'Début Matin', 'Fin Matin', 'Début Après-midi', 'Fin Après-midi', 'Début Astreinte', 'Fin Astreinte', 'Heures Normales', 'Heures Astreinte', 'Heures Repas', 'Heures Trajet', 'Description'];
    const rows = reportData.entries.map((entry) => {
      const date = new Date(Number(entry.date) / 1000000);
      const dayName = date.toLocaleDateString('fr-FR', { weekday: 'long' });
      const isWeekdayDate = isWeekday(date);
      
      let type = entry.typeOfDay === DayType.work ? 'Travail' : 
                 entry.typeOfDay === DayType.conge ? 'Congé' : 'Astreinte';
      
      // Add indicator for weekday on-call days
      if (entry.typeOfDay === DayType.astreinte && isWeekdayDate) {
        type += ' (Travail+Astreinte)';
      }
      
      const startMorning = entry.typeOfDay !== DayType.conge ? 
        `${Math.floor(Number(entry.startMorning) / 60)}:${String(Number(entry.startMorning) % 60).padStart(2, '0')}` : '-';
      const endMorning = entry.typeOfDay !== DayType.conge ? 
        `${Math.floor(Number(entry.endMorning) / 60)}:${String(Number(entry.endMorning) % 60).padStart(2, '0')}` : '-';
      const startAfternoon = entry.typeOfDay !== DayType.conge ? 
        `${Math.floor(Number(entry.startAfternoon) / 60)}:${String(Number(entry.startAfternoon) % 60).padStart(2, '0')}` : '-';
      const endAfternoon = entry.typeOfDay !== DayType.conge ? 
        `${Math.floor(Number(entry.endAfternoon) / 60)}:${String(Number(entry.endAfternoon) % 60).padStart(2, '0')}` : '-';
      
      const startAstreinte = entry.startAstreinte !== undefined ?
        `${Math.floor(Number(entry.startAstreinte) / 60)}:${String(Number(entry.startAstreinte) % 60).padStart(2, '0')}` : '-';
      const endAstreinte = entry.endAstreinte !== undefined ?
        `${Math.floor(Number(entry.endAstreinte) / 60)}:${String(Number(entry.endAstreinte) % 60).padStart(2, '0')}` : '-';
      
      const heuresNormales = Math.round(((Number(entry.endMorning) - Number(entry.startMorning)) + (Number(entry.endAfternoon) - Number(entry.startAfternoon))) / 60 * 10) / 10;
      const heuresAstreinte = entry.startAstreinte !== undefined && entry.endAstreinte !== undefined ?
        Math.round((Number(entry.endAstreinte) - Number(entry.startAstreinte)) / 60 * 10) / 10 : 0;
      const heuresRepas = Math.round(Number(entry.heuresRepas) / 60 * 10) / 10;
      const heuresTrajet = Math.round(Number(entry.heuresTrajet) / 60 * 10) / 10;
      
      return [
        date.toLocaleDateString('fr-FR'),
        dayName,
        type,
        startMorning,
        endMorning,
        startAfternoon,
        endAfternoon,
        startAstreinte,
        endAstreinte,
        heuresNormales,
        heuresAstreinte,
        heuresRepas,
        heuresTrajet,
        entry.description || '-'
      ];
    });

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `rapport-${reportType}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleExportPDF = async () => {
    try {
      const now = new Date();
      const period = reportType === 'monthly' 
        ? { month: now.getMonth() + 1, year: now.getFullYear() }
        : { week: getWeekNumber(now), year: now.getFullYear() };

      const pdfData = await generatePdfData.mutateAsync({ reportType, period });
      
      // Generate PDF using canvas
      generatePDFFromData(pdfData);
      
      toast.success('PDF généré avec succès');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erreur lors de la génération du PDF');
    }
  };

  const generatePDFFromData = (data: any) => {
    // Create a new window for PDF generation
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Veuillez autoriser les pop-ups pour générer le PDF');
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${data.titre}</title>
        <style>
          @page {
            size: A4;
            margin: 20mm;
          }
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            color: #333;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #2563eb;
            padding-bottom: 15px;
          }
          .header h1 {
            margin: 0 0 10px 0;
            color: #1e40af;
            font-size: 28px;
          }
          .header p {
            margin: 5px 0;
            color: #64748b;
            font-size: 14px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            font-size: 11px;
          }
          th {
            background-color: #2563eb;
            color: white;
            padding: 10px 8px;
            text-align: left;
            font-weight: 600;
            border: 1px solid #1e40af;
          }
          td {
            padding: 8px;
            border: 1px solid #e2e8f0;
          }
          tr:nth-child(even) {
            background-color: #f8fafc;
          }
          .totals {
            margin-top: 30px;
            padding: 20px;
            background-color: #f1f5f9;
            border-radius: 8px;
            border-left: 4px solid #2563eb;
          }
          .totals h2 {
            margin: 0 0 15px 0;
            color: #1e40af;
            font-size: 18px;
          }
          .totals-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
          }
          .total-item {
            display: flex;
            justify-content: space-between;
            padding: 8px 12px;
            background-color: white;
            border-radius: 4px;
            border: 1px solid #e2e8f0;
          }
          .total-label {
            font-weight: 600;
            color: #475569;
          }
          .total-value {
            font-weight: 700;
            color: #1e40af;
            font-size: 16px;
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 10px;
            color: #94a3b8;
            border-top: 1px solid #e2e8f0;
            padding-top: 15px;
          }
          @media print {
            body {
              padding: 0;
            }
            .no-print {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${data.titre}</h1>
          <p>${data.periode}</p>
          <p>Généré le ${new Date(Number(data.exportTimestamp) / 1000000).toLocaleDateString('fr-FR', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}</p>
        </div>

        <table>
          <thead>
            <tr>
              ${data.enteteTableau.map((header: string) => `<th>${header}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${data.lignesTableau.map((row: string[]) => `
              <tr>
                ${row.map(cell => `<td>${cell}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="totals">
          <h2>📊 Totaux</h2>
          <div class="totals-grid">
            <div class="total-item">
              <span class="total-label">Heures normales :</span>
              <span class="total-value">${data.totaux.heuresTravailNormales}</span>
            </div>
            <div class="total-item">
              <span class="total-label">Heures astreinte :</span>
              <span class="total-value">${data.totaux.heuresAstreinte}</span>
            </div>
            <div class="total-item">
              <span class="total-label">Heures repas :</span>
              <span class="total-value">${data.totaux.heuresRepas}</span>
            </div>
            <div class="total-item">
              <span class="total-label">Heures trajet :</span>
              <span class="total-value">${data.totaux.heuresTrajet}</span>
            </div>
          </div>
        </div>

        <div class="footer">
          <p>© 2025. Généré avec ❤️ par caffeine.ai</p>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement des rapports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Rapports</h2>
        <p className="text-sm md:text-base text-muted-foreground">Exportez vos données de temps de travail</p>
      </div>

      <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-xs sm:text-sm text-blue-900 dark:text-blue-100">
          <strong>Note :</strong> Les jours d'astreinte en semaine (lundi-vendredi) sont comptés à la fois dans les jours travaillés et les jours d'astreinte. Les heures d'astreinte sont calculées à partir des créneaux horaires précis.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configuration du rapport</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Type de rapport</label>
              <Select value={reportType} onValueChange={(value: any) => setReportType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Hebdomadaire</SelectItem>
                  <SelectItem value="monthly">Mensuel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Période</label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current">
                    {reportType === 'monthly' ? 'Mois en cours' : 'Semaine en cours'}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={handleExportCSV} className="gap-2 w-full sm:w-auto">
              <TableIcon className="w-4 h-4" />
              Exporter en CSV
            </Button>
            <Button 
              onClick={handleExportPDF} 
              variant="outline" 
              className="gap-2 w-full sm:w-auto"
              disabled={generatePdfData.isPending}
            >
              {generatePdfData.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Génération...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  Exporter en PDF
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Résumé</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-3 sm:gap-4">
            <div className="text-center p-3 sm:p-4 bg-muted/50 rounded-lg">
              <div className="text-xl sm:text-2xl font-bold text-foreground">{reportData.totalHeuresNormales}h</div>
              <div className="text-xs sm:text-sm text-muted-foreground">Heures normales</div>
            </div>
            <div className="text-center p-3 sm:p-4 bg-muted/50 rounded-lg">
              <div className="text-xl sm:text-2xl font-bold text-foreground">{reportData.totalHeuresAstreinte}h</div>
              <div className="text-xs sm:text-sm text-muted-foreground">Heures astreinte</div>
            </div>
            <div className="text-center p-3 sm:p-4 bg-muted/50 rounded-lg">
              <div className="text-xl sm:text-2xl font-bold text-foreground">{reportData.totalHeuresRepas}h</div>
              <div className="text-xs sm:text-sm text-muted-foreground">Heures repas</div>
            </div>
            <div className="text-center p-3 sm:p-4 bg-muted/50 rounded-lg">
              <div className="text-xl sm:text-2xl font-bold text-foreground">{reportData.totalHeuresTrajet}h</div>
              <div className="text-xs sm:text-sm text-muted-foreground">Heures trajet</div>
            </div>
            <div className="text-center p-3 sm:p-4 bg-muted/50 rounded-lg">
              <div className="text-xl sm:text-2xl font-bold text-foreground">{reportData.workDays}</div>
              <div className="text-xs sm:text-sm text-muted-foreground">Jours travaillés</div>
              <div className="text-[0.65rem] text-muted-foreground mt-1">(incl. astreintes semaine)</div>
            </div>
            <div className="text-center p-3 sm:p-4 bg-muted/50 rounded-lg">
              <div className="text-xl sm:text-2xl font-bold text-foreground">{reportData.congeDays}</div>
              <div className="text-xs sm:text-sm text-muted-foreground">Jours de congé</div>
            </div>
            <div className="text-center p-3 sm:p-4 bg-muted/50 rounded-lg">
              <div className="text-xl sm:text-2xl font-bold text-foreground">{reportData.astreinteDays}</div>
              <div className="text-xs sm:text-sm text-muted-foreground">Jours d'astreinte</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Détails des entrées</CardTitle>
        </CardHeader>
        <CardContent>
          {reportData.entries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucune donnée pour cette période
            </div>
          ) : (
            <ScrollArea className="w-full">
              <div className="min-w-[800px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Horaires travail</TableHead>
                      <TableHead>Horaires astreinte</TableHead>
                      <TableHead>H. Normales</TableHead>
                      <TableHead>H. Astreinte</TableHead>
                      <TableHead>H. Repas</TableHead>
                      <TableHead>H. Trajet</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.entries.map((entry) => {
                      const date = new Date(Number(entry.date) / 1000000);
                      const isWeekdayDate = isWeekday(date);
                      const heuresNormales = Math.round(((Number(entry.endMorning) - Number(entry.startMorning)) + (Number(entry.endAfternoon) - Number(entry.startAfternoon))) / 60 * 10) / 10;
                      const heuresAstreinte = entry.startAstreinte !== undefined && entry.endAstreinte !== undefined ?
                        Math.round((Number(entry.endAstreinte) - Number(entry.startAstreinte)) / 60 * 10) / 10 : 0;
                      const heuresRepas = Math.round(Number(entry.heuresRepas) / 60 * 10) / 10;
                      const heuresTrajet = Math.round(Number(entry.heuresTrajet) / 60 * 10) / 10;

                      const formatTime = (minutes: bigint) => {
                        const h = Math.floor(Number(minutes) / 60);
                        const m = Number(minutes) % 60;
                        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                      };

                      return (
                        <TableRow key={entry.id}>
                          <TableCell>
                            {date.toLocaleDateString('fr-FR', {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short',
                            })}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 flex-wrap">
                              {entry.typeOfDay === DayType.work && (
                                <Badge variant="default">Travail</Badge>
                              )}
                              {entry.typeOfDay === DayType.conge && (
                                <Badge variant="secondary" className="bg-purple-500 text-white">
                                  Congé
                                </Badge>
                              )}
                              {entry.typeOfDay === DayType.astreinte && (
                                <>
                                  <Badge variant="secondary" className="bg-orange-500 text-white">
                                    Astreinte
                                  </Badge>
                                  {isWeekdayDate && (
                                    <Badge variant="outline" className="text-xs bg-green-50 dark:bg-green-950 border-green-400">
                                      +Travail
                                    </Badge>
                                  )}
                                </>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">
                            {entry.typeOfDay !== DayType.conge ? (
                              <div className="space-y-1">
                                <div>M: {formatTime(entry.startMorning)}-{formatTime(entry.endMorning)}</div>
                                <div>AM: {formatTime(entry.startAfternoon)}-{formatTime(entry.endAfternoon)}</div>
                              </div>
                            ) : '-'}
                          </TableCell>
                          <TableCell className="text-xs">
                            {entry.startAstreinte !== undefined && entry.endAstreinte !== undefined ? (
                              <div className="text-orange-600 dark:text-orange-400 font-medium">
                                {formatTime(entry.startAstreinte)}-{formatTime(entry.endAstreinte)}
                              </div>
                            ) : '-'}
                          </TableCell>
                          <TableCell className="font-medium">
                            {heuresNormales > 0 ? `${heuresNormales}h` : '-'}
                          </TableCell>
                          <TableCell className="font-medium text-orange-600 dark:text-orange-400">
                            {heuresAstreinte > 0 ? `${heuresAstreinte}h` : '-'}
                          </TableCell>
                          <TableCell className="font-medium text-rose-600 dark:text-rose-400">
                            {heuresRepas > 0 ? `${heuresRepas}h` : '-'}
                          </TableCell>
                          <TableCell className="font-medium text-cyan-600 dark:text-cyan-400">
                            {heuresTrajet > 0 ? `${heuresTrajet}h` : '-'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {entry.description || '-'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
