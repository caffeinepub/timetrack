import { useState, useCallback } from 'react';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useGetTimeEntries, useSaveTimeEntry, useUpdateTimeEntry, useDeleteTimeEntry } from '../hooks/useQueries';
import { DayType, TimeEntry, InterventionSlot } from '../backend';
import { DayTypeCheckboxGroup } from '../components/DayTypeCheckboxGroup';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, Plus, Trash2, Clock } from 'lucide-react';

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

const defaultForm: TimeEntryForm = {
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
};

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

function dateToTimestamp(year: number, month: number, day: number): bigint {
  return BigInt(new Date(year, month, day, 12, 0, 0).getTime()) * 1_000_000n;
}

function timestampToDate(ts: bigint): { year: number; month: number; day: number } {
  const ms = Number(ts / 1_000_000n);
  const d = new Date(ms);
  return { year: d.getFullYear(), month: d.getMonth(), day: d.getDate() };
}

function formatDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function entryToFormKey(entry: TimeEntry): string {
  const { year, month, day } = timestampToDate(entry.date);
  return formatDateKey(year, month, day);
}

function calcInterventionMinutes(slots: InterventionSlotForm[]): number {
  return slots.reduce((acc, s) => {
    const start = parseInt(s.startHour || '0') * 60 + parseInt(s.startMinute || '0');
    const end = parseInt(s.endHour || '0') * 60 + parseInt(s.endMinute || '0');
    return acc + Math.max(0, end - start);
  }, 0);
}

export default function Calendar() {
  const { identity } = useInternetIdentity();
  const { data: timeEntries = [] } = useGetTimeEntries();
  const saveEntry = useSaveTimeEntry();
  const updateEntry = useUpdateTimeEntry();
  const deleteEntry = useDeleteTimeEntry();

  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<TimeEntryForm>(defaultForm);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Build a map from date key to entry
  const entryMap = new Map<string, TimeEntry>();
  for (const entry of timeEntries) {
    entryMap.set(entryToFormKey(entry), entry);
  }

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  const prevMonth = useCallback(() => {
    setCurrentMonth(m => {
      if (m === 0) { setCurrentYear(y => y - 1); return 11; }
      return m - 1;
    });
  }, []);

  const nextMonth = useCallback(() => {
    setCurrentMonth(m => {
      if (m === 11) { setCurrentYear(y => y + 1); return 0; }
      return m + 1;
    });
  }, []);

  const openDay = (day: number) => {
    setSelectedDay(day);
    const key = formatDateKey(currentYear, currentMonth, day);
    const existing = entryMap.get(key);
    if (existing) {
      setEditingEntryId(existing.id);
      setForm({
        startMorning: existing.startMorning.toString(),
        endMorning: existing.endMorning.toString(),
        startAfternoon: existing.startAfternoon.toString(),
        endAfternoon: existing.endAfternoon.toString(),
        heuresRepas: existing.heuresRepas.toString(),
        heuresTrajet: existing.heuresTrajet.toString(),
        startAstreinte: existing.startAstreinte != null ? existing.startAstreinte.toString() : '',
        endAstreinte: existing.endAstreinte != null ? existing.endAstreinte.toString() : '',
        typeOfDay: existing.typeOfDay,
        description: existing.description,
        interventionSlots: (existing.interventionSlots || []).map(s => ({
          startHour: s.startHour.toString(),
          startMinute: s.startMinute.toString(),
          endHour: s.endHour.toString(),
          endMinute: s.endMinute.toString(),
        })),
      });
    } else {
      setEditingEntryId(null);
      setForm(defaultForm);
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!identity || selectedDay === null) return;
    setIsSaving(true);
    try {
      const ts = dateToTimestamp(currentYear, currentMonth, selectedDay);
      const id = editingEntryId || `${identity.getPrincipal().toString()}-${formatDateKey(currentYear, currentMonth, selectedDay)}`;

      const slots: InterventionSlot[] = form.interventionSlots.map(s => ({
        startHour: BigInt(parseInt(s.startHour || '0')),
        startMinute: BigInt(parseInt(s.startMinute || '0')),
        endHour: BigInt(parseInt(s.endHour || '0')),
        endMinute: BigInt(parseInt(s.endMinute || '0')),
      }));

      const input = {
        id,
        date: ts,
        startMorning: BigInt(parseInt(form.startMorning || '0')),
        endMorning: BigInt(parseInt(form.endMorning || '0')),
        startAfternoon: BigInt(parseInt(form.startAfternoon || '0')),
        endAfternoon: BigInt(parseInt(form.endAfternoon || '0')),
        heuresRepas: BigInt(parseInt(form.heuresRepas || '0')),
        heuresTrajet: BigInt(parseInt(form.heuresTrajet || '0')),
        startAstreinte: form.startAstreinte !== '' ? BigInt(parseInt(form.startAstreinte)) : undefined,
        endAstreinte: form.endAstreinte !== '' ? BigInt(parseInt(form.endAstreinte)) : undefined,
        typeOfDay: form.typeOfDay,
        description: form.description,
        interventionSlots: slots,
      };

      if (editingEntryId) {
        await updateEntry.mutateAsync({ id: editingEntryId, input });
      } else {
        await saveEntry.mutateAsync(input);
      }
      setDialogOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingEntryId) return;
    setIsDeleting(true);
    try {
      await deleteEntry.mutateAsync(editingEntryId);
      setDialogOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const addInterventionSlot = () => {
    setForm(f => ({
      ...f,
      interventionSlots: [...f.interventionSlots, { startHour: '0', startMinute: '0', endHour: '1', endMinute: '0' }],
    }));
  };

  const removeInterventionSlot = (idx: number) => {
    setForm(f => ({
      ...f,
      interventionSlots: f.interventionSlots.filter((_, i) => i !== idx),
    }));
  };

  const updateSlot = (idx: number, field: keyof InterventionSlotForm, value: string) => {
    setForm(f => ({
      ...f,
      interventionSlots: f.interventionSlots.map((s, i) => i === idx ? { ...s, [field]: value } : s),
    }));
  };

  const totalInterventionMin = calcInterventionMinutes(form.interventionSlots);
  const interventionHours = Math.floor(totalInterventionMin / 60);
  const interventionMins = totalInterventionMin % 60;

  // Calendar grid
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const getDayType = (day: number): DayType | null => {
    const key = formatDateKey(currentYear, currentMonth, day);
    return entryMap.get(key)?.typeOfDay ?? null;
  };

  const getDayColor = (dayType: DayType | null) => {
    if (dayType === DayType.work) return 'bg-primary/20 border-primary/40';
    if (dayType === DayType.astreinte) return 'bg-accent/20 border-accent/40';
    if (dayType === DayType.conge) return 'bg-success/20 border-success/40';
    return '';
  };

  const isToday = (day: number) =>
    day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();

  const hasInterventions = (day: number): boolean => {
    const key = formatDateKey(currentYear, currentMonth, day);
    const entry = entryMap.get(key);
    return !!(entry?.interventionSlots && entry.interventionSlots.length > 0);
  };

  return (
    <div className="max-w-2xl mx-auto px-2 sm:px-4 py-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon" onClick={prevMonth}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2">
          <select
            className="bg-background border border-border rounded px-2 py-1 text-sm font-semibold"
            value={currentMonth}
            onChange={e => setCurrentMonth(Number(e.target.value))}
          >
            {MONTHS_FR.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <select
            className="bg-background border border-border rounded px-2 py-1 text-sm font-semibold"
            value={currentYear}
            onChange={e => setCurrentYear(Number(e.target.value))}
          >
            {Array.from({ length: 10 }, (_, i) => today.getFullYear() - 5 + i).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <Button variant="ghost" size="icon" onClick={nextMonth}>
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS_FR.map(d => (
          <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-1">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, idx) => {
          if (day === null) return <div key={`empty-${idx}`} />;
          const dayType = getDayType(day);
          const colorClass = getDayColor(dayType);
          const todayClass = isToday(day) ? 'ring-2 ring-primary' : '';
          const hasSlots = hasInterventions(day);
          return (
            <button
              key={day}
              onClick={() => openDay(day)}
              className={`relative aspect-square rounded-lg border text-sm font-medium flex flex-col items-center justify-center transition-all hover:opacity-80 active:scale-95 ${colorClass || 'border-border hover:bg-muted'} ${todayClass}`}
            >
              <span>{day}</span>
              {hasSlots && (
                <span className="absolute bottom-1 right-1 w-2 h-2 rounded-full bg-accent" title="Interventions astreinte" />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-primary/30 inline-block" /> Travail</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-accent/30 inline-block" /> Astreinte</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-success/30 inline-block" /> Congé</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-accent inline-block" /> Interventions</span>
      </div>

      {/* Time entry dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedDay ? `${selectedDay} ${MONTHS_FR[currentMonth]} ${currentYear}` : 'Journée'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Day type */}
            <div>
              <Label className="text-sm font-semibold mb-2 block">Type de journée</Label>
              <DayTypeCheckboxGroup
                value={form.typeOfDay}
                onChange={v => setForm(f => ({ ...f, typeOfDay: v }))}
              />
            </div>

            {/* Regular workday hours */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold block text-foreground">Heures de travail</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Début matin</Label>
                  <Input
                    type="number"
                    min="0" max="24"
                    value={form.startMorning}
                    onChange={e => setForm(f => ({ ...f, startMorning: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Fin matin</Label>
                  <Input
                    type="number"
                    min="0" max="24"
                    value={form.endMorning}
                    onChange={e => setForm(f => ({ ...f, endMorning: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Début après-midi</Label>
                  <Input
                    type="number"
                    min="0" max="24"
                    value={form.startAfternoon}
                    onChange={e => setForm(f => ({ ...f, startAfternoon: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Fin après-midi</Label>
                  <Input
                    type="number"
                    min="0" max="24"
                    value={form.endAfternoon}
                    onChange={e => setForm(f => ({ ...f, endAfternoon: e.target.value }))}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {/* On-call period */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold block text-foreground">Période d'astreinte</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Début astreinte (h)</Label>
                  <Input
                    type="number"
                    min="0" max="24"
                    placeholder="ex: 18"
                    value={form.startAstreinte}
                    onChange={e => setForm(f => ({ ...f, startAstreinte: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Fin astreinte (h)</Label>
                  <Input
                    type="number"
                    min="0" max="24"
                    placeholder="ex: 8"
                    value={form.endAstreinte}
                    onChange={e => setForm(f => ({ ...f, endAstreinte: e.target.value }))}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Intervention slots */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4 text-accent" />
                  Interventions durant l'astreinte
                  {form.interventionSlots.length > 0 && (
                    <span className="text-xs font-normal text-muted-foreground ml-1">
                      ({interventionHours}h{interventionMins > 0 ? `${String(interventionMins).padStart(2, '0')}` : ''} total)
                    </span>
                  )}
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addInterventionSlot}
                  className="flex items-center gap-1 text-xs"
                >
                  <Plus className="w-3 h-3" />
                  Ajouter
                </Button>
              </div>

              {form.interventionSlots.length === 0 && (
                <p className="text-xs text-muted-foreground italic">
                  Aucune intervention. Cliquez sur "Ajouter" pour saisir les heures précises d'intervention.
                </p>
              )}

              <div className="space-y-2">
                {form.interventionSlots.map((slot, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-accent/10 border border-accent/20">
                    <span className="text-xs text-muted-foreground w-4 shrink-0">{idx + 1}.</span>
                    <div className="flex items-center gap-1 flex-1">
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min="0" max="23"
                          value={slot.startHour}
                          onChange={e => updateSlot(idx, 'startHour', e.target.value)}
                          className="w-12 text-center px-1 text-sm h-8"
                          placeholder="H"
                        />
                        <span className="text-muted-foreground text-xs">:</span>
                        <Input
                          type="number"
                          min="0" max="59"
                          value={slot.startMinute}
                          onChange={e => updateSlot(idx, 'startMinute', e.target.value)}
                          className="w-12 text-center px-1 text-sm h-8"
                          placeholder="MM"
                        />
                      </div>
                      <span className="text-muted-foreground text-xs mx-1">→</span>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min="0" max="23"
                          value={slot.endHour}
                          onChange={e => updateSlot(idx, 'endHour', e.target.value)}
                          className="w-12 text-center px-1 text-sm h-8"
                          placeholder="H"
                        />
                        <span className="text-muted-foreground text-xs">:</span>
                        <Input
                          type="number"
                          min="0" max="59"
                          value={slot.endMinute}
                          onChange={e => updateSlot(idx, 'endMinute', e.target.value)}
                          className="w-12 text-center px-1 text-sm h-8"
                          placeholder="MM"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeInterventionSlot(idx)}
                      className="text-destructive hover:text-destructive/80 p-1 rounded shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Repas & Trajet */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Heures repas</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.heuresRepas}
                  onChange={e => setForm(f => ({ ...f, heuresRepas: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Heures trajet</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.heuresTrajet}
                  onChange={e => setForm(f => ({ ...f, heuresTrajet: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <Label className="text-xs text-muted-foreground">Description</Label>
              <Input
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Notes sur la journée..."
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2 flex-row justify-between">
            {editingEntryId && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting || isSaving}
              >
                {isDeleting ? 'Suppression...' : 'Supprimer'}
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>
                Annuler
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isSaving || isDeleting}>
                {isSaving ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
