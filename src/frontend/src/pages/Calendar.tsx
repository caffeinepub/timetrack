import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { DayType, type TimeEntry } from "../backend";
import {
  DayTypeCheckboxGroup,
  getDayTypeColors,
} from "../components/DayTypeCheckboxGroup";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useDeleteTimeEntry,
  useGetTimeEntries,
  useSaveTimeEntry,
  useUpdateTimeEntry,
} from "../hooks/useQueries";
import {
  computeAstreinteHours,
  computeInterventionHours,
  computeNormalHours,
  formatHours,
  formatMinutes,
} from "../utils/timeFormatting";

const DAYS_OF_WEEK = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
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

// ─── Time helpers ────────────────────────────────────────────────────────────

/** Decimal hours → { h, m } strings, e.g. 21.25 → { h:"21", m:"15" } */
function decimalToHM(decimal: string | number): { h: string; m: string } {
  const num =
    typeof decimal === "string" ? Number.parseFloat(decimal) : decimal;
  if (Number.isNaN(num) || decimal === "" || decimal === undefined)
    return { h: "", m: "" };
  const h = Math.floor(num);
  const m = Math.round((num - h) * 60);
  return { h: String(h), m: String(m).padStart(2, "0") };
}

/** { h, m } strings → decimal hours string, e.g. "21","15" → "21.25" */
function hmToDecimal(h: string, m: string): string {
  const hours = Number.parseInt(h) || 0;
  const minutes = Number.parseInt(m) || 0;
  return String(hours + minutes / 60);
}

// ─── Sub-component: paired HH + MM inputs ───────────────────────────────────

interface HMInputProps {
  value: string; // decimal string
  onChange: (v: string) => void;
  placeholderH?: string;
  placeholderM?: string;
}

function HMInput({
  value,
  onChange,
  placeholderH = "HH",
  placeholderM = "MM",
}: HMInputProps) {
  const { h, m } = decimalToHM(value);

  const handleH = (raw: string) => {
    const clamped = Math.min(23, Math.max(0, Number.parseInt(raw) || 0));
    onChange(hmToDecimal(String(clamped), m || "0"));
  };

  const handleM = (raw: string) => {
    const clamped = Math.min(59, Math.max(0, Number.parseInt(raw) || 0));
    onChange(hmToDecimal(h || "0", String(clamped)));
  };

  return (
    <div className="flex items-center gap-1">
      <Input
        type="number"
        min="0"
        max="23"
        placeholder={placeholderH}
        value={h}
        onChange={(e) => handleH(e.target.value)}
        className="w-14 text-center px-1"
      />
      <span className="text-muted-foreground font-semibold select-none">h</span>
      <Input
        type="number"
        min="0"
        max="59"
        placeholder={placeholderM}
        value={m}
        onChange={(e) => handleM(e.target.value)}
        className="w-14 text-center px-1"
      />
    </div>
  );
}

// ─── Duration (hours only, e.g. repas/trajet) ───────────────────────────────

interface DurationHMInputProps {
  value: string; // decimal string (hours)
  onChange: (v: string) => void;
  maxH?: number;
}

function DurationHMInput({ value, onChange, maxH = 24 }: DurationHMInputProps) {
  const { h, m } = decimalToHM(value);

  const handleH = (raw: string) => {
    const clamped = Math.min(maxH, Math.max(0, Number.parseInt(raw) || 0));
    onChange(hmToDecimal(String(clamped), m || "0"));
  };

  const handleM = (raw: string) => {
    const clamped = Math.min(59, Math.max(0, Number.parseInt(raw) || 0));
    onChange(hmToDecimal(h || "0", String(clamped)));
  };

  return (
    <div className="flex items-center gap-1">
      <Input
        type="number"
        min="0"
        max={maxH}
        placeholder="0"
        value={h}
        onChange={(e) => handleH(e.target.value)}
        className="w-14 text-center px-1"
      />
      <span className="text-muted-foreground font-semibold select-none">h</span>
      <Input
        type="number"
        min="0"
        max="59"
        placeholder="00"
        value={m}
        onChange={(e) => handleM(e.target.value)}
        className="w-14 text-center px-1"
      />
    </div>
  );
}

// ─── Form types ─────────────────────────────────────────────────────────────

interface InterventionSlotForm {
  startHour: string;
  startMinute: string;
  endHour: string;
  endMinute: string;
}

interface TimeEntryForm {
  startMorning: string; // decimal hours
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
  startMorning: hmToDecimal("8", "0"),
  endMorning: hmToDecimal("12", "0"),
  startAfternoon: hmToDecimal("13", "0"),
  endAfternoon: hmToDecimal("17", "0"),
  heuresRepas: hmToDecimal("1", "0"),
  heuresTrajet: "0",
  startAstreinte: "",
  endAstreinte: "",
  typeOfDay: DayType.work,
  description: "",
  interventionSlots: [],
});

// ─── Calendar helpers ────────────────────────────────────────────────────────

function getMonthDays(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = (firstDay.getDay() + 6) % 7;
  const days: (Date | null)[] = [];
  for (let i = 0; i < startDow; i++) days.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++)
    days.push(new Date(year, month, d));
  return days;
}

function dateToTimestamp(date: Date): bigint {
  const d = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    12,
    0,
    0,
    0,
  );
  return BigInt(d.getTime()) * 1_000_000n;
}

function timestampToDate(ts: bigint): Date {
  return new Date(Number(ts) / 1_000_000);
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function Calendar() {
  const { identity } = useInternetIdentity();
  const { data: allEntries = [] } = useGetTimeEntries();
  const { mutateAsync: saveEntry, isPending: isSaving } = useSaveTimeEntry();
  const { mutateAsync: updateEntry, isPending: isUpdating } =
    useUpdateTimeEntry();
  const { mutateAsync: deleteEntry, isPending: isDeleting } =
    useDeleteTimeEntry();

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

  const monthDays = useMemo(
    () => getMonthDays(viewYear, viewMonth),
    [viewYear, viewMonth],
  );

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else setViewMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else setViewMonth((m) => m + 1);
  };

  const openNewEntry = (date: Date) => {
    setSelectedDate(date);
    setEditingEntry(null);
    setForm(defaultForm());
    setDialogOpen(true);
  };

  /** Convert stored minutes (bigint) back to decimal hours string for HMInput */
  const fromMinutes = (minutes: bigint | number | undefined): string => {
    if (minutes == null) return "";
    return String(Number(minutes) / 60);
  };

  const openEditEntry = (entry: TimeEntry) => {
    setSelectedDate(timestampToDate(entry.date));
    setEditingEntry(entry);
    setForm({
      startMorning: fromMinutes(entry.startMorning),
      endMorning: fromMinutes(entry.endMorning),
      startAfternoon: fromMinutes(entry.startAfternoon),
      endAfternoon: fromMinutes(entry.endAfternoon),
      heuresRepas: fromMinutes(entry.heuresRepas),
      heuresTrajet: fromMinutes(entry.heuresTrajet),
      startAstreinte:
        entry.startAstreinte != null ? fromMinutes(entry.startAstreinte) : "",
      endAstreinte:
        entry.endAstreinte != null ? fromMinutes(entry.endAstreinte) : "",
      typeOfDay: entry.typeOfDay as DayType,
      description: entry.description,
      interventionSlots: entry.interventionSlots.map((s) => ({
        startHour: String(Number(s.startHour)),
        startMinute: String(Number(s.startMinute)),
        endHour: String(Number(s.endHour)),
        endMinute: String(Number(s.endMinute)),
      })),
    });
    setDialogOpen(true);
  };

  /** Convert a decimal hours string (e.g. "21.25") to total minutes as bigint */
  const toMinutes = (decimal: string): bigint => {
    const num = Number.parseFloat(decimal) || 0;
    return BigInt(Math.round(num * 60));
  };

  const handleSave = async () => {
    if (!selectedDate) return;
    const id =
      editingEntry?.id ??
      `entry-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const input = {
      id,
      date: dateToTimestamp(selectedDate),
      startMorning: toMinutes(form.startMorning),
      endMorning: toMinutes(form.endMorning),
      startAfternoon: toMinutes(form.startAfternoon),
      endAfternoon: toMinutes(form.endAfternoon),
      heuresRepas: toMinutes(form.heuresRepas),
      heuresTrajet: toMinutes(form.heuresTrajet),
      startAstreinte: form.startAstreinte
        ? toMinutes(form.startAstreinte)
        : undefined,
      endAstreinte: form.endAstreinte
        ? toMinutes(form.endAstreinte)
        : undefined,
      typeOfDay: form.typeOfDay,
      description: form.description,
      interventionSlots: form.interventionSlots.map((s) => ({
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
    setForm((f) => ({
      ...f,
      interventionSlots: [
        ...f.interventionSlots,
        { startHour: "8", startMinute: "0", endHour: "9", endMinute: "0" },
      ],
    }));
  };

  const removeInterventionSlot = (idx: number) => {
    setForm((f) => ({
      ...f,
      interventionSlots: f.interventionSlots.filter((_, i) => i !== idx),
    }));
  };

  const updateSlot = (
    idx: number,
    field: keyof InterventionSlotForm,
    value: string,
  ) => {
    setForm((f) => ({
      ...f,
      interventionSlots: f.interventionSlots.map((s, i) =>
        i === idx ? { ...s, [field]: value } : s,
      ),
    }));
  };

  const getDayKey = (date: Date) =>
    `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

  const isMutating = isSaving || isUpdating || isDeleting;

  // Compute display totals for form preview (all in minutes)
  const morningMin = Math.max(
    0,
    ((Number.parseFloat(form.endMorning) || 0) -
      (Number.parseFloat(form.startMorning) || 0)) *
      60,
  );
  const afternoonMin = Math.max(
    0,
    ((Number.parseFloat(form.endAfternoon) || 0) -
      (Number.parseFloat(form.startAfternoon) || 0)) *
      60,
  );
  const totalNormalMin = morningMin + afternoonMin;
  const astreinteMin =
    form.startAstreinte && form.endAstreinte
      ? Math.max(
          0,
          ((Number.parseFloat(form.endAstreinte) || 0) -
            (Number.parseFloat(form.startAstreinte) || 0)) *
            60,
        )
      : 0;

  return (
    <div className="space-y-4 pb-6">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={prevMonth}
          data-ocid="calendar.prev_month.button"
          className="p-2 rounded-lg hover:bg-muted transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
        <h2 className="text-lg font-semibold text-foreground">
          {MONTHS[viewMonth]} {viewYear}
        </h2>
        <button
          type="button"
          onClick={nextMonth}
          data-ocid="calendar.next_month.button"
          className="p-2 rounded-lg hover:bg-muted transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-foreground" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1">
        {DAYS_OF_WEEK.map((d) => (
          <div
            key={d}
            className="text-center text-xs font-medium text-muted-foreground py-1"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {monthDays.map((date, idx) => {
          if (!date) return <div key={`empty-${String(idx)}`} />;
          const key = getDayKey(date);
          const dayEntries = entriesByDay.get(key) ?? [];
          const isToday = isSameDay(date, today);
          const isSelected = selectedDate
            ? isSameDay(date, selectedDate)
            : false;

          return (
            <button
              key={key}
              type="button"
              onClick={() => openNewEntry(date)}
              data-ocid="calendar.day.button"
              className={`
                relative min-h-[52px] p-1 rounded-lg border text-left transition-all
                ${isToday ? "border-blue-500 bg-blue-50" : "border-border bg-card hover:bg-muted/50"}
                ${isSelected ? "ring-2 ring-blue-500" : ""}
              `}
            >
              <span
                className={`text-xs font-medium ${isToday ? "text-blue-600" : "text-foreground"}`}
              >
                {date.getDate()}
              </span>
              <div className="mt-0.5 space-y-0.5">
                {dayEntries.slice(0, 2).map((entry) => {
                  const minutes = computeNormalHours(entry);
                  const colors = getDayTypeColors(entry.typeOfDay);
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditEntry(entry);
                      }}
                      className={`text-[9px] leading-tight px-1 py-0.5 rounded text-white truncate w-full text-left ${colors.bg}`}
                    >
                      {formatMinutes(minutes)}
                    </button>
                  );
                })}
                {dayEntries.length > 2 && (
                  <div className="text-[9px] text-muted-foreground">
                    +{dayEntries.length - 2}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-4 flex-wrap text-xs">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-blue-600 inline-block" />
          Travail
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-emerald-600 inline-block" />
          Congé
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-orange-500 inline-block" />
          Astreinte
        </span>
      </div>

      {/* Entry list for selected month */}
      {userEntries.filter((e) => {
        const d = timestampToDate(e.date);
        return d.getFullYear() === viewYear && d.getMonth() === viewMonth;
      }).length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">
            Entrées du mois
          </h3>
          {userEntries
            .filter((e) => {
              const d = timestampToDate(e.date);
              return d.getFullYear() === viewYear && d.getMonth() === viewMonth;
            })
            .sort((a, b) => Number(a.date) - Number(b.date))
            .map((entry) => {
              const d = timestampToDate(entry.date);
              const normal = computeNormalHours(entry);
              const astreinte = computeAstreinteHours(entry);
              const intervention = computeInterventionHours(
                entry.interventionSlots,
              );
              const colors = getDayTypeColors(entry.typeOfDay);
              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => openEditEntry(entry)}
                  data-ocid="calendar.entry.row"
                  className="w-full bg-card border border-border rounded-lg p-3 flex items-center gap-3 cursor-pointer hover:bg-muted/30 transition-colors text-left"
                >
                  <div
                    className={`w-2 h-10 rounded-full flex-shrink-0 ${colors.bg}`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {d.toLocaleDateString("fr-FR", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                      {normal > 0 && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {formatMinutes(normal)}
                        </span>
                      )}
                      {astreinte > 0 && (
                        <span className="text-xs text-orange-500">
                          {formatMinutes(astreinte)} astreinte
                        </span>
                      )}
                      {intervention > 0 && (
                        <span className="text-xs text-foreground">
                          {formatMinutes(intervention)} intervention
                        </span>
                      )}
                      {Number(entry.heuresRepas) > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {formatMinutes(Number(entry.heuresRepas))} repas
                        </span>
                      )}
                      {Number(entry.heuresTrajet) > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {formatMinutes(Number(entry.heuresTrajet))} trajet
                        </span>
                      )}
                    </div>
                  </div>
                  <Edit2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </button>
              );
            })}
        </div>
      )}

      {/* Time Entry Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingEntry ? "Modifier la journée" : "Nouvelle journée"}
              {selectedDate && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  —{" "}
                  {selectedDate.toLocaleDateString("fr-FR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Day type */}
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Type de journée
              </Label>
              <DayTypeCheckboxGroup
                value={form.typeOfDay}
                onChange={(v) =>
                  setForm((f) => ({ ...f, typeOfDay: v as DayType }))
                }
              />
            </div>

            {/* Morning hours */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Matin</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">
                    Début
                  </Label>
                  <HMInput
                    value={form.startMorning}
                    onChange={(v) =>
                      setForm((f) => ({ ...f, startMorning: v }))
                    }
                    placeholderH="08"
                    placeholderM="00"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">
                    Fin
                  </Label>
                  <HMInput
                    value={form.endMorning}
                    onChange={(v) => setForm((f) => ({ ...f, endMorning: v }))}
                    placeholderH="12"
                    placeholderM="00"
                  />
                </div>
              </div>
            </div>

            {/* Afternoon hours */}
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Après-midi
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">
                    Début
                  </Label>
                  <HMInput
                    value={form.startAfternoon}
                    onChange={(v) =>
                      setForm((f) => ({ ...f, startAfternoon: v }))
                    }
                    placeholderH="13"
                    placeholderM="00"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">
                    Fin
                  </Label>
                  <HMInput
                    value={form.endAfternoon}
                    onChange={(v) =>
                      setForm((f) => ({ ...f, endAfternoon: v }))
                    }
                    placeholderH="17"
                    placeholderM="00"
                  />
                </div>
              </div>
            </div>

            {/* Total preview */}
            {totalNormalMin > 0 && (
              <p className="text-xs text-muted-foreground -mt-2">
                Total heures normales :{" "}
                <span className="font-semibold text-blue-600">
                  {formatMinutes(totalNormalMin)}
                </span>
              </p>
            )}

            {/* Repas & Trajet */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-medium mb-1 block">Repas</Label>
                <DurationHMInput
                  value={form.heuresRepas}
                  onChange={(v) => setForm((f) => ({ ...f, heuresRepas: v }))}
                />
              </div>
              <div>
                <Label className="text-sm font-medium mb-1 block">Trajet</Label>
                <DurationHMInput
                  value={form.heuresTrajet}
                  onChange={(v) => setForm((f) => ({ ...f, heuresTrajet: v }))}
                />
              </div>
            </div>

            {/* Astreinte period */}
            {form.typeOfDay === DayType.astreinte && (
              <div>
                <Label className="text-sm font-medium mb-2 block text-orange-600">
                  Période d'astreinte
                </Label>
                <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-orange-50 border border-orange-200">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">
                      Début
                    </Label>
                    <HMInput
                      value={form.startAstreinte}
                      onChange={(v) =>
                        setForm((f) => ({ ...f, startAstreinte: v }))
                      }
                      placeholderH="18"
                      placeholderM="00"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">
                      Fin
                    </Label>
                    <HMInput
                      value={form.endAstreinte}
                      onChange={(v) =>
                        setForm((f) => ({ ...f, endAstreinte: v }))
                      }
                      placeholderH="08"
                      placeholderM="00"
                    />
                  </div>
                </div>
                {astreinteMin > 0 && (
                  <p className="text-xs text-orange-600 mt-1">
                    Durée astreinte :{" "}
                    <span className="font-semibold">
                      {formatMinutes(astreinteMin)}
                    </span>
                  </p>
                )}
              </div>
            )}

            {/* Intervention slots */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">Interventions</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addInterventionSlot}
                  type="button"
                  data-ocid="calendar.add_intervention.button"
                >
                  <Plus className="w-3 h-3 mr-1" /> Ajouter
                </Button>
              </div>
              {form.interventionSlots.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Aucune intervention
                </p>
              )}
              {form.interventionSlots.map((slot, idx) => (
                <div
                  key={`slot-${String(idx)}`}
                  className="flex items-end gap-2 mb-2 p-2 bg-orange-50 border border-orange-100 rounded-lg"
                >
                  <div className="grid grid-cols-2 gap-2 flex-1">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">
                        Début (h:min)
                      </Label>
                      <div className="flex gap-1">
                        <Input
                          type="number"
                          min="0"
                          max="23"
                          placeholder="8"
                          value={slot.startHour}
                          onChange={(e) =>
                            updateSlot(idx, "startHour", e.target.value)
                          }
                          className="w-14 text-center px-1"
                        />
                        <span className="self-center text-muted-foreground font-semibold">
                          h
                        </span>
                        <Input
                          type="number"
                          min="0"
                          max="59"
                          placeholder="00"
                          value={slot.startMinute}
                          onChange={(e) =>
                            updateSlot(idx, "startMinute", e.target.value)
                          }
                          className="w-14 text-center px-1"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">
                        Fin (h:min)
                      </Label>
                      <div className="flex gap-1">
                        <Input
                          type="number"
                          min="0"
                          max="23"
                          placeholder="9"
                          value={slot.endHour}
                          onChange={(e) =>
                            updateSlot(idx, "endHour", e.target.value)
                          }
                          className="w-14 text-center px-1"
                        />
                        <span className="self-center text-muted-foreground font-semibold">
                          h
                        </span>
                        <Input
                          type="number"
                          min="0"
                          max="59"
                          placeholder="00"
                          value={slot.endMinute}
                          onChange={(e) =>
                            updateSlot(idx, "endMinute", e.target.value)
                          }
                          className="w-14 text-center px-1"
                        />
                      </div>
                    </div>
                  </div>
                  {/* Duration preview */}
                  <div className="text-xs text-orange-600 font-medium self-center min-w-[40px]">
                    {(() => {
                      const startTotal =
                        (Number(slot.startHour) || 0) * 60 +
                        (Number(slot.startMinute) || 0);
                      const endTotal =
                        (Number(slot.endHour) || 0) * 60 +
                        (Number(slot.endMinute) || 0);
                      const diff = endTotal - startTotal;
                      return diff > 0 ? formatHours(diff / 60) : "";
                    })()}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeInterventionSlot(idx)}
                    data-ocid="calendar.remove_intervention.button"
                    className="p-1 text-destructive hover:bg-destructive/10 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Description */}
            <div>
              <Label className="text-sm font-medium mb-1 block">
                Description
              </Label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Notes sur la journée..."
                rows={2}
                data-ocid="calendar.description.textarea"
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
                data-ocid="calendar.delete_entry.delete_button"
              >
                {isDeleting ? (
                  <span className="flex items-center gap-1">
                    <span className="animate-spin rounded-full h-3 w-3 border-b border-white" />{" "}
                    Suppression...
                  </span>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-1" /> Supprimer
                  </>
                )}
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={isMutating}
              data-ocid="calendar.cancel_entry.cancel_button"
            >
              Annuler
            </Button>
            <Button
              onClick={handleSave}
              disabled={isMutating}
              data-ocid="calendar.save_entry.save_button"
            >
              {isSaving || isUpdating ? (
                <span className="flex items-center gap-1">
                  <span className="animate-spin rounded-full h-3 w-3 border-b border-white" />{" "}
                  Enregistrement...
                </span>
              ) : editingEntry ? (
                "Mettre à jour"
              ) : (
                "Enregistrer"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
