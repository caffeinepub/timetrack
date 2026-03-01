import { useState, useMemo } from 'react';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useGetTimeEntries, useSaveTimeEntry, useUpdateTimeEntry, useDeleteTimeEntry } from '../hooks/useQueries';
import { TimeEntry, DayType } from '../backend';
import { formatHours, computeNormalHours, computeAstreinteHours, computeInterventionHours, formatInterventionRange } from '../utils/timeFormatting';
import { ChevronLeft, ChevronRight, Plus, Edit2, Clock, X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DayTypeCheckboxGroup } from '../components/DayTypeCheckboxGroup';

const DAYS_OF_WEEK = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

interface InterventionSlotForm {
  startHour: string;
  startMinute: string;
  endHour: string;
  endMinute: string;
}

interface TimeEntryForm {
  startMorning: string;
  endMorning: string;
  startAfternoon: string;
  endAfternoon: string;
  heuresRepas: string;
  heuresTrajet: string;
  startAstreinte: string;
  endAstreinte: string;
  typeOfDay: DayType;
  description: string;
  interventionSlots: InterventionSlotForm[];
}

const defaultForm = (): TimeEntryForm => ({
  startMorning: '8',
  endMorning: '12',
  startAfternoon: '13',
  endAfternoon: '17',
  heuresRepas: '1',
  heuresTrajet: '0',
  startAstreinte: '',
  endAstreinte: '',
  typeOfDay: DayType.work,
  description: '',
  interventionSlots: [],
});

function getMonthDays(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = (firstDay.getDay() + 6) % 7; // Monday = 0
  const days: (Date | null)[] = [];
  for (let i = 0; i < startDow; i++) days.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));
  return days;
}

function dateToTimestamp(date: Date): bigint {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);
  return BigInt(d.getTime()) * 1_000_000n;
}

function timestampToDate(ts: bigint): Date {
  return new Date(Number(ts) / 1_000_000);
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function Calendar() {
  const { identity } = useInternetIdentity();
  const { data: allEntries = [], isLoading } = useGetTimeEntries();
  const { mutateAsync: saveEntry, isPending: isSaving } = useSaveTimeEntry();
  const { mutateAsync: updateEntry, isPending: isUpdating } = useUpdateTimeEntry();
  const { mutateAsync: deleteEntry, isPending: isDeleting } = useDeleteTimeEntry();

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [form, setForm] = useState<TimeEntryForm>(defaultForm());

  const userEntries = useMemo(() => {
    if (!identity) return [];
    const principal = identity.getPrincipal().toString();
    return allEntries.filter((e) => e.user.toString() === principal);
  }, [allEntries, identity]);

  const entriesByDay = useMemo(() => {
    const map = new Map<string, TimeEntry[]>();
    for (const entry of userEntries) {
      const d = timestampToDate(entry.date);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(entry);
    }
    return map;
  }, [userEntries]);

  const monthDays = useMemo(() => getMonthDays(viewYear, viewMonth), [viewYear, viewMonth]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const openNewEntry = (date: Date) => {
    setSelectedDate(date);
    setEditingEntry(null);
    setForm(defaultForm());
    setDialogOpen(true);
  };

  const openEditEntry = (entry: TimeEntry) => {
    setSelectedDate(timestampToDate(entry.date));
    setEditingEntry(entry);
    setForm({
      startMorning: String(Number(entry.startMorning)),
      endMorning: String(Number(entry.endMorning)),
      startAfternoon: String(Number(entry.startAfternoon)),
      endAfternoon: String(Number(entry.endAfternoon)),
      heuresRepas: String(Number(entry.heuresRepas)),
      heuresTrajet: String(Number(entry.heuresTrajet)),
      startAstreinte: entry.startAstreinte != null ? String(Number(entry.startAstreinte)) : '',
      endAstreinte: entry.endAstreinte != null ? String(Number(entry.endAstreinte)) : '',
      typeOfDay: entry.typeOfDay as DayType,
      description: entry.description,
      interventionSlots: entry.interventionSlots.map(s => ({
        startHour: String(Number(s.startHour)),
        startMinute: String(Number(s.startMinute)),
        endHour: String(Number(s.endHour)),
        endMinute: String(Number(s.endMinute)),
      })),
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!selectedDate) return;
    const id = editingEntry?.id ?? `entry-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const input = {
      id,
      date: dateToTimestamp(selectedDate),
      startMorning: BigInt(Number(form.startMorning) || 0),
      endMorning: BigInt(Number(form.endMorning) || 0),
      startAfternoon: BigInt(Number(form.startAfternoon) || 0),
      endAfternoon: BigInt(Number(form.endAfternoon) || 0),
      heuresRepas: BigInt(Number(form.heuresRepas) || 0),
      heuresTrajet: BigInt(Number(form.heuresTrajet) || 0),
      startAstreinte: form.startAstreinte ? BigInt(Number(form.startAstreinte)) : undefined,
      endAstreinte: form.endAstreinte ? BigInt(Number(form.endAstreinte)) : undefined,
      typeOfDay: form.typeOfDay,
      description: form.description,
      interventionSlots: form.interventionSlots.map(s => ({
        startHour: BigInt(Number(s.startHour) || 0),
        startMinute: BigInt(Number(s.startMinute) || 0),
        endHour: BigInt(Number(s.endHour) || 0),
        endMinute: BigInt(Number(s.endMinute) || 0),
      })),
    };

    if (editingEntry) {
      await updateEntry({ id, input });
    } else {
      await saveEntry(input);
    }
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    await deleteEntry(id);
    setDialogOpen(false);
  };

  const addInterventionSlot = () => {
    setForm(f => ({
      ...f,
      interventionSlots: [...f.interventionSlots, { startHour: '8', startMinute: '0', endHour: '9', endMinute: '0' }],
    }));
  };

  const removeInterventionSlot = (idx: number) => {
    setForm(f => ({ ...f, interventionSlots: f.interventionSlots.filter((_, i) => i !== idx) }));
  };

  const updateSlot = (idx: number, field: keyof InterventionSlotForm, value: string) => {
    setForm(f => ({
      ...f,
      interventionSlots: f.interventionSlots.map((s, i) => i === idx ? { ...s, [field]: value } : s),
    }));
  };

  const getDayKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

  const typeColors: Record<string, string> = {
    work: 'bg-primary',
    conge: 'bg-secondary',
    astreinte: 'bg-accent',
  };

  const isMutating = isSaving || isUpdating || isDeleting;

  return (
    <div className="space-y-4 pb-6">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
        <h2 className="text-lg font-semibold text-foreground">
          {MONTHS[viewMonth]} {viewYear}
        </h2>
        <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ChevronRight className="w-5 h-5 text-foreground" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1">
        {DAYS_OF_WEEK.map(d => (
          <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {monthDays.map((date, idx) => {
          if (!date) return <div key={`empty-${idx}`} />;
          const key = getDayKey(date);
          const dayEntries = entriesByDay.get(key) ?? [];
          const isToday = isSameDay(date, today);
          const isSelected = selectedDate ? isSameDay(date, selectedDate) : false;

          return (
            <button
              key={key}
              onClick={() => openNewEntry(date)}
              className={`
                relative min-h-[52px] p-1 rounded-lg border text-left transition-all
                ${isToday ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-muted/50'}
                ${isSelected ? 'ring-2 ring-primary' : ''}
              `}
            >
              <span className={`text-xs font-medium ${isToday ? 'text-primary' : 'text-foreground'}`}>
                {date.getDate()}
              </span>
              <div className="mt-0.5 space-y-0.5">
                {dayEntries.slice(0, 2).map((entry) => {
                  const hours = computeNormalHours(entry);
                  return (
                    <div
                      key={entry.id}
                      onClick={(e) => { e.stopPropagation(); openEditEntry(entry); }}
                      className={`text-[9px] leading-tight px-1 py-0.5 rounded text-white truncate ${typeColors[entry.typeOfDay] ?? 'bg-muted'}`}
                    >
                      {formatHours(hours)}
                    </div>
                  );
                })}
                {dayEntries.length > 2 && (
                  <div className="text-[9px] text-muted-foreground">+{dayEntries.length - 2}</div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Entry list for selected month */}
      {userEntries.filter(e => {
        const d = timestampToDate(e.date);
        return d.getFullYear() === viewYear && d.getMonth() === viewMonth;
      }).length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Entrées du mois</h3>
          {userEntries
            .filter(e => {
              const d = timestampToDate(e.date);
              return d.getFullYear() === viewYear && d.getMonth() === viewMonth;
            })
            .sort((a, b) => Number(a.date) - Number(b.date))
            .map(entry => {
              const d = timestampToDate(entry.date);
              const normal = computeNormalHours(entry);
              const astreinte = computeAstreinteHours(entry);
              const intervention = computeInterventionHours(entry.interventionSlots);
              return (
                <div
                  key={entry.id}
                  onClick={() => openEditEntry(entry)}
                  className="bg-card border border-border rounded-lg p-3 flex items-center gap-3 cursor-pointer hover:bg-muted/30 transition-colors"
                >
                  <div className={`w-2 h-10 rounded-full flex-shrink-0 ${typeColors[entry.typeOfDay] ?? 'bg-muted'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                      {normal > 0 && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {formatHours(normal)}
                        </span>
                      )}
                      {astreinte > 0 && (
                        <span className="text-xs text-accent">{formatHours(astreinte)} astreinte</span>
                      )}
                      {intervention > 0 && (
                        <span className="text-xs text-foreground">{formatHours(intervention)} intervention</span>
                      )}
                      {Number(entry.heuresRepas) > 0 && (
                        <span className="text-xs text-muted-foreground">{formatHours(Number(entry.heuresRepas))} repas</span>
                      )}
                      {Number(entry.heuresTrajet) > 0 && (
                        <span className="text-xs text-muted-foreground">{formatHours(Number(entry.heuresTrajet))} trajet</span>
                      )}
                    </div>
                  </div>
                  <Edit2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </div>
              );
            })}
        </div>
      )}

      {/* Time Entry Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingEntry ? 'Modifier la journée' : 'Nouvelle journée'}
              {selectedDate && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  — {selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Day type */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Type de journée</Label>
              <DayTypeCheckboxGroup
                value={form.typeOfDay}
                onChange={(v) => setForm(f => ({ ...f, typeOfDay: v as DayType }))}
              />
            </div>

            {/* Morning hours */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Matin (heures)</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Début</Label>
                  <Input
                    type="number"
                    min="0"
                    max="24"
                    step="0.5"
                    value={form.startMorning}
                    onChange={(e) => setForm(f => ({ ...f, startMorning: e.target.value }))}
                    placeholder="8"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Fin</Label>
                  <Input
                    type="number"
                    min="0"
                    max="24"
                    step="0.5"
                    value={form.endMorning}
                    onChange={(e) => setForm(f => ({ ...f, endMorning: e.target.value }))}
                    placeholder="12"
                  />
                </div>
              </div>
            </div>

            {/* Afternoon hours */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Après-midi (heures)</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Début</Label>
                  <Input
                    type="number"
                    min="0"
                    max="24"
                    step="0.5"
                    value={form.startAfternoon}
                    onChange={(e) => setForm(f => ({ ...f, startAfternoon: e.target.value }))}
                    placeholder="13"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Fin</Label>
                  <Input
                    type="number"
                    min="0"
                    max="24"
                    step="0.5"
                    value={form.endAfternoon}
                    onChange={(e) => setForm(f => ({ ...f, endAfternoon: e.target.value }))}
                    placeholder="17"
                  />
                </div>
              </div>
            </div>

            {/* Computed normal hours display */}
            {(() => {
              const morning = Math.max(0, (Number(form.endMorning) || 0) - (Number(form.startMorning) || 0));
              const afternoon = Math.max(0, (Number(form.endAfternoon) || 0) - (Number(form.startAfternoon) || 0));
              const total = morning + afternoon;
              return total > 0 ? (
                <p className="text-xs text-muted-foreground -mt-2">
                  Total heures normales : <span className="font-semibold text-foreground">{formatHours(total)}</span>
                </p>
              ) : null;
            })()}

            {/* Repas & Trajet */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-medium mb-1 block">Repas (h)</Label>
                <Input
                  type="number"
                  min="0"
                  max="24"
                  step="0.5"
                  value={form.heuresRepas}
                  onChange={(e) => setForm(f => ({ ...f, heuresRepas: e.target.value }))}
                  placeholder="1"
                />
              </div>
              <div>
                <Label className="text-sm font-medium mb-1 block">Trajet (h)</Label>
                <Input
                  type="number"
                  min="0"
                  max="24"
                  step="0.5"
                  value={form.heuresTrajet}
                  onChange={(e) => setForm(f => ({ ...f, heuresTrajet: e.target.value }))}
                  placeholder="0"
                />
              </div>
            </div>

            {/* Astreinte */}
            {form.typeOfDay === DayType.astreinte && (
              <div>
                <Label className="text-sm font-medium mb-2 block">Période d'astreinte (heures)</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Début</Label>
                    <Input
                      type="number"
                      min="0"
                      max="24"
                      step="0.5"
                      value={form.startAstreinte}
                      onChange={(e) => setForm(f => ({ ...f, startAstreinte: e.target.value }))}
                      placeholder="18"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Fin</Label>
                    <Input
                      type="number"
                      min="0"
                      max="24"
                      step="0.5"
                      value={form.endAstreinte}
                      onChange={(e) => setForm(f => ({ ...f, endAstreinte: e.target.value }))}
                      placeholder="8"
                    />
                  </div>
                </div>
                {form.startAstreinte && form.endAstreinte && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Durée astreinte : <span className="font-semibold text-foreground">
                      {formatHours(Math.max(0, (Number(form.endAstreinte) || 0) - (Number(form.startAstreinte) || 0)))}
                    </span>
                  </p>
                )}
              </div>
            )}

            {/* Intervention slots */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">Interventions</Label>
                <Button variant="outline" size="sm" onClick={addInterventionSlot} type="button">
                  <Plus className="w-3 h-3 mr-1" /> Ajouter
                </Button>
              </div>
              {form.interventionSlots.length === 0 && (
                <p className="text-xs text-muted-foreground">Aucune intervention</p>
              )}
              {form.interventionSlots.map((slot, idx) => (
                <div key={idx} className="flex items-end gap-2 mb-2 p-2 bg-muted/30 rounded-lg">
                  <div className="grid grid-cols-2 gap-2 flex-1">
                    <div>
                      <Label className="text-xs text-muted-foreground">Début (h:min)</Label>
                      <div className="flex gap-1">
                        <Input
                          type="number" min="0" max="23" placeholder="8"
                          value={slot.startHour}
                          onChange={(e) => updateSlot(idx, 'startHour', e.target.value)}
                          className="w-14 text-center px-1"
                        />
                        <span className="self-center text-muted-foreground">:</span>
                        <Input
                          type="number" min="0" max="59" placeholder="00"
                          value={slot.startMinute}
                          onChange={(e) => updateSlot(idx, 'startMinute', e.target.value)}
                          className="w-14 text-center px-1"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Fin (h:min)</Label>
                      <div className="flex gap-1">
                        <Input
                          type="number" min="0" max="23" placeholder="9"
                          value={slot.endHour}
                          onChange={(e) => updateSlot(idx, 'endHour', e.target.value)}
                          className="w-14 text-center px-1"
                        />
                        <span className="self-center text-muted-foreground">:</span>
                        <Input
                          type="number" min="0" max="59" placeholder="00"
                          value={slot.endMinute}
                          onChange={(e) => updateSlot(idx, 'endMinute', e.target.value)}
                          className="w-14 text-center px-1"
                        />
                      </div>
                    </div>
                  </div>
                  {/* Duration preview */}
                  <div className="text-xs text-muted-foreground self-center min-w-[40px]">
                    {(() => {
                      const startTotal = (Number(slot.startHour) || 0) * 60 + (Number(slot.startMinute) || 0);
                      const endTotal = (Number(slot.endHour) || 0) * 60 + (Number(slot.endMinute) || 0);
                      const diff = endTotal - startTotal;
                      return diff > 0 ? formatHours(diff / 60) : '';
                    })()}
                  </div>
                  <button onClick={() => removeInterventionSlot(idx)} className="p-1 text-destructive hover:bg-destructive/10 rounded">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Description */}
            <div>
              <Label className="text-sm font-medium mb-1 block">Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Notes sur la journée..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2 mt-4">
            {editingEntry && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDelete(editingEntry.id)}
                disabled={isMutating}
              >
                {isDeleting ? (
                  <span className="flex items-center gap-1">
                    <span className="animate-spin rounded-full h-3 w-3 border-b border-white" /> Suppression...
                  </span>
                ) : (
                  <><Trash2 className="w-4 h-4 mr-1" /> Supprimer</>
                )}
              </Button>
            )}
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isMutating}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={isMutating}>
              {isSaving || isUpdating ? (
                <span className="flex items-center gap-1">
                  <span className="animate-spin rounded-full h-3 w-3 border-b border-white" /> Enregistrement...
                </span>
              ) : (
                editingEntry ? 'Mettre à jour' : 'Enregistrer'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
