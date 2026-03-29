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
import { useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit2,
  Plus,
  Search,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { DayType, type TimeEntry } from "../backend";
import {
  DayTypeCheckboxGroup,
  getDayTypeColors,
} from "../components/DayTypeCheckboxGroup";
import { VoiceInput } from "../components/VoiceInput";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useDeleteTimeEntry,
  useGetAllProfiles,
  useGetTimeEntries,
  useSaveTimeEntry,
  useUpdateTimeEntry,
} from "../hooks/useQueries";
import {
  computeAstreinteHours,
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

interface HMInputProps {
  value: string;
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

interface DurationHMInputProps {
  value: string;
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

interface TimeEntryForm {
  startMorning: string;
  endMorning: string;
  startAfternoon: string;
  endAfternoon: string;
  heuresRepas: string;
  heuresTrajet: string;
  astreinteSlots: { debut: string; fin: string }[];
  typeOfDay: DayType;
  description: string;
}

const defaultForm = (): TimeEntryForm => ({
  startMorning: hmToDecimal("8", "0"),
  endMorning: hmToDecimal("12", "0"),
  startAfternoon: hmToDecimal("13", "0"),
  endAfternoon: hmToDecimal("17", "0"),
  heuresRepas: hmToDecimal("1", "0"),
  heuresTrajet: "0",
  astreinteSlots: [],
  typeOfDay: DayType.work,
  description: "",
});

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

export default function Calendar({ readOnly = false }: { readOnly?: boolean }) {
  const { identity } = useInternetIdentity();
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const { data: allEntries = [] } = useGetTimeEntries();
  useSaveTimeEntry();
  useUpdateTimeEntry();
  const { mutateAsync: deleteEntry, isPending: isDeleting } =
    useDeleteTimeEntry();
  const { data: allProfiles = [] } = useGetAllProfiles();

  const myPrincipal = identity?.getPrincipal().toString() ?? "";
  const [selectedProfilePrincipal, setSelectedProfilePrincipal] =
    useState<string>("");
  const [profileSearch, setProfileSearch] = useState("");
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [form, setForm] = useState<TimeEntryForm>(defaultForm());

  // Default to own profile once identity is loaded
  useEffect(() => {
    if (myPrincipal && !selectedProfilePrincipal) {
      setSelectedProfilePrincipal(myPrincipal);
    }
  }, [myPrincipal, selectedProfilePrincipal]);

  const isOwnCalendar =
    !selectedProfilePrincipal || selectedProfilePrincipal === myPrincipal;

  const selectedProfileName = useMemo(() => {
    if (!selectedProfilePrincipal || selectedProfilePrincipal === myPrincipal)
      return null;
    const found = allProfiles.find(
      ([p]) => p.toString() === selectedProfilePrincipal,
    );
    return found ? (found[1] as any).name || "Utilisateur" : "Utilisateur";
  }, [selectedProfilePrincipal, myPrincipal, allProfiles]);

  const filteredProfiles = useMemo(() => {
    return allProfiles.filter(([_p, profile]) => {
      const name = (profile as any).name || "";
      return name.toLowerCase().includes(profileSearch.toLowerCase());
    });
  }, [allProfiles, profileSearch]);

  const userEntries = useMemo(() => {
    if (!selectedProfilePrincipal) return [];
    return allEntries.filter(
      (e) => e.user.toString() === selectedProfilePrincipal,
    );
  }, [allEntries, selectedProfilePrincipal]);

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
      astreinteSlots: (() => {
        const slots: { debut: string; fin: string }[] = [];
        if (entry.startAstreinte != null && entry.endAstreinte != null) {
          slots.push({
            debut: fromMinutes(entry.startAstreinte),
            fin: fromMinutes(entry.endAstreinte),
          });
        }
        // Parse additional slots from description
        const match = entry.description.match(/\[Plages astreinte: ([^\]]+)\]/);
        if (match) {
          const parts = match[1].split(",").slice(1);
          for (const part of parts) {
            const [d, fi] = part.trim().split("-");
            if (d && fi) slots.push({ debut: d.trim(), fin: fi.trim() });
          }
        }
        return slots;
      })(),
      typeOfDay: entry.typeOfDay as DayType,
      description: entry.description,
    });
    setDialogOpen(true);
  };

  const toMinutes = (decimal: string): bigint => {
    const num = Number.parseFloat(decimal) || 0;
    return BigInt(Math.round(num * 60));
  };

  const handleSave = async () => {
    if (!selectedDate) return;
    // Check actor availability upfront before attempting any save
    if (!actor) {
      toast.error("Connexion requise. Veuillez vous connecter.");
      return;
    }
    try {
      const id =
        editingEntry?.id ??
        `entry-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const input = {
        id,
        date: dateToTimestamp(selectedDate),
        startMorning:
          form.typeOfDay === DayType.astreinte &&
          [0, 6].includes(selectedDate.getDay())
            ? BigInt(0)
            : toMinutes(form.startMorning),
        endMorning:
          form.typeOfDay === DayType.astreinte &&
          [0, 6].includes(selectedDate.getDay())
            ? BigInt(0)
            : toMinutes(form.endMorning),
        startAfternoon:
          form.typeOfDay === DayType.astreinte &&
          [0, 6].includes(selectedDate.getDay())
            ? BigInt(0)
            : toMinutes(form.startAfternoon),
        endAfternoon:
          form.typeOfDay === DayType.astreinte &&
          [0, 6].includes(selectedDate.getDay())
            ? BigInt(0)
            : toMinutes(form.endAfternoon),
        heuresRepas: toMinutes(form.heuresRepas),
        heuresTrajet: toMinutes(form.heuresTrajet),
        startAstreinte: form.astreinteSlots[0]?.debut
          ? toMinutes(form.astreinteSlots[0].debut)
          : undefined,
        endAstreinte: form.astreinteSlots[0]?.fin
          ? toMinutes(form.astreinteSlots[0].fin)
          : undefined,
        typeOfDay: form.typeOfDay,
        description: (() => {
          let desc = form.description
            .replace(/\s*\[Plages astreinte:[^\]]*\]/g, "")
            .trim();
          if (form.astreinteSlots.length > 1) {
            const slotsStr = form.astreinteSlots
              .map((s) => `${s.debut}-${s.fin}`)
              .join(", ");
            desc = desc
              ? `${desc}\n[Plages astreinte: ${slotsStr}]`
              : `[Plages astreinte: ${slotsStr}]`;
          }
          return desc;
        })(),
        interventionSlots: [],
      };

      // Use actor directly (bypass React Query) for reliable upsert
      await actor.enregistrerJournee(input);

      // Refresh the entries list after saving
      queryClient.invalidateQueries({ queryKey: ["timeEntries"] });
      queryClient.invalidateQueries({ queryKey: ["facturationInterventions"] });
      queryClient.invalidateQueries({ queryKey: ["clientsInterventions"] });

      toast.success(
        editingEntry ? "Journée mise à jour" : "Journée enregistrée",
      );
      setDialogOpen(false);
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      toast.error(`Erreur lors de l'enregistrement. (${errMsg})`);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      // Delete all associated interventions first (they are stored separately by date)
      if (actor && editingEntry) {
        try {
          const interventions = await (
            actor as any
          ).obtenirInterventionsPourJour(editingEntry.date);
          for (const intv of interventions) {
            try {
              await (actor as any).supprimerIntervention(intv.id);
            } catch (_e) {
              // ignore individual intervention deletion errors
            }
          }
        } catch (_e) {
          // ignore if fetch fails
        }
      }
      await deleteEntry(id);
      queryClient.invalidateQueries({ queryKey: ["facturationInterventions"] });
      queryClient.invalidateQueries({ queryKey: ["clientsInterventions"] });
      toast.success("Journée supprimée");
      setDialogOpen(false);
    } catch (e) {
      toast.error(
        `Erreur lors de la suppression : ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  };

  const getDayKey = (date: Date) =>
    `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

  const isSaving = false;
  const isUpdating = false;
  const isMutating = isSaving || isUpdating || isDeleting;

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
  const isWeekend = selectedDate
    ? [0, 6].includes(selectedDate.getDay())
    : false;
  const isAstreinteWeekend = form.typeOfDay === DayType.astreinte && isWeekend;
  const isAstreinteWeekday = form.typeOfDay === DayType.astreinte && !isWeekend;
  const astreinteMin = form.astreinteSlots.reduce((acc, slot) => {
    if (!slot.debut || !slot.fin) return acc;
    const dur = Math.max(
      0,
      ((Number.parseFloat(slot.fin) || 0) -
        (Number.parseFloat(slot.debut) || 0)) *
        60,
    );
    return acc + dur;
  }, 0);

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
    <div className="space-y-4 pb-6">
      {readOnlyBanner}
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
        <h2 className="text-lg font-semibold text-vts-green">
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

      {/* Profile selector */}
      <div className="relative">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card">
          <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <input
            type="text"
            placeholder="Rechercher un profil..."
            value={profileSearch}
            onChange={(e) => setProfileSearch(e.target.value)}
            onFocus={() => setShowProfileDropdown(true)}
            className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground"
          />
        </div>
        {showProfileDropdown && (
          <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {/* Own profile first */}
            <button
              type="button"
              onClick={() => {
                setSelectedProfilePrincipal(myPrincipal);
                setProfileSearch("");
                setShowProfileDropdown(false);
              }}
              className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-muted transition-colors ${selectedProfilePrincipal === myPrincipal ? "bg-vts-navy text-white" : ""}`}
            >
              <span className="flex-1">Mon calendrier</span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-vts-orange text-white">
                Moi
              </span>
            </button>
            {filteredProfiles
              .filter(([p]) => p.toString() !== myPrincipal)
              .map(([principal, profile]) => (
                <button
                  key={principal.toString()}
                  type="button"
                  onClick={() => {
                    setSelectedProfilePrincipal(principal.toString());
                    setProfileSearch("");
                    setShowProfileDropdown(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors ${selectedProfilePrincipal === principal.toString() ? "bg-vts-navy text-white" : ""}`}
                >
                  {(profile as any).name || "Utilisateur"}
                </button>
              ))}
            {filteredProfiles.filter(([p]) => p.toString() !== myPrincipal)
              .length === 0 &&
              filteredProfiles.length <= 1 && (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  Aucun profil trouvé
                </div>
              )}
          </div>
        )}
        {showProfileDropdown && (
          <button
            type="button"
            className="fixed inset-0 z-40"
            onClick={() => setShowProfileDropdown(false)}
            aria-label="Fermer le sélecteur de profil"
          />
        )}
      </div>

      {/* Read-only banner */}
      {!isOwnCalendar && selectedProfileName && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-vts-navy text-white text-sm">
          <span>👁️</span>
          <span>
            Calendrier de <strong>{selectedProfileName}</strong> — Lecture seule
          </span>
        </div>
      )}

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
              onClick={() => isOwnCalendar && openNewEntry(date)}
              data-ocid="calendar.day.button"
              className={`
                relative min-h-[52px] p-1 rounded-lg border text-left transition-all
                ${isOwnCalendar ? "" : "cursor-default"}
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
                        if (isOwnCalendar) openEditEntry(entry);
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
              const colors = getDayTypeColors(entry.typeOfDay);
              return (
                <div
                  key={entry.id}
                  className="bg-card border border-border rounded-lg overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => openEditEntry(entry)}
                    data-ocid="calendar.entry.row"
                    className="w-full p-3 flex items-center gap-3 cursor-pointer hover:bg-muted/30 transition-colors text-left"
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
                            <Clock className="w-3 h-3" />{" "}
                            {formatMinutes(normal)}
                          </span>
                        )}
                        {astreinte > 0 && (
                          <span className="text-xs text-orange-500">
                            {formatMinutes(astreinte)} astreinte
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
            {!(form.typeOfDay === DayType.astreinte && isWeekend) && (
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
                      onChange={(v) =>
                        setForm((f) => ({ ...f, endMorning: v }))
                      }
                      placeholderH="12"
                      placeholderM="00"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Afternoon hours */}
            {!(form.typeOfDay === DayType.astreinte && isWeekend) && (
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
            )}

            {/* Total preview */}
            {!(form.typeOfDay === DayType.astreinte && isWeekend) &&
              totalNormalMin > 0 && (
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

            {/* Plages astreinte - multiple slots */}
            {form.typeOfDay === DayType.astreinte && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium text-orange-600">
                    Plages astreinte
                  </Label>
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    data-ocid="calendar.add_plage_astreinte.button"
                    className="h-7 px-2 text-xs border-orange-300 text-orange-700 hover:bg-orange-50"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        astreinteSlots: [
                          ...f.astreinteSlots,
                          { debut: "0", fin: "0" },
                        ],
                      }))
                    }
                  >
                    <Plus className="w-3 h-3 mr-1" /> Ajouter plage
                  </Button>
                </div>
                {form.astreinteSlots.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">
                    Aucune plage — cliquez sur &laquo; Ajouter plage &raquo;
                  </p>
                )}
                <div className="space-y-2">
                  {form.astreinteSlots.map((slot, si) => (
                    <div
                      key={`astreinte-slot-${String(si)}`}
                      className="flex items-end gap-2 p-2 rounded-lg bg-orange-50 border border-orange-200"
                    >
                      <div className="flex-1">
                        <Label className="text-xs text-muted-foreground mb-1 block">
                          Début
                        </Label>
                        <HMInput
                          value={slot.debut}
                          onChange={(v) =>
                            setForm((f) => ({
                              ...f,
                              astreinteSlots: f.astreinteSlots.map((s, i) =>
                                i === si ? { ...s, debut: v } : s,
                              ),
                            }))
                          }
                          placeholderH="18"
                          placeholderM="00"
                        />
                      </div>
                      <div className="flex-1">
                        <Label className="text-xs text-muted-foreground mb-1 block">
                          Fin
                        </Label>
                        <HMInput
                          value={slot.fin}
                          onChange={(v) =>
                            setForm((f) => ({
                              ...f,
                              astreinteSlots: f.astreinteSlots.map((s, i) =>
                                i === si ? { ...s, fin: v } : s,
                              ),
                            }))
                          }
                          placeholderH="08"
                          placeholderM="00"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            astreinteSlots: f.astreinteSlots.filter(
                              (_, i) => i !== si,
                            ),
                          }))
                        }
                        className="p-1 text-destructive hover:bg-destructive/10 rounded mb-0.5"
                        aria-label="Supprimer plage"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                {astreinteMin > 0 && (
                  <p className="text-xs text-orange-600 mt-1">
                    Total astreinte :{" "}
                    <span className="font-semibold">
                      {formatMinutes(astreinteMin)}
                    </span>
                  </p>
                )}
                {isAstreinteWeekday &&
                  (totalNormalMin > 0 || astreinteMin > 0) && (
                    <p className="text-xs text-blue-700 font-semibold mt-1 bg-blue-50 rounded px-2 py-1">
                      Total comptabilisé (Travail + Astreinte) :{" "}
                      {formatMinutes(totalNormalMin + astreinteMin)}
                    </p>
                  )}
                {isAstreinteWeekend && astreinteMin > 0 && (
                  <p className="text-xs text-orange-700 font-semibold mt-1 bg-orange-50 rounded px-2 py-1">
                    Weekend — Total astreinte : {formatMinutes(astreinteMin)}
                  </p>
                )}
                {isAstreinteWeekend && (
                  <p className="text-xs text-orange-500 mt-1 italic">
                    Weekend : seules les heures d&apos;astreinte sont
                    comptabilisées.
                  </p>
                )}
              </div>
            )}

            {/* Description */}
            <div>
              <Label className="text-sm font-medium mb-1 block">
                Description
              </Label>
              <div className="flex items-start gap-1">
                <Textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  placeholder="Notes sur la journée..."
                  rows={2}
                  className="flex-1"
                  data-ocid="calendar.description.textarea"
                />
                <VoiceInput
                  value={form.description}
                  onChange={(val) =>
                    setForm((f) => ({ ...f, description: val }))
                  }
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="flex gap-2 mt-4">
            {editingEntry && isOwnCalendar && (
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
                    <X className="w-4 h-4 mr-1" /> Supprimer
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
