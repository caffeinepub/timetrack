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
  Image as ImageIcon,
  Plus,
  Video,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { DayType, ExternalBlob, type TimeEntry } from "../backend";
import {
  DayTypeCheckboxGroup,
  getDayTypeColors,
} from "../components/DayTypeCheckboxGroup";
import MediaViewer, { type MediaItem } from "../components/MediaViewer";
import { SignaturePad } from "../components/SignaturePad";
import { VoiceInput } from "../components/VoiceInput";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useDeleteTimeEntry,
  useGetClients,
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

function getBlobUrl(blob: any): string {
  if (!blob) return "";
  if (typeof blob.getDirectURL === "function") return blob.getDirectURL();
  if (typeof blob.directURL === "string") return blob.directURL;
  return "";
}

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

interface PieceLigne {
  reference: string;
  article: string;
  quantite: string;
}

interface InterventionSlotForm {
  // Fiche fields
  ficheId: string;
  clientNom: string;
  clientAdresse: string;
  matinDebutH: string;
  matinDebutMin: string;
  matinFinH: string;
  matinFinMin: string;
  apremDebutH: string;
  apremDebutMin: string;
  apremFinH: string;
  apremFinMin: string;
  ficheDescription: string;
  signatureClient: string;
  signatureIntervenant: string;
  piecesLignes: PieceLigne[];
  photos: ExternalBlob[];
  photoUrls: string[];
  videos: ExternalBlob[];
  videoUrls: string[];
  estAstreinte: boolean;
  clientAbsent: boolean;
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
  interventionSlots: InterventionSlotForm[];
}

const defaultSlot = (): InterventionSlotForm => ({
  ficheId: "",
  clientNom: "",
  clientAdresse: "",
  matinDebutH: "",
  matinDebutMin: "",
  matinFinH: "",
  matinFinMin: "",
  apremDebutH: "",
  apremDebutMin: "",
  apremFinH: "",
  apremFinMin: "",
  ficheDescription: "",
  signatureClient: "",
  signatureIntervenant: "",
  piecesLignes: [],
  photos: [],
  photoUrls: [],
  videos: [],
  videoUrls: [],
  estAstreinte: false,
  clientAbsent: false,
});

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
  interventionSlots: [],
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

// Client autocomplete dropdown component
interface ClientAutocompleteProps {
  value: string;
  onChange: (nom: string, adresse?: string) => void;
  clients: import("../backend").Client[];
}

function ClientAutocomplete({
  value,
  onChange,
  clients,
}: ClientAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered =
    value.length > 0
      ? clients.filter(
          (c) =>
            c.nom.toLowerCase().includes(value.toLowerCase()) && !c.listeNoire,
        )
      : [];

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Nom du client"
        className="text-sm"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-border rounded-lg shadow-lg max-h-40 overflow-y-auto">
          {filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
              onMouseDown={() => {
                onChange(c.nom, c.adresse);
                setOpen(false);
              }}
            >
              <span className="font-medium">{c.nom}</span>
              {c.adresse && (
                <span className="text-xs text-muted-foreground ml-2">
                  {c.adresse}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Calendar() {
  const { identity } = useInternetIdentity();
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const { data: allEntries = [] } = useGetTimeEntries();
  useSaveTimeEntry();
  useUpdateTimeEntry();
  const { mutateAsync: deleteEntry, isPending: isDeleting } =
    useDeleteTimeEntry();
  const { data: clients = [] } = useGetClients();

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mediaViewer, setMediaViewer] = useState<{
    items: MediaItem[];
    index: number;
  } | null>(null);
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

  const fromMinutes = (minutes: bigint | number | undefined): string => {
    if (minutes == null) return "";
    return String(Number(minutes) / 60);
  };

  const openEditEntry = async (entry: TimeEntry) => {
    setSelectedDate(timestampToDate(entry.date));
    setEditingEntry(entry);
    const baseSlots: InterventionSlotForm[] = entry.interventionSlots.map(
      (_s) => ({
        ...defaultSlot(),
      }),
    );
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
      interventionSlots: baseSlots,
    });
    setDialogOpen(true);
    // Load saved interventions for this day
    if (actor && baseSlots.length > 0) {
      try {
        const interventions = await (actor as any).obtenirInterventionsPourJour(
          entry.date,
        );
        // Build slots directly from backend records (do NOT map by index — backend order is not guaranteed)
        if (interventions.length > 0) {
          setForm((f) => ({
            ...f,
            interventionSlots: interventions.map((intv: any) => ({
              ...defaultSlot(),
              ficheId: intv.id,
              clientNom: intv.clientNom,
              clientAdresse: intv.clientAdresse,
              matinDebutH: String(Number(intv.heureMatinDebutH)),
              matinDebutMin: String(Number(intv.heureMatinDebutMin)),
              matinFinH: String(Number(intv.heureMatinFinH)),
              matinFinMin: String(Number(intv.heureMatinFinMin)),
              apremDebutH: String(Number(intv.heureApremDebutH)),
              apremDebutMin: String(Number(intv.heureApremDebutMin)),
              apremFinH: String(Number(intv.heureApremFinH)),
              apremFinMin: String(Number(intv.heureApremFinMin)),
              ficheDescription: intv.description,
              signatureClient: intv.signatureClient,
              signatureIntervenant: intv.signatureIntervenant,
              piecesLignes: Array.isArray(intv.pieces)
                ? intv.pieces.map((p: any) => ({
                    reference: p.reference ?? "",
                    article: p.article ?? "",
                    quantite: String(Number(p.quantite ?? 0)),
                  }))
                : [],
              photos: Array.isArray(intv.photos) ? intv.photos : [],
              photoUrls: Array.isArray(intv.photos)
                ? intv.photos.map((p: any) => getBlobUrl(p))
                : [],
              videos: Array.isArray(intv.videos) ? intv.videos : [],
              videoUrls: Array.isArray(intv.videos)
                ? intv.videos.map((v: any) => getBlobUrl(v))
                : [],
              estAstreinte: (intv as any).estAstreinte === true,
              clientAbsent: (intv as any).clientAbsent === true,
            })),
          }));
        }
      } catch (_e) {
        // ignore — interventions may not exist yet
      }
    }
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
        startMorning: toMinutes(form.startMorning),
        endMorning: toMinutes(form.endMorning),
        startAfternoon: toMinutes(form.startAfternoon),
        endAfternoon: toMinutes(form.endAfternoon),
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
        interventionSlots: form.interventionSlots.map((_s) => ({
          startHour: BigInt(0),
          startMinute: BigInt(0),
          endHour: BigInt(0),
          endMinute: BigInt(0),
        })),
      };

      // Use actor directly (bypass React Query) for reliable upsert
      await actor.enregistrerJournee(input);

      // Save fiche interventions for each slot
      const dateTs = dateToTimestamp(selectedDate);
      const updatedSlots = [...form.interventionSlots];
      for (
        let slotIdx = 0;
        slotIdx < form.interventionSlots.length;
        slotIdx++
      ) {
        const slot = form.interventionSlots[slotIdx];
        const hasContent =
          slot.clientNom ||
          slot.ficheDescription ||
          slot.signatureClient ||
          slot.signatureIntervenant ||
          slot.ficheId ||
          slot.piecesLignes.length > 0;
        if (!hasContent) continue;
        // Generate a stable ID for new interventions so they can be updated later
        const newId =
          slot.ficheId ||
          `intv-${Date.now()}-${slotIdx}-${Math.random().toString(36).slice(2)}`;
        const interventionInput = {
          id: newId,
          date: dateTs,
          clientNom: slot.clientNom,
          clientAdresse: slot.clientAdresse,
          heureMatinDebutH: BigInt(Number(slot.matinDebutH) || 0),
          heureMatinDebutMin: BigInt(Number(slot.matinDebutMin) || 0),
          heureMatinFinH: BigInt(Number(slot.matinFinH) || 0),
          heureMatinFinMin: BigInt(Number(slot.matinFinMin) || 0),
          heureApremDebutH: BigInt(Number(slot.apremDebutH) || 0),
          heureApremDebutMin: BigInt(Number(slot.apremDebutMin) || 0),
          heureApremFinH: BigInt(Number(slot.apremFinH) || 0),
          heureApremFinMin: BigInt(Number(slot.apremFinMin) || 0),
          description: slot.ficheDescription,
          signatureClient: slot.signatureClient,
          signatureIntervenant: slot.signatureIntervenant,
          pieces: slot.piecesLignes.map((l) => ({
            reference: l.reference,
            article: l.article,
            quantite: BigInt(Number(l.quantite) || 0),
          })),
          photos: slot.photos,
          videos: slot.videos,
          estAstreinte: slot.estAstreinte ?? false,
          clientAbsent: slot.clientAbsent ?? false,
        };
        if (slot.ficheId) {
          await actor.modifierIntervention(slot.ficheId, interventionInput);
        } else {
          await actor.ajouterIntervention(interventionInput);
          // Persist the new ID so subsequent saves use modifierIntervention instead of creating duplicates
          updatedSlots[slotIdx] = { ...updatedSlots[slotIdx], ficheId: newId };
        }
      }
      // Update form state with the new ficheIds so re-saves are idempotent
      setForm((f) => ({ ...f, interventionSlots: updatedSlots }));

      // Refresh the entries list after saving
      queryClient.invalidateQueries({ queryKey: ["timeEntries"] });

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
      await deleteEntry(id);
      toast.success("Journée supprimée");
      setDialogOpen(false);
    } catch (e) {
      toast.error(
        `Erreur lors de la suppression : ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  };

  const addSlotPhoto = async (slotIdx: number, files: FileList | null) => {
    if (!files) return;
    const newBlobs: ExternalBlob[] = [];
    const newUrls: string[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      try {
        const arrayBuffer = await file.arrayBuffer();
        newBlobs.push(ExternalBlob.fromBytes(new Uint8Array(arrayBuffer)));
        newUrls.push(URL.createObjectURL(file));
      } catch {
        // ignore
      }
    }
    setForm((f) => ({
      ...f,
      interventionSlots: f.interventionSlots.map((s, i) =>
        i === slotIdx
          ? {
              ...s,
              photos: [...s.photos, ...newBlobs],
              photoUrls: [...s.photoUrls, ...newUrls],
            }
          : s,
      ),
    }));
  };

  const addSlotVideo = async (slotIdx: number, files: FileList | null) => {
    if (!files) return;
    const newBlobs: ExternalBlob[] = [];
    const newUrls: string[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("video/")) continue;
      try {
        const arrayBuffer = await file.arrayBuffer();
        newBlobs.push(ExternalBlob.fromBytes(new Uint8Array(arrayBuffer)));
        newUrls.push(URL.createObjectURL(file));
      } catch {
        // ignore
      }
    }
    setForm((f) => ({
      ...f,
      interventionSlots: f.interventionSlots.map((s, i) =>
        i === slotIdx
          ? {
              ...s,
              videos: [...s.videos, ...newBlobs],
              videoUrls: [...s.videoUrls, ...newUrls],
            }
          : s,
      ),
    }));
  };

  const removeSlotPhoto = (slotIdx: number, photoIdx: number) => {
    setForm((f) => ({
      ...f,
      interventionSlots: f.interventionSlots.map((s, i) =>
        i === slotIdx
          ? {
              ...s,
              photos: s.photos.filter((_, pi) => pi !== photoIdx),
              photoUrls: s.photoUrls.filter((_, pi) => pi !== photoIdx),
            }
          : s,
      ),
    }));
  };

  const removeSlotVideo = (slotIdx: number, videoIdx: number) => {
    setForm((f) => ({
      ...f,
      interventionSlots: f.interventionSlots.map((s, i) =>
        i === slotIdx
          ? {
              ...s,
              videos: s.videos.filter((_, vi) => vi !== videoIdx),
              videoUrls: s.videoUrls.filter((_, vi) => vi !== videoIdx),
            }
          : s,
      ),
    }));
  };

  const addInterventionSlot = async () => {
    const slot = defaultSlot();
    // Auto-load saved intervenant signature
    if (actor) {
      try {
        const sig = await actor.obtenirSignatureIntervenant();
        if (sig) slot.signatureIntervenant = sig;
      } catch (_) {
        /* ignore */
      }
    }
    setForm((f) => ({
      ...f,
      interventionSlots: [...f.interventionSlots, slot],
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
    field: keyof Omit<InterventionSlotForm, "piecesLignes">,
    value: string | boolean,
  ) => {
    setForm((f) => ({
      ...f,
      interventionSlots: f.interventionSlots.map((s, i) =>
        i === idx ? { ...s, [field]: value } : s,
      ),
    }));
  };

  const addPieceLigne = (slotIdx: number) => {
    setForm((f) => ({
      ...f,
      interventionSlots: f.interventionSlots.map((s, i) =>
        i === slotIdx
          ? {
              ...s,
              piecesLignes: [
                ...s.piecesLignes,
                { reference: "", article: "", quantite: "" },
              ],
            }
          : s,
      ),
    }));
  };

  const removePieceLigne = (slotIdx: number, ligneIdx: number) => {
    setForm((f) => ({
      ...f,
      interventionSlots: f.interventionSlots.map((s, i) =>
        i === slotIdx
          ? {
              ...s,
              piecesLignes: s.piecesLignes.filter((_, li) => li !== ligneIdx),
            }
          : s,
      ),
    }));
  };

  const updatePieceLigne = (
    slotIdx: number,
    ligneIdx: number,
    field: keyof PieceLigne,
    value: string,
  ) => {
    setForm((f) => ({
      ...f,
      interventionSlots: f.interventionSlots.map((s, i) =>
        i === slotIdx
          ? {
              ...s,
              piecesLignes: s.piecesLignes.map((l, li) =>
                li === ligneIdx ? { ...l, [field]: value } : l,
              ),
            }
          : s,
      ),
    }));
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

            {/* Intervention slots */}
            {(form.typeOfDay === DayType.astreinte ||
              form.typeOfDay === DayType.work) && (
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
                    className="mb-3 border border-orange-200 rounded-lg overflow-hidden"
                  >
                    {/* Slot header */}
                    <div className="flex items-center justify-between p-2 bg-orange-50">
                      <div className="flex items-center gap-2">
                        {form.typeOfDay !== DayType.work && (
                          <span className="text-xs font-bold text-orange-700 uppercase bg-orange-100 px-1.5 py-0.5 rounded">
                            ASTREINTE
                          </span>
                        )}
                        <span className="text-xs font-semibold text-orange-700">
                          Intervention N°{idx + 1}
                        </span>
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

                    {/* Fiche client inline section — always visible */}
                    <div className="p-3 bg-blue-50/60 border-t border-blue-100 space-y-3">
                      <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                        Fiche client
                      </p>

                      {/* Astreinte checkbox — only for non-work days */}
                      {form.typeOfDay !== DayType.work && (
                        <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded px-2 py-1.5">
                          <input
                            type="checkbox"
                            id="estAstreinte-slot"
                            checked={slot.estAstreinte ?? false}
                            onChange={(e) =>
                              updateSlot(idx, "estAstreinte", e.target.checked)
                            }
                            className="w-4 h-4 accent-orange-500"
                          />
                          <label
                            htmlFor="estAstreinte-slot"
                            className="text-xs font-semibold text-orange-700 cursor-pointer select-none"
                          >
                            Intervention d&apos;astreinte
                          </label>
                          {slot.estAstreinte && (
                            <span className="ml-auto text-xs bg-orange-500 text-white px-1.5 py-0.5 rounded-full font-bold">
                              ASTREINTE
                            </span>
                          )}
                        </div>
                      )}

                      {/* Client nom autocomplete */}
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">
                          Nom client
                        </Label>
                        <ClientAutocomplete
                          value={slot.clientNom}
                          onChange={(nom, adresse) => {
                            updateSlot(idx, "clientNom", nom);
                            if (adresse !== undefined)
                              updateSlot(idx, "clientAdresse", adresse);
                          }}
                          clients={clients}
                        />
                      </div>

                      {/* Adresse */}
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">
                          Adresse
                        </Label>
                        <Input
                          value={slot.clientAdresse}
                          onChange={(e) =>
                            updateSlot(idx, "clientAdresse", e.target.value)
                          }
                          placeholder="Adresse du client"
                          className="text-sm"
                        />
                      </div>

                      {/* Horaires matin / après-midi */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">
                            Matin début
                          </Label>
                          <div className="flex gap-1">
                            <Input
                              type="number"
                              min="0"
                              max="23"
                              placeholder="HH"
                              value={slot.matinDebutH}
                              onChange={(e) =>
                                updateSlot(idx, "matinDebutH", e.target.value)
                              }
                              className="w-12 text-center px-1 text-sm"
                            />
                            <span className="self-center text-xs text-muted-foreground font-semibold">
                              h
                            </span>
                            <Input
                              type="number"
                              min="0"
                              max="59"
                              placeholder="MM"
                              value={slot.matinDebutMin}
                              onChange={(e) =>
                                updateSlot(idx, "matinDebutMin", e.target.value)
                              }
                              className="w-12 text-center px-1 text-sm"
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">
                            Matin fin
                          </Label>
                          <div className="flex gap-1">
                            <Input
                              type="number"
                              min="0"
                              max="23"
                              placeholder="HH"
                              value={slot.matinFinH}
                              onChange={(e) =>
                                updateSlot(idx, "matinFinH", e.target.value)
                              }
                              className="w-12 text-center px-1 text-sm"
                            />
                            <span className="self-center text-xs text-muted-foreground font-semibold">
                              h
                            </span>
                            <Input
                              type="number"
                              min="0"
                              max="59"
                              placeholder="MM"
                              value={slot.matinFinMin}
                              onChange={(e) =>
                                updateSlot(idx, "matinFinMin", e.target.value)
                              }
                              className="w-12 text-center px-1 text-sm"
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">
                            Après-midi début
                          </Label>
                          <div className="flex gap-1">
                            <Input
                              type="number"
                              min="0"
                              max="23"
                              placeholder="HH"
                              value={slot.apremDebutH}
                              onChange={(e) =>
                                updateSlot(idx, "apremDebutH", e.target.value)
                              }
                              className="w-12 text-center px-1 text-sm"
                            />
                            <span className="self-center text-xs text-muted-foreground font-semibold">
                              h
                            </span>
                            <Input
                              type="number"
                              min="0"
                              max="59"
                              placeholder="MM"
                              value={slot.apremDebutMin}
                              onChange={(e) =>
                                updateSlot(idx, "apremDebutMin", e.target.value)
                              }
                              className="w-12 text-center px-1 text-sm"
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">
                            Après-midi fin
                          </Label>
                          <div className="flex gap-1">
                            <Input
                              type="number"
                              min="0"
                              max="23"
                              placeholder="HH"
                              value={slot.apremFinH}
                              onChange={(e) =>
                                updateSlot(idx, "apremFinH", e.target.value)
                              }
                              className="w-12 text-center px-1 text-sm"
                            />
                            <span className="self-center text-xs text-muted-foreground font-semibold">
                              h
                            </span>
                            <Input
                              type="number"
                              min="0"
                              max="59"
                              placeholder="MM"
                              value={slot.apremFinMin}
                              onChange={(e) =>
                                updateSlot(idx, "apremFinMin", e.target.value)
                              }
                              className="w-12 text-center px-1 text-sm"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Description */}
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">
                          Description
                        </Label>
                        <div className="flex items-start gap-1">
                          <Textarea
                            value={slot.ficheDescription}
                            onChange={(e) =>
                              updateSlot(
                                idx,
                                "ficheDescription",
                                e.target.value,
                              )
                            }
                            placeholder="Description de l'intervention..."
                            rows={2}
                            className="text-sm flex-1"
                            data-ocid="calendar.fiche_description.textarea"
                          />
                          <VoiceInput
                            value={slot.ficheDescription}
                            onChange={(val) =>
                              updateSlot(idx, "ficheDescription", val)
                            }
                            className="mt-1"
                          />
                        </div>
                      </div>

                      {/* Pièces utilisées */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                            Pièces utilisées
                          </Label>
                          <Button
                            variant="outline"
                            size="sm"
                            type="button"
                            onClick={() => addPieceLigne(idx)}
                            data-ocid="calendar.add_piece.button"
                            className="h-6 px-2 text-xs"
                          >
                            <Plus className="w-3 h-3 mr-1" /> Ajouter
                          </Button>
                        </div>
                        {slot.piecesLignes.length === 0 && (
                          <p
                            className="text-xs text-muted-foreground"
                            data-ocid="calendar.pieces.empty_state"
                          >
                            Aucune pièce
                          </p>
                        )}
                        {slot.piecesLignes.map((ligne, ligneIdx) => (
                          <div
                            key={`piece-${String(idx)}-${String(ligneIdx)}`}
                            className="flex items-center gap-1 mb-2"
                            data-ocid={`calendar.pieces.item.${ligneIdx + 1}`}
                          >
                            <Input
                              placeholder="Référence"
                              value={ligne.reference}
                              onChange={(e) =>
                                updatePieceLigne(
                                  idx,
                                  ligneIdx,
                                  "reference",
                                  e.target.value,
                                )
                              }
                              className="text-xs flex-1 min-w-0"
                            />
                            <Input
                              placeholder="Article"
                              value={ligne.article}
                              onChange={(e) =>
                                updatePieceLigne(
                                  idx,
                                  ligneIdx,
                                  "article",
                                  e.target.value,
                                )
                              }
                              className="text-xs flex-1 min-w-0"
                            />
                            <Input
                              type="number"
                              placeholder="Qté"
                              value={ligne.quantite}
                              onChange={(e) =>
                                updatePieceLigne(
                                  idx,
                                  ligneIdx,
                                  "quantite",
                                  e.target.value,
                                )
                              }
                              className="text-xs w-14 text-center px-1"
                            />
                            <button
                              type="button"
                              onClick={() => removePieceLigne(idx, ligneIdx)}
                              data-ocid="calendar.pieces.delete_button"
                              className="p-1 text-destructive hover:bg-destructive/10 rounded flex-shrink-0"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Photos & Vidéos */}
                      <div>
                        <Label className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2 block">
                          Photos &amp; Vidéos
                        </Label>
                        {/* Thumbnails */}
                        {(slot.photoUrls.length > 0 ||
                          slot.videoUrls.length > 0) && (
                          <div className="flex flex-wrap gap-2 mb-2">
                            {slot.photoUrls.map((url, pi) => (
                              <div
                                key={`photo-slot-${pi}-${url}`}
                                className="relative w-16 h-16 rounded overflow-hidden border border-border"
                              >
                                <button
                                  type="button"
                                  className="w-full h-full"
                                  onClick={() => {
                                    const items: MediaItem[] = [
                                      ...slot.photoUrls.map((u) => ({
                                        type: "photo" as const,
                                        url: u,
                                      })),
                                      ...slot.videoUrls.map((u) => ({
                                        type: "video" as const,
                                        url: u,
                                      })),
                                    ];
                                    setMediaViewer({ items, index: pi });
                                  }}
                                >
                                  <img
                                    src={url}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeSlotPhoto(idx, pi)}
                                  className="absolute top-0 right-0 p-0.5 bg-black/60 text-white rounded-bl"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                            {slot.videoUrls.map((url, vi) => (
                              <div
                                key={`video-slot-${vi}-${url}`}
                                className="relative w-20 h-16 rounded overflow-hidden border border-border bg-muted flex items-center justify-center"
                              >
                                <button
                                  type="button"
                                  className="w-full h-full flex items-center justify-center"
                                  onClick={() => {
                                    const items: MediaItem[] = [
                                      ...slot.photoUrls.map((u) => ({
                                        type: "photo" as const,
                                        url: u,
                                      })),
                                      ...slot.videoUrls.map((u) => ({
                                        type: "video" as const,
                                        url: u,
                                      })),
                                    ];
                                    setMediaViewer({
                                      items,
                                      index: slot.photoUrls.length + vi,
                                    });
                                  }}
                                >
                                  <Video className="w-6 h-6 text-muted-foreground" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeSlotVideo(idx, vi)}
                                  className="absolute top-0 right-0 p-0.5 bg-black/60 text-white rounded-bl"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="flex gap-2">
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              className="hidden"
                              onChange={(e) =>
                                addSlotPhoto(idx, e.target.files)
                              }
                            />
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-border bg-background hover:bg-muted transition-colors">
                              <ImageIcon className="w-3 h-3" /> Photo
                            </span>
                          </label>
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              accept="video/*"
                              multiple
                              className="hidden"
                              onChange={(e) =>
                                addSlotVideo(idx, e.target.files)
                              }
                            />
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-border bg-background hover:bg-muted transition-colors">
                              <Video className="w-3 h-3" /> Vidéo
                            </span>
                          </label>
                        </div>
                      </div>

                      {/* Signatures */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            Signature client
                          </span>
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={slot.clientAbsent ?? false}
                              onChange={(e) => {
                                updateSlot(
                                  idx,
                                  "clientAbsent",
                                  e.target.checked,
                                );
                                if (e.target.checked)
                                  updateSlot(idx, "signatureClient", "");
                              }}
                              className="w-4 h-4 accent-orange-500"
                            />
                            <span className="flex items-center gap-1 text-xs text-orange-700 font-medium">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-label="Client absent"
                                role="img"
                              >
                                <title>Client absent</title>
                                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <line x1="17" y1="8" x2="23" y2="14" />
                                <line x1="23" y1="8" x2="17" y2="14" />
                              </svg>
                              Client absent
                            </span>
                          </label>
                        </div>
                        {(slot.clientAbsent ?? false) ? (
                          <div className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-orange-300 bg-orange-50 py-4">
                            <span className="text-xs font-semibold text-orange-600">
                              Client absent — pas de signature
                            </span>
                          </div>
                        ) : (
                          <SignaturePad
                            label=""
                            value={slot.signatureClient}
                            onChange={(v) =>
                              updateSlot(idx, "signatureClient", v)
                            }
                          />
                        )}
                      </div>
                      <SignaturePad
                        label="Signature intervenant"
                        value={slot.signatureIntervenant}
                        onChange={(v) => {
                          updateSlot(idx, "signatureIntervenant", v);
                          if (actor && v) {
                            actor
                              .sauvegarderSignatureIntervenant(v)
                              .catch(() => {});
                          }
                        }}
                      />
                    </div>
                  </div>
                ))}
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
      {mediaViewer && (
        <MediaViewer
          media={mediaViewer.items}
          initialIndex={mediaViewer.index}
          onClose={() => setMediaViewer(null)}
        />
      )}
    </div>
  );
}
