import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarCheck,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Phone,
  Plus,
  Trash2,
  User,
  X,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { Page } from "../App";
import type { Client, InterventionInput, PlanningItem } from "../backend";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

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
const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function toDateStr(ns: bigint): string {
  return new Date(Number(ns / BigInt(1_000_000))).toISOString().slice(0, 10);
}

function dateToNs(dateStr: string): bigint {
  return BigInt(new Date(dateStr).getTime()) * BigInt(1_000_000);
}

function getDayOfWeek(year: number, month: number, day: number): number {
  const d = new Date(year, month, day).getDay();
  return d === 0 ? 6 : d - 1;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function generateId(): string {
  return `plan-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const TYPE_LABELS: Record<string, string> = {
  depannage: "Dépannage",
  controle: "Contrôle",
  chantier: "Chantier",
};

const TYPE_COLORS: Record<string, string> = {
  depannage: "bg-red-100 text-red-800",
  controle: "bg-blue-100 text-blue-800",
  chantier: "bg-yellow-100 text-yellow-800",
};

interface DayItem {
  id: string;
  titre: string;
  clientNom: string;
  clientAdresse?: string;
  typeMission: string;
  nomDestinataire: string;
  statut: string;
  description: string;
  createur?: any;
  destinataire?: any;
  dates?: bigint[];
}

// Client autocomplete component
function ClientAutocomplete({
  value,
  clients,
  onSelect,
  onManual,
}: {
  value: string;
  clients: Client[];
  onSelect: (client: Client) => void;
  onManual: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return clients.slice(0, 8);
    return clients
      .filter((c) => c.nom.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 8);
  }, [clients, query]);

  return (
    <div className="relative" ref={ref}>
      <Input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          onManual(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Rechercher un client..."
        data-ocid="planning.client.input"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
          {filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-orange-50 flex items-center justify-between gap-2"
              onMouseDown={() => {
                setQuery(c.nom);
                onSelect(c);
                setOpen(false);
              }}
            >
              <span className="font-medium">{c.nom}</span>
              {c.listeNoire && (
                <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold">
                  LISTE NOIRE
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Client info card
function ClientInfoCard({ client }: { client: Client }) {
  return (
    <div className="mt-2 p-3 rounded-xl border border-gray-200 bg-gray-50 space-y-1 text-xs">
      <div className="flex items-center justify-between">
        <span className="font-bold text-gray-900">{client.nom}</span>
        {client.listeNoire && (
          <span className="bg-red-600 text-white px-2 py-0.5 rounded font-bold text-xs">
            LISTE NOIRE
          </span>
        )}
      </div>
      {client.adresse && (
        <div className="flex items-center gap-1 text-gray-600">
          <MapPin className="w-3 h-3" />
          <span>{client.adresse}</span>
        </div>
      )}
      {client.telephone && (
        <div className="flex items-center gap-1 text-gray-600">
          <Phone className="w-3 h-3" />
          <span>{client.telephone}</span>
        </div>
      )}
      {client.email && <div className="text-gray-500">{client.email}</div>}
    </div>
  );
}

export default function Planning({
  onNavigate,
}: { onNavigate?: (page: Page) => void }) {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showEditDates, setShowEditDates] = useState<DayItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Filters
  const [filterUserPrincipal, setFilterUserPrincipal] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterStatut, setFilterStatut] = useState("all");

  // Create form
  const [createForm, setCreateForm] = useState({
    dates: [] as string[],
    destinataire: "",
    clientNom: "",
    typeMission: "depannage",
    description: "",
  });
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Edit dates form
  const [editDates, setEditDates] = useState<string[]>([]);

  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const callerPrincipal = identity?.getPrincipal();
  const callerPrincipalStr = callerPrincipal?.toString() ?? "";

  // Load planning items
  const { data: planningItems = [], isLoading: loadingPlanning } = useQuery<
    PlanningItem[]
  >({
    queryKey: ["planningItems"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.obtenirTousPlanningItems();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 30000,
  });

  // Load profiles for destinataire selector
  const { data: profiles = [] } = useQuery({
    queryKey: ["allProfiles"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.obtenirTousLesProfils();
    },
    enabled: !!actor && !isFetching,
  });

  // Load clients for autocomplete
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["clients"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.obtenirClients();
    },
    enabled: !!actor && !isFetching,
  });

  // All items combined
  const allItems: DayItem[] = useMemo(() => {
    const fromPlanning: DayItem[] = planningItems.map((p) => {
      const desc = p.description;
      const clientData = clients.find(
        (c) =>
          c.nom.toLowerCase().trim() ===
          (p.clientNom || "").toLowerCase().trim(),
      );
      return {
        id: p.id,
        titre: p.titre,
        clientNom: p.clientNom,
        clientAdresse: clientData?.adresse ?? "",
        typeMission: p.typeMission,
        nomDestinataire: p.nomDestinataire,
        statut: p.statut,
        description: desc,
        createur: p.createur,
        destinataire: p.destinataire,
        dates: p.dates,
      };
    });
    return fromPlanning;
  }, [planningItems, clients]);

  // Apply filters — use principal ID for planning items
  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      if (filterUserPrincipal !== "all") {
        // For planning items, compare destinataire principal
        if (item.destinataire) {
          if (item.destinataire.toString() !== filterUserPrincipal)
            return false;
        } else {
          // For validated interventions, fall back to name match
          const prof = (profiles as [any, any][]).find(
            ([p]) => p.toString() === filterUserPrincipal,
          );
          const name = prof ? prof[1].name : "";
          if (item.nomDestinataire !== name) return false;
        }
      }
      if (filterType !== "all" && item.typeMission !== filterType) return false;
      if (filterStatut !== "all" && item.statut !== filterStatut) return false;
      return true;
    });
  }, [allItems, filterUserPrincipal, filterType, filterStatut, profiles]);

  // Build date map: dateStr -> DayItem[]
  const dateMap = useMemo(() => {
    const map = new Map<string, DayItem[]>();
    for (const item of filteredItems) {
      const dates = item.dates || [];
      for (const d of dates) {
        const ds = toDateStr(d);
        if (!map.has(ds)) map.set(ds, []);
        map.get(ds)!.push(item);
      }
    }
    return map;
  }, [filteredItems]);

  // Today badges
  const todayARealisr = useMemo(() => {
    const items = dateMap.get(todayStr) || [];
    return items.filter(
      (i) => i.statut === "a_realiser" || i.statut === "en_cours",
    ).length;
  }, [dateMap, todayStr]);

  const todayExecute = useMemo(() => {
    const items = dateMap.get(todayStr) || [];
    return items.filter((i) => i.statut === "execute").length;
  }, [dateMap, todayStr]);

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDayOfWeek = getDayOfWeek(viewYear, viewMonth, 1);

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

  const selectedDayItems = useMemo(() => {
    if (!selectedDay) return [];
    return dateMap.get(selectedDay) || [];
  }, [dateMap, selectedDay]);

  const isOwner = (item: DayItem) => {
    if (!callerPrincipalStr) return false;
    return (
      item.createur?.toString() === callerPrincipalStr ||
      item.destinataire?.toString() === callerPrincipalStr
    );
  };

  const handleDelete = async (id: string) => {
    if (!actor) return;
    try {
      // Delete calendar drafts first
      const item = planningItems.find((p) => p.id === id);
      if (item) {
        try {
          for (const d of item.dates) {
            await (actor as any).supprimerInterventionDraft(
              id,
              `${id}-${toDateStr(d)}`,
            );
          }
        } catch {}
      }
      await actor.supprimerPlanningItem(id);
      queryClient.invalidateQueries({ queryKey: ["planningItems"] });
      queryClient.invalidateQueries({ queryKey: ["journees"] });
      setDeleteConfirm(null);
      setSelectedDay(null);
      toast.success("Mission supprimée");
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleAccept = async (item: DayItem) => {
    if (!actor || !callerPrincipal) return;
    try {
      const firstDate =
        item.dates && item.dates.length > 0 ? item.dates[0] : null;
      const dateStr = firstDate
        ? toDateStr(firstDate)
        : new Date().toISOString().slice(0, 10);
      const ebaucheId = `ebauche-${item.id}-${Date.now()}`;
      const clientAdresse = item.clientAdresse ?? "";
      // Option A: backend creates ébauche with direct missionId link
      await (actor as any).accepterEtCreerEbauche(
        item.id,
        ebaucheId,
        clientAdresse,
      );
      // Also store in localStorage as fallback for Calendar pre-fill
      const draft = {
        missionId: item.id,
        clientNom: item.clientNom,
        clientAdresse,
        description: item.description ?? "",
        date: dateStr,
        allDates: (item.dates || []).map(toDateStr),
      };
      localStorage.setItem("calendarMissionDraft", JSON.stringify(draft));
      queryClient.invalidateQueries({ queryKey: ["planningItems"] });
      queryClient.invalidateQueries({ queryKey: ["journees"] });
      toast.success(
        "Mission acceptée — une intervention a été créée dans votre Calendrier",
      );
      if (onNavigate) onNavigate("calendar");
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      toast.error(
        `Erreur lors de l'acceptation de la mission${msg ? `: ${msg}` : ""}`,
      );
    }
  };

  const handleEditDatesSubmit = async () => {
    if (!actor || !showEditDates) return;
    try {
      const oldDateStrs = (showEditDates.dates || []).map(toDateStr);
      const newDateStrs = editDates;
      const dates = newDateStrs.map(dateToNs);
      await actor.modifierDatesPlanningItem(showEditDates.id, dates);
      // Sync calendar drafts
      try {
        for (const ds of oldDateStrs) {
          if (!newDateStrs.includes(ds)) {
            await (actor as any).supprimerInterventionDraft(
              showEditDates.id,
              `${showEditDates.id}-${ds}`,
            );
          }
        }
        for (const ds of newDateStrs) {
          if (!oldDateStrs.includes(ds)) {
            const input: InterventionInput = {
              id: `${showEditDates.id}-${ds}`,
              date: dateToNs(ds),
              clientNom: showEditDates.clientNom,
              clientAdresse: "",
              description: showEditDates.description || "Mission planifiée",
              heureMatinDebutH: BigInt(0),
              heureMatinDebutMin: BigInt(0),
              heureMatinFinH: BigInt(0),
              heureMatinFinMin: BigInt(0),
              heureApremDebutH: BigInt(0),
              heureApremDebutMin: BigInt(0),
              heureApremFinH: BigInt(0),
              heureApremFinMin: BigInt(0),
              estAstreinte: false,
              clientAbsent: false,
              signatureIntervenant: "",
              signatureClient: "",
              pieces: [],
              photos: [],
              videos: [],
            };
            await (actor as any).ajouterInterventionPourUtilisateur(
              showEditDates.destinataire,
              input,
            );
          }
        }
      } catch {}
      queryClient.invalidateQueries({ queryKey: ["planningItems"] });
      queryClient.invalidateQueries({ queryKey: ["journees"] });
      setShowEditDates(null);
      toast.success("Dates modifiées");
    } catch {
      toast.error("Erreur lors de la modification");
    }
  };

  const handleCreate = async () => {
    if (!actor || !callerPrincipal) return;
    if (!createForm.destinataire || createForm.dates.length === 0) {
      toast.error("Remplissez tous les champs obligatoires");
      return;
    }
    const targetProfile = (profiles as [any, any][]).find(
      ([p]) => p.toString() === createForm.destinataire,
    );
    if (!targetProfile) {
      toast.error("Intervenant introuvable, veuillez réessayer");
      return;
    }
    const nomDestinataire = targetProfile[1].name;
    const callerProfile = (profiles as [any, any][]).find(
      ([p]) => p.toString() === callerPrincipal.toString(),
    );
    const nomCreateur = callerProfile ? callerProfile[1].name : "";
    const generatedTitre = `${TYPE_LABELS[createForm.typeMission] || createForm.typeMission}${createForm.clientNom ? ` — ${createForm.clientNom}` : ""}`;
    const encodedDesc = createForm.description.trim();
    const planId = generateId();
    try {
      await actor.creerPlanningItem(
        planId,
        generatedTitre,
        createForm.dates.map(dateToNs),
        targetProfile[0],
        nomDestinataire,
        nomCreateur,
        createForm.clientNom.trim(),
        createForm.typeMission,
        encodedDesc,
      );
      // Store clientAdresse for Option A ébauche creation
      if (selectedClient?.adresse) {
        try {
          await (actor as any).setPlanningClientAdresse(
            planId,
            selectedClient.adresse,
          );
        } catch {}
      }
      // Auto-create calendar drafts
      try {
        for (const dateStr of createForm.dates) {
          const input: InterventionInput = {
            id: `${planId}-${dateStr}`,
            date: dateToNs(dateStr),
            clientNom: createForm.clientNom.trim(),
            clientAdresse: selectedClient?.adresse ?? "",
            description: createForm.description.trim() || "Mission planifiée",
            heureMatinDebutH: BigInt(0),
            heureMatinDebutMin: BigInt(0),
            heureMatinFinH: BigInt(0),
            heureMatinFinMin: BigInt(0),
            heureApremDebutH: BigInt(0),
            heureApremDebutMin: BigInt(0),
            heureApremFinH: BigInt(0),
            heureApremFinMin: BigInt(0),
            estAstreinte: false,
            clientAbsent: false,
            signatureIntervenant: "",
            signatureClient: "",
            pieces: [],
            photos: [],
            videos: [],
          };
          await (actor as any).ajouterInterventionPourUtilisateur(
            targetProfile[0],
            input,
          );
        }
      } catch {}
      queryClient.invalidateQueries({ queryKey: ["planningItems"] });
      queryClient.invalidateQueries({ queryKey: ["journees"] });
      setShowCreate(false);
      setCreateForm({
        dates: [],
        destinataire: "",
        clientNom: "",
        typeMission: "depannage",
        description: "",
      });
      setSelectedClient(null);
      toast.success("Mission créée");
    } catch {
      toast.error("Erreur lors de la création");
    }
  };

  const profilesLoaded = (profiles as any[]).length > 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1
          className="text-xl font-bold"
          style={{ color: "oklch(var(--navy-dark))" }}
        >
          Planning
        </h1>
        <Button
          onClick={() => setShowCreate(true)}
          className="gap-2 text-white font-semibold"
          style={{ backgroundColor: "#ea580c" }}
          data-ocid="planning.open_modal_button"
        >
          <Plus className="w-4 h-4" />
          Nouvelle mission
        </Button>
      </div>

      {/* Today badges */}
      <div className="flex gap-3 flex-wrap">
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-white shadow"
          style={{ backgroundColor: "#ea580c" }}
          data-ocid="planning.a_realiser.card"
        >
          <CalendarClock className="w-5 h-5" />
          <span>{todayARealisr}</span>
          <span className="text-sm font-normal opacity-90">
            à réaliser aujourd'hui
          </span>
        </div>
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-white shadow"
          style={{ backgroundColor: "#16a34a" }}
          data-ocid="planning.execute.card"
        >
          <CalendarCheck className="w-5 h-5" />
          <span>{todayExecute}</span>
          <span className="text-sm font-normal opacity-90">
            exécutés aujourd'hui
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <Select
          value={filterUserPrincipal}
          onValueChange={setFilterUserPrincipal}
        >
          <SelectTrigger
            className="w-44 h-8 text-xs"
            data-ocid="planning.user.select"
          >
            <SelectValue placeholder="Intervenant" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les missions</SelectItem>
            {(profiles as [any, any][]).map(([principal, profile]) => (
              <SelectItem
                key={principal.toString()}
                value={principal.toString()}
              >
                {profile.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger
            className="w-36 h-8 text-xs"
            data-ocid="planning.type.select"
          >
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            <SelectItem value="depannage">Dépannage</SelectItem>
            <SelectItem value="controle">Contrôle</SelectItem>
            <SelectItem value="chantier">Chantier</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatut} onValueChange={setFilterStatut}>
          <SelectTrigger
            className="w-36 h-8 text-xs"
            data-ocid="planning.statut.select"
          >
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="a_realiser">À réaliser</SelectItem>
            <SelectItem value="en_cours">En cours</SelectItem>
            <SelectItem value="execute">Exécuté</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Calendar grid */}
      <div className="rounded-2xl overflow-hidden shadow border border-gray-200 bg-white">
        {/* Month navigation */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ backgroundColor: "oklch(var(--navy-dark))" }}
        >
          <button
            type="button"
            onClick={prevMonth}
            className="text-white p-1 rounded-lg hover:bg-white/10"
            data-ocid="planning.pagination_prev"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-white font-bold text-base">
            {MONTHS[viewMonth]} {viewYear}
          </span>
          <button
            type="button"
            onClick={nextMonth}
            className="text-white p-1 rounded-lg hover:bg-white/10"
            data-ocid="planning.pagination_next"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-gray-100">
          {DAYS.map((d) => (
            <div
              key={d}
              className="text-center text-xs font-semibold text-gray-400 py-2"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {DAYS.slice(0, firstDayOfWeek).map((d) => (
            <div
              key={`empty-${viewYear}-${viewMonth}-${d}`}
              className="h-14 sm:h-16 border-b border-r border-gray-100"
            />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const dayItems = dateMap.get(dateStr) || [];
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDay;

            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                className={[
                  "h-14 sm:h-16 border-b border-r border-gray-100 flex flex-col items-center justify-start pt-1.5 gap-1 transition-colors relative",
                  isSelected
                    ? "bg-blue-50 ring-2 ring-inset ring-blue-300"
                    : "hover:bg-gray-50",
                ].join(" ")}
                data-ocid={`planning.item.${day}`}
              >
                <span
                  className={[
                    "text-sm font-semibold leading-none w-7 h-7 flex items-center justify-center rounded-full",
                    isToday ? "text-white" : "text-gray-700",
                  ].join(" ")}
                  style={isToday ? { backgroundColor: "#0f1e4a" } : {}}
                >
                  {day}
                </span>
                <div className="flex gap-0.5 flex-wrap justify-center max-w-full px-0.5">
                  {dayItems.slice(0, 5).map((mi) => (
                    <span
                      key={mi.id}
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor:
                          mi.statut === "execute"
                            ? "#16a34a"
                            : mi.statut === "en_cours"
                              ? "#2563eb"
                              : "#ea580c",
                      }}
                    />
                  ))}
                  {dayItems.length > 5 && (
                    <span
                      className="text-gray-400"
                      style={{ fontSize: "8px", lineHeight: "8px" }}
                    >
                      +
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day panel */}
      {selectedDay && (
        <div className="rounded-2xl border border-gray-200 bg-white shadow overflow-hidden">
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ backgroundColor: "oklch(var(--navy-dark))" }}
          >
            <span className="text-white font-bold text-sm">
              {new Date(`${selectedDay}T12:00:00`).toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </span>
            <button
              type="button"
              onClick={() => setSelectedDay(null)}
              className="text-white/70 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {selectedDayItems.length === 0 ? (
            <div
              className="p-6 text-center text-gray-400 text-sm"
              data-ocid="planning.empty_state"
            >
              Aucune intervention ce jour
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {selectedDayItems.map((item, idx) => (
                <div
                  key={item.id}
                  className="p-3 sm:p-4"
                  data-ocid={`planning.row.${idx + 1}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-gray-900">
                          {item.titre}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[item.typeMission] || "bg-gray-100 text-gray-700"}`}
                        >
                          {TYPE_LABELS[item.typeMission] || item.typeMission}
                        </span>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-bold text-white"
                          style={{
                            backgroundColor:
                              item.statut === "execute"
                                ? "#16a34a"
                                : item.statut === "en_cours"
                                  ? "#2563eb"
                                  : "#ea580c",
                          }}
                        >
                          {item.statut === "execute"
                            ? "Exécuté"
                            : item.statut === "en_cours"
                              ? "En cours"
                              : "À réaliser"}
                        </span>
                      </div>
                      {item.clientNom && (
                        <p className="text-xs text-gray-500 mt-1">
                          Client : {item.clientNom}
                        </p>
                      )}
                      <div className="flex items-center gap-1 mt-1">
                        <User className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-500">
                          {item.nomDestinataire}
                        </span>
                      </div>
                      {item.description && (
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                          {item.description}
                        </p>
                      )}
                    </div>

                    {item.destinataire?.toString() === callerPrincipalStr &&
                      item.statut === "a_realiser" && (
                        <Button
                          size="sm"
                          className="h-7 px-2 text-xs text-white font-semibold"
                          style={{ backgroundColor: "#16a34a" }}
                          onClick={() => handleAccept(item)}
                          data-ocid={`planning.accept_button.${idx + 1}`}
                        >
                          ✓ Accepter
                        </Button>
                      )}
                    {isOwner(item) && (
                      <div className="flex flex-col gap-1 flex-shrink-0">
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs"
                            onClick={() => {
                              setShowEditDates(item);
                              setEditDates((item.dates || []).map(toDateStr));
                            }}
                          >
                            <Clock className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => setDeleteConfirm(item.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Loading */}
      {loadingPlanning && (
        <div
          className="text-center py-8 text-gray-400 text-sm"
          data-ocid="planning.loading_state"
        >
          Chargement...
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent
          className="max-w-lg max-h-[90vh] overflow-y-auto"
          data-ocid="planning.dialog"
        >
          <DialogHeader>
            <DialogTitle>Nouvelle mission</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-sm">Intervenant *</Label>
              {!profilesLoaded ? (
                <p className="text-xs text-gray-400 py-1">
                  Chargement des intervenants...
                </p>
              ) : (
                <Select
                  value={createForm.destinataire}
                  onValueChange={(v) =>
                    setCreateForm((f) => ({ ...f, destinataire: v }))
                  }
                >
                  <SelectTrigger data-ocid="planning.destinataire.select">
                    <SelectValue placeholder="Choisir un intervenant" />
                  </SelectTrigger>
                  <SelectContent>
                    {(profiles as [any, any][]).map(([principal, profile]) => (
                      <SelectItem
                        key={principal.toString()}
                        value={principal.toString()}
                      >
                        {profile.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-sm">Client</Label>
              <ClientAutocomplete
                value={createForm.clientNom}
                clients={clients}
                onSelect={(c) => {
                  setSelectedClient(c);
                  setCreateForm((f) => ({ ...f, clientNom: c.nom }));
                }}
                onManual={(name) => {
                  setSelectedClient(null);
                  setCreateForm((f) => ({ ...f, clientNom: name }));
                }}
              />
              {selectedClient && <ClientInfoCard client={selectedClient} />}
            </div>

            <div className="space-y-1">
              <Label className="text-sm">Type *</Label>
              <Select
                value={createForm.typeMission}
                onValueChange={(v) =>
                  setCreateForm((f) => ({ ...f, typeMission: v }))
                }
              >
                <SelectTrigger data-ocid="planning.type_mission.select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="depannage">Dépannage</SelectItem>
                  <SelectItem value="controle">Contrôle</SelectItem>
                  <SelectItem value="chantier">Chantier</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-sm">
                Dates * (sélectionnez une ou plusieurs dates)
              </Label>
              <DateMultiPicker
                selected={createForm.dates}
                onChange={(dates) => setCreateForm((f) => ({ ...f, dates }))}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-sm">Description</Label>
              <Textarea
                value={createForm.description}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Description..."
                rows={3}
                data-ocid="planning.description.textarea"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowCreate(false)}
              data-ocid="planning.cancel_button"
            >
              Annuler
            </Button>
            <Button
              onClick={handleCreate}
              className="text-white"
              style={{ backgroundColor: "#ea580c" }}
              disabled={!profilesLoaded}
              data-ocid="planning.submit_button"
            >
              Créer la mission
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dates dialog */}
      <Dialog
        open={!!showEditDates}
        onOpenChange={(o) => !o && setShowEditDates(null)}
      >
        <DialogContent
          className="max-w-sm max-h-[90vh] overflow-y-auto"
          data-ocid="planning.edit_dialog"
        >
          <DialogHeader>
            <DialogTitle>Modifier la mission</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-sm">Dates</Label>
              <DateMultiPicker selected={editDates} onChange={setEditDates} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowEditDates(null)}
              data-ocid="planning.edit_cancel_button"
            >
              Annuler
            </Button>
            <Button
              onClick={handleEditDatesSubmit}
              className="text-white"
              style={{ backgroundColor: "#ea580c" }}
              data-ocid="planning.edit_save_button"
            >
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog
        open={!!deleteConfirm}
        onOpenChange={(o) => !o && setDeleteConfirm(null)}
      >
        <DialogContent className="max-w-sm" data-ocid="planning.delete_dialog">
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 py-2">
            Êtes-vous sûr de vouloir supprimer cette mission ?
          </p>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
              data-ocid="planning.delete_cancel_button"
            >
              Annuler
            </Button>
            <Button
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              className="text-white bg-red-600 hover:bg-red-700"
              data-ocid="planning.delete_confirm_button"
            >
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Mini multi-date picker component
function DateMultiPicker({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (dates: string[]) => void;
}) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const daysInMonth = getDaysInMonth(year, month);
  const firstDayOfWeek = getDayOfWeek(year, month, 1);

  const toggle = (dateStr: string) => {
    if (selected.includes(dateStr))
      onChange(selected.filter((d) => d !== dateStr));
    else onChange([...selected, dateStr].sort());
  };

  const prevMonth = () => {
    if (month === 0) {
      setYear((y) => y - 1);
      setMonth(11);
    } else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) {
      setYear((y) => y + 1);
      setMonth(0);
    } else setMonth((m) => m + 1);
  };

  return (
    <div className="border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50">
        <button
          type="button"
          onClick={prevMonth}
          className="p-1 rounded hover:bg-gray-200"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold">
          {MONTHS[month]} {year}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="p-1 rounded hover:bg-gray-200"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 text-center">
        {DAYS.map((d) => (
          <div key={d} className="text-xs text-gray-400 py-1">
            {d}
          </div>
        ))}
        {DAYS.slice(0, firstDayOfWeek).map((d) => (
          <div key={`ep-${year}-${month}-${d}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const ds = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const sel = selected.includes(ds);
          return (
            <button
              key={ds}
              type="button"
              onClick={() => toggle(ds)}
              className={[
                "m-0.5 w-7 h-7 rounded-full text-xs font-medium transition-colors mx-auto flex items-center justify-center",
                sel ? "text-white" : "hover:bg-gray-100 text-gray-700",
              ].join(" ")}
              style={sel ? { backgroundColor: "#ea580c" } : {}}
            >
              {day}
            </button>
          );
        })}
      </div>
      {selected.length > 0 && (
        <div className="px-3 py-2 bg-gray-50 border-t">
          <div className="flex flex-wrap gap-1">
            {selected.map((d) => (
              <Badge
                key={d}
                variant="secondary"
                className="text-xs cursor-pointer gap-1"
                onClick={() => toggle(d)}
              >
                {new Date(`${d}T12:00:00`).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "short",
                })}
                <X className="w-2.5 h-2.5" />
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
