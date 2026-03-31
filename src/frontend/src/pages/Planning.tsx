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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarCheck,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
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
import { PlanningInterventionModal } from "../components/PlanningInterventionModal";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  getDisabledUserIds,
  getUsersDisabledForSection,
} from "../utils/userAccessControl";

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

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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
  onNavigate: _onNavigate,
  readOnly = false,
}: { onNavigate?: (page: Page) => void; readOnly?: boolean }) {
  const today = new Date();
  const todayStr = localDateStr(today);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showInterventionModal, setShowInterventionModal] =
    useState<DayItem | null>(null);
  const [activeTab, setActiveTab] = useState<"semaine" | "mois">("semaine");

  // Filters
  const [filterUserPrincipal, setFilterUserPrincipal] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterStatut, setFilterStatut] = useState("all");

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

  // Load profiles for destinataire selector (exclude disabled users)
  const { data: allProfilesRaw = [] } = useQuery({
    queryKey: ["allProfiles"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.obtenirTousLesProfils();
    },
    enabled: !!actor && !isFetching,
  });
  const profiles = (allProfilesRaw as [any, any][]).filter(([principal]) => {
    const id = principal.toString();
    return (
      !getDisabledUserIds().includes(id) &&
      !getUsersDisabledForSection("planning").includes(id)
    );
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
      // Delete the deterministic intervention linked to this mission
      try {
        await (actor as any).supprimerInterventionDraft(id, `intv-plan-${id}`);
      } catch {}
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
    <div className="space-y-4">
      {readOnlyBanner}
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1
          className="text-xl font-bold"
          style={{ color: "oklch(var(--navy-dark))" }}
        >
          Planning
        </h1>
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

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("semaine")}
          className="px-4 py-2 rounded-xl font-semibold text-sm transition-colors"
          style={
            activeTab === "semaine"
              ? { backgroundColor: "#0f1e4a", color: "white" }
              : { backgroundColor: "#f3f4f6", color: "#374151" }
          }
          data-ocid="planning.semaine.tab"
        >
          Vue semaine
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("mois")}
          className="px-4 py-2 rounded-xl font-semibold text-sm transition-colors"
          style={
            activeTab === "mois"
              ? { backgroundColor: "#0f1e4a", color: "white" }
              : { backgroundColor: "#f3f4f6", color: "#374151" }
          }
          data-ocid="planning.mois.tab"
        >
          Vue mois
        </button>
      </div>

      {/* Color Legend */}
      <div className="flex items-center gap-4 flex-wrap px-1">
        <span className="text-xs font-semibold text-gray-500">Légende :</span>
        <span className="flex items-center gap-1.5 text-xs text-gray-600">
          <span
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: "#ea580c" }}
          />
          À réaliser
        </span>
        <span className="flex items-center gap-1.5 text-xs text-gray-600">
          <span
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: "#2563eb" }}
          />
          En cours
        </span>
        <span className="flex items-center gap-1.5 text-xs text-gray-600">
          <span
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: "#16a34a" }}
          />
          Réalisé
        </span>
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

      {/* PDF Export buttons */}
      <div className="flex gap-2 flex-wrap">
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs gap-1 border-orange-300 text-orange-700 hover:bg-orange-50"
          onClick={async () => {
            try {
              // Load jsPDF from CDN if not available
              if (!(window as any).jspdf) {
                await new Promise<void>((resolve, reject) => {
                  const s = document.createElement("script");
                  s.src =
                    "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
                  s.onload = () => resolve();
                  s.onerror = () => reject(new Error("Failed to load jsPDF"));
                  document.head.appendChild(s);
                });
              }
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const jsPDF = (window as any).jspdf?.jsPDF;
              if (!jsPDF) throw new Error("jsPDF not available");
              const doc = new jsPDF();
              const today = new Date();
              const todayStr2 = localDateStr(today);
              const dayItems = dateMap.get(selectedDay ?? todayStr2) || [];
              const exportDate = selectedDay ?? todayStr2;
              const filterName =
                filterUserPrincipal !== "all"
                  ? ((profiles as [any, any][]).find(
                      ([p]) => p.toString() === filterUserPrincipal,
                    )?.[1]?.name ?? "Tous")
                  : "Tous";
              doc.setFontSize(14);
              doc.setFont("helvetica", "bold");
              doc.text("Vial Traite Service — Planning", 105, 18, {
                align: "center",
              });
              doc.setFontSize(10);
              doc.setFont("helvetica", "normal");
              doc.text(
                `Date : ${new Date(`${exportDate}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}`,
                14,
                28,
              );
              doc.text(`Intervenant : ${filterName}`, 14, 35);
              doc.setDrawColor(200, 200, 200);
              doc.line(14, 40, 196, 40);
              let y = 48;
              if (dayItems.length === 0) {
                doc.setFontSize(10);
                doc.text("Aucune mission ce jour.", 14, y);
              } else {
                for (const item of dayItems) {
                  doc.setFontSize(10);
                  doc.setFont("helvetica", "bold");
                  doc.text(
                    `${item.clientNom || "Sans client"} — ${item.typeMission === "depannage" ? "Dépannage" : item.typeMission === "controle" ? "Contrôle" : "Chantier"}`,
                    14,
                    y,
                  );
                  y += 6;
                  doc.setFont("helvetica", "normal");
                  doc.text(
                    `Statut : ${item.statut === "execute" ? "Exécuté" : item.statut === "en_cours" ? "En cours" : "À réaliser"}`,
                    18,
                    y,
                  );
                  y += 5;
                  doc.text(`Intervenant : ${item.nomDestinataire}`, 18, y);
                  y += 5;
                  if (item.description) {
                    const lines = doc.splitTextToSize(
                      `Description : ${item.description}`,
                      170,
                    );
                    doc.text(lines, 18, y);
                    y += lines.length * 5;
                  }
                  y += 4;
                  if (y > 270) {
                    doc.addPage();
                    y = 20;
                  }
                }
              }
              doc.setFontSize(9);
              doc.setTextColor(150, 150, 150);
              doc.text(
                "Z.I. du Martinet — 15300 Murat  |  04 71 20 12 22",
                105,
                285,
                { align: "center" },
              );
              doc.save(`planning-jour-${exportDate}.pdf`);
            } catch {
              toast.error("Erreur lors de l'export PDF");
            }
          }}
          data-ocid="planning.pdf_jour.button"
        >
          📄 PDF Jour
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs gap-1 border-blue-300 text-blue-700 hover:bg-blue-50"
          onClick={async () => {
            try {
              // Load jsPDF from CDN if not available
              if (!(window as any).jspdf) {
                await new Promise<void>((resolve, reject) => {
                  const s = document.createElement("script");
                  s.src =
                    "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
                  s.onload = () => resolve();
                  s.onerror = () => reject(new Error("Failed to load jsPDF"));
                  document.head.appendChild(s);
                });
              }
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const jsPDF = (window as any).jspdf?.jsPDF;
              if (!jsPDF) throw new Error("jsPDF not available");
              const doc = new jsPDF();
              const today = new Date();
              const getMonday2 = (d: Date) => {
                const day = d.getDay();
                const diff = d.getDate() - day + (day === 0 ? -6 : 1);
                return new Date(d.getFullYear(), d.getMonth(), diff);
              };
              const monday = getMonday2(today);
              const weekDays2 = Array.from({ length: 7 }, (_, i) => {
                const d = new Date(monday);
                d.setDate(monday.getDate() + i);
                return d;
              });
              const filterName =
                filterUserPrincipal !== "all"
                  ? ((profiles as [any, any][]).find(
                      ([p]) => p.toString() === filterUserPrincipal,
                    )?.[1]?.name ?? "Tous")
                  : "Tous";
              const weekStr = `${weekDays2[0].toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} — ${weekDays2[6].toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}`;
              doc.setFontSize(14);
              doc.setFont("helvetica", "bold");
              doc.text("Vial Traite Service — Planning Semaine", 105, 18, {
                align: "center",
              });
              doc.setFontSize(10);
              doc.setFont("helvetica", "normal");
              doc.text(`Semaine : ${weekStr}`, 14, 28);
              doc.text(`Intervenant : ${filterName}`, 14, 35);
              doc.setDrawColor(200, 200, 200);
              doc.line(14, 40, 196, 40);
              let y = 48;
              for (const day of weekDays2) {
                const ds = localDateStr(day);
                const dayMissions = dateMap.get(ds) || [];
                doc.setFontSize(11);
                doc.setFont("helvetica", "bold");
                doc.text(
                  day.toLocaleDateString("fr-FR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  }),
                  14,
                  y,
                );
                y += 6;
                if (dayMissions.length === 0) {
                  doc.setFontSize(9);
                  doc.setFont("helvetica", "italic");
                  doc.text("Aucune mission", 18, y);
                  y += 5;
                } else {
                  for (const item of dayMissions) {
                    doc.setFontSize(9);
                    doc.setFont("helvetica", "bold");
                    doc.text(
                      `• ${item.clientNom || "Sans client"} (${item.typeMission === "depannage" ? "Dépannage" : item.typeMission === "controle" ? "Contrôle" : "Chantier"}) — ${item.nomDestinataire}`,
                      18,
                      y,
                    );
                    y += 5;
                    doc.setFont("helvetica", "normal");
                    doc.text(
                      `  Statut : ${item.statut === "execute" ? "Exécuté" : item.statut === "en_cours" ? "En cours" : "À réaliser"}`,
                      18,
                      y,
                    );
                    y += 4;
                    if (y > 270) {
                      doc.addPage();
                      y = 20;
                    }
                  }
                }
                y += 4;
                doc.setDrawColor(230, 230, 230);
                doc.line(14, y, 196, y);
                y += 5;
                if (y > 265) {
                  doc.addPage();
                  y = 20;
                }
              }
              doc.setFontSize(9);
              doc.setTextColor(150, 150, 150);
              doc.text(
                "Z.I. du Martinet — 15300 Murat  |  04 71 20 12 22",
                105,
                285,
                { align: "center" },
              );
              const weekNum = Math.ceil(
                (monday.getTime() -
                  new Date(monday.getFullYear(), 0, 1).getTime()) /
                  604800000,
              );
              doc.save(
                `planning-semaine-${monday.getFullYear()}-S${weekNum}.pdf`,
              );
            } catch {
              toast.error("Erreur lors de l'export PDF");
            }
          }}
          data-ocid="planning.pdf_semaine.button"
        >
          📄 PDF Semaine
        </Button>
      </div>

      {activeTab === "mois" && (
        <>
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
                          className="w-3 h-3 rounded-full flex-shrink-0"
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
                  {new Date(`${selectedDay}T12:00:00`).toLocaleDateString(
                    "fr-FR",
                    {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    },
                  )}
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
                              {TYPE_LABELS[item.typeMission] ||
                                item.typeMission}
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
                          {item.clientAdresse && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              📍 {item.clientAdresse}
                            </p>
                          )}
                          {(() => {
                            const missionClient = clients.find(
                              (c) =>
                                c.nom.toLowerCase().trim() ===
                                item.clientNom.toLowerCase().trim(),
                            );
                            return missionClient?.telephone ? (
                              <a
                                href={`tel:${missionClient.telephone}`}
                                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mt-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Phone className="w-3 h-3" />
                                <span>{missionClient.telephone}</span>
                              </a>
                            ) : null;
                          })()}
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

                        {item.destinataire?.toString() ===
                          callerPrincipalStr && (
                          <>
                            {item.statut === "a_realiser" && (
                              <Button
                                size="sm"
                                className="h-7 px-2 text-xs text-white font-semibold"
                                style={{ backgroundColor: "#f97316" }}
                                onClick={async () => {
                                  if (!actor) return;
                                  try {
                                    await actor.accepterPlanningItem(item.id);
                                    queryClient.invalidateQueries({
                                      queryKey: ["planningItems"],
                                    });
                                    const { toast } = await import("sonner");
                                    toast.success("Mission acceptée");
                                  } catch (e: any) {
                                    const { toast } = await import("sonner");
                                    toast.error(
                                      `Erreur : ${e?.message ?? String(e)}`,
                                    );
                                  }
                                }}
                                data-ocid={`planning.accept_button.${idx + 1}`}
                              >
                                ✓ Accepter
                              </Button>
                            )}
                            {item.statut === "en_cours" && (
                              <Button
                                size="sm"
                                className="h-7 px-2 text-xs text-white font-semibold"
                                style={{ backgroundColor: "#2563eb" }}
                                onClick={() => setShowInterventionModal(item)}
                                data-ocid={`planning.fiche_button.${idx + 1}`}
                              >
                                📋 Fiche intervention
                              </Button>
                            )}
                            {item.statut === "execute" && (
                              <Button
                                size="sm"
                                className="h-7 px-2 text-xs text-white font-semibold"
                                style={{ backgroundColor: "#16a34a" }}
                                onClick={() => setShowInterventionModal(item)}
                                data-ocid={`planning.modifier_fiche_button.${idx + 1}`}
                              >
                                ✏️ Modifier la fiche
                              </Button>
                            )}
                          </>
                        )}
                        {isOwner(item) && (
                          <div className="flex flex-col gap-1 flex-shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => setDeleteConfirm(item.id)}
                              data-ocid={`planning.month.delete_button.${idx + 1}`}
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              Supprimer
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {activeTab === "semaine" && (
        <VueSemaine
          allItems={filteredItems}
          profiles={profiles as [any, any][]}
          clients={clients}
          callerPrincipalStr={callerPrincipalStr}
          actor={actor}
          queryClient={queryClient}
          callerPrincipal={callerPrincipal}
          handleDelete={handleDelete}
          onRemplirFiche={(item) => setShowInterventionModal(item)}
          filterUserPrincipal={filterUserPrincipal}
        />
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

      {showInterventionModal && (
        <PlanningInterventionModal
          open={!!showInterventionModal}
          onClose={() => setShowInterventionModal(null)}
          missionId={showInterventionModal.id}
          destinatairePrincipal={showInterventionModal.destinataire}
          interventionId={`intv-plan-${showInterventionModal.id}`}
          creatorPrincipalStr={showInterventionModal.createur?.toString()}
          currentUserPrincipalStr={callerPrincipalStr}
          prefill={{
            clientNom: showInterventionModal.clientNom,
            clientAdresse: showInterventionModal.clientAdresse ?? "",
            description: showInterventionModal.description ?? "",
            date:
              showInterventionModal.dates?.[0] ??
              BigInt(Date.now()) * BigInt(1_000_000),
          }}
        />
      )}
    </div>
  );
}

// VueSemaine: weekly table view
interface VueSemaineProps {
  allItems: DayItem[];
  profiles: [any, any][];
  clients: Client[];
  callerPrincipalStr: string;
  actor: any;
  queryClient: any;
  callerPrincipal: any;
  handleDelete: (id: string) => Promise<void>;
  onRemplirFiche: (item: DayItem) => void;
  filterUserPrincipal?: string;
}

function VueSemaine({
  allItems,
  profiles,
  clients,
  callerPrincipalStr,
  actor,
  queryClient,
  callerPrincipal,
  handleDelete,
  onRemplirFiche,
  filterUserPrincipal = "all",
}: VueSemaineProps) {
  const today = new Date();
  const todayStr = localDateStr(today);

  // Get monday of current week
  const getMonday = (d: Date): Date => {
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.getFullYear(), d.getMonth(), diff);
  };

  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()));
  const [activeCell, setActiveCell] = useState<{
    userPrincipal: string;
    dateStr: string;
  } | null>(null);
  const [createForm, setCreateForm] = useState({
    clientNom: "",
    typeMission: "depannage",
    description: "",
  });
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [createExtraDates, setCreateExtraDates] = useState<string[]>([]);
  const [showAddDaysFor, setShowAddDaysFor] = useState<string | null>(null);
  const [addDaysSelection, setAddDaysSelection] = useState<string[]>([]);
  const [expandedDescIds, setExpandedDescIds] = useState<Set<string>>(
    new Set(),
  );

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const prevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d);
  };

  const nextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
  };

  const formatWeekHeader = () => {
    const end = weekDays[6];
    const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
    const startFmt = weekDays[0].toLocaleDateString("fr-FR", opts);
    const endFmt = end.toLocaleDateString("fr-FR", opts);
    return `${startFmt} — ${endFmt} ${end.getFullYear()}`;
  };

  const DAY_SHORT = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

  const dateMap = useMemo(() => {
    const map = new Map<string, DayItem[]>();
    for (const item of allItems) {
      for (const d of item.dates || []) {
        const ds = toDateStr(d);
        if (!map.has(ds)) map.set(ds, []);
        map.get(ds)!.push(item);
      }
    }
    return map;
  }, [allItems]);

  const getCellItems = (userPrincipal: string, dateStr: string): DayItem[] => {
    const items = dateMap.get(dateStr) || [];
    return items.filter(
      (item) => item.destinataire?.toString() === userPrincipal,
    );
  };

  const isOwner = (item: DayItem) => {
    if (!callerPrincipalStr) return false;
    return (
      item.createur?.toString() === callerPrincipalStr ||
      item.destinataire?.toString() === callerPrincipalStr
    );
  };

  const handleCreate = async (userPrincipal: string, dateStr: string) => {
    if (!actor || !callerPrincipal) return;
    const targetProfile = profiles.find(
      ([p]) => p.toString() === userPrincipal,
    );
    if (!targetProfile) {
      toast.error("Intervenant introuvable");
      return;
    }
    setSaving(true);
    try {
      const nomDestinataire = targetProfile[1].name;
      const callerProfile = profiles.find(
        ([p]) => p.toString() === callerPrincipal.toString(),
      );
      const nomCreateur = callerProfile ? callerProfile[1].name : "";
      const typeMission = createForm.typeMission;
      const generatedTitre = `${TYPE_LABELS[typeMission] || typeMission}${createForm.clientNom ? ` — ${createForm.clientNom}` : ""}`;
      // Collect all dates: clicked date + extra dates
      const allDates = Array.from(new Set([dateStr, ...createExtraDates]));
      for (const dStr of allDates) {
        const did = generateId();
        const dNs = dateToNs(dStr);
        await actor.creerPlanningItem(
          did,
          generatedTitre,
          [dNs],
          targetProfile[0],
          nomDestinataire,
          nomCreateur,
          createForm.clientNom.trim(),
          typeMission,
          createForm.description.trim(),
        );
        if (selectedClient?.adresse) {
          try {
            await (actor as any).setPlanningClientAdresse(
              did,
              selectedClient.adresse,
            );
          } catch {}
        }
      }
      queryClient.invalidateQueries({ queryKey: ["planningItems"] });
      setActiveCell(null);
      setCreateForm({
        clientNom: "",
        typeMission: "depannage",
        description: "",
      });
      setSelectedClient(null);
      setCreateExtraDates([]);
      toast.success(
        allDates.length > 1
          ? `${allDates.length} missions créées`
          : "Mission créée",
      );
    } catch {
      toast.error("Erreur lors de la création");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Week navigation */}
      <div className="flex items-center justify-between px-1">
        <button
          type="button"
          onClick={prevWeek}
          className="p-2 rounded-lg hover:bg-gray-100"
          data-ocid="planning.week.pagination_prev"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <span className="font-semibold text-sm" style={{ color: "#0f1e4a" }}>
          {formatWeekHeader()}
        </span>
        <button
          type="button"
          onClick={nextWeek}
          className="p-2 rounded-lg hover:bg-gray-100"
          data-ocid="planning.week.pagination_next"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Table container */}
      <div className="overflow-x-auto rounded-2xl border border-gray-200 shadow bg-white">
        <table className="w-full min-w-[700px] border-collapse">
          <thead>
            <tr>
              <th
                className="text-left px-3 py-3 text-xs font-bold text-white w-28 border-r border-blue-800"
                style={{ backgroundColor: "#0f1e4a" }}
              >
                Intervenant
              </th>
              {weekDays.map((d, i) => {
                const ds = localDateStr(d);
                const isToday = ds === todayStr;
                return (
                  <th
                    key={ds}
                    className="px-2 py-3 text-sm font-bold text-white text-center border-r border-blue-800 last:border-r-0"
                    style={{ backgroundColor: isToday ? "#ea580c" : "#0f1e4a" }}
                  >
                    <div>{DAY_SHORT[i]}</div>
                    <div className="text-xs font-normal opacity-80">
                      {d.toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                      })}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {profiles.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="text-center py-8 text-gray-400 text-sm"
                  data-ocid="planning.semaine.empty_state"
                >
                  Aucun intervenant disponible
                </td>
              </tr>
            ) : (
              profiles
                .filter(
                  ([principal]) =>
                    filterUserPrincipal === "all" ||
                    principal.toString() === filterUserPrincipal,
                )
                .map(([principal, profile], rowIdx) => {
                  const principalStr = principal.toString();
                  return (
                    <tr key={principalStr} className="border-t border-gray-100">
                      <td
                        className="px-3 py-3 font-semibold text-base border-r border-gray-200 bg-gray-50 align-top"
                        style={{ color: "#0f1e4a" }}
                        data-ocid={`planning.semaine.row.${rowIdx + 1}`}
                      >
                        {profile.name || "Utilisateur"}
                      </td>
                      {weekDays.map((d) => {
                        const ds = localDateStr(d);
                        const isToday = ds === todayStr;
                        const cellItems = getCellItems(principalStr, ds);
                        const isActive =
                          activeCell?.userPrincipal === principalStr &&
                          activeCell?.dateStr === ds;

                        return (
                          <td
                            key={ds}
                            className={[
                              "px-2 py-2 align-top border-r border-gray-100 last:border-r-0 min-w-[160px]",
                              isToday ? "bg-orange-50" : "bg-white",
                            ].join(" ")}
                            style={{ verticalAlign: "top" }}
                          >
                            {/* Inline create form */}
                            {isActive && (
                              <div className="bg-white border border-orange-200 rounded-lg p-2 shadow-md space-y-2">
                                <div>
                                  <span className="text-xs text-gray-500 block mb-0.5">
                                    Client
                                  </span>
                                  <ClientAutocomplete
                                    value={createForm.clientNom}
                                    clients={clients}
                                    onSelect={(c) => {
                                      setSelectedClient(c);
                                      setCreateForm((f) => ({
                                        ...f,
                                        clientNom: c.nom,
                                      }));
                                    }}
                                    onManual={(name) => {
                                      setSelectedClient(null);
                                      setCreateForm((f) => ({
                                        ...f,
                                        clientNom: name,
                                      }));
                                    }}
                                  />
                                  {selectedClient && (
                                    <ClientInfoCard client={selectedClient} />
                                  )}
                                </div>
                                <div>
                                  <span className="text-xs text-gray-500 block mb-0.5">
                                    Type
                                  </span>
                                  <select
                                    className="w-full text-xs border border-gray-200 rounded px-2 py-1.5"
                                    value={createForm.typeMission}
                                    onChange={(e) =>
                                      setCreateForm((f) => ({
                                        ...f,
                                        typeMission: e.target.value,
                                      }))
                                    }
                                  >
                                    <option value="depannage">Dépannage</option>
                                    <option value="controle">Contrôle</option>
                                    <option value="chantier">Chantier</option>
                                  </select>
                                </div>
                                <div>
                                  <span className="text-xs text-gray-500 block mb-0.5">
                                    Description
                                  </span>
                                  <textarea
                                    className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 resize-none"
                                    rows={2}
                                    value={createForm.description}
                                    onChange={(e) =>
                                      setCreateForm((f) => ({
                                        ...f,
                                        description: e.target.value,
                                      }))
                                    }
                                    placeholder="Description..."
                                  />
                                </div>
                                <div>
                                  <span className="text-xs text-gray-500 block mb-0.5">
                                    Autres jours
                                  </span>
                                  <DateMultiPicker
                                    selected={createExtraDates}
                                    onChange={setCreateExtraDates}
                                    excludeDate={ds}
                                  />
                                </div>
                                <div className="flex gap-1">
                                  <button
                                    type="button"
                                    disabled={saving}
                                    onClick={() =>
                                      handleCreate(principalStr, ds)
                                    }
                                    className="flex-1 text-xs text-white font-semibold py-1.5 rounded"
                                    style={{ backgroundColor: "#ea580c" }}
                                    data-ocid="planning.semaine.create_button"
                                  >
                                    {saving ? "..." : "Ajouter"}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveCell(null);
                                      setCreateForm({
                                        clientNom: "",
                                        typeMission: "depannage",
                                        description: "",
                                      });
                                      setSelectedClient(null);
                                      setCreateExtraDates([]);
                                    }}
                                    className="flex-1 text-xs text-gray-600 border border-gray-200 py-1.5 rounded hover:bg-gray-50"
                                    data-ocid="planning.semaine.cancel_button"
                                  >
                                    Annuler
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Missions list */}
                            {cellItems.map((item, mIdx) => {
                              return (
                                <div
                                  key={item.id}
                                  data-ocid={`planning.semaine.item.${mIdx + 1}`}
                                >
                                  <div
                                    className="w-full text-left rounded-lg px-3 py-2.5 mb-1 border"
                                    style={{
                                      borderColor:
                                        item.statut === "execute"
                                          ? "#16a34a"
                                          : item.statut === "en_cours"
                                            ? "#2563eb"
                                            : "#ea580c",
                                      backgroundColor:
                                        item.statut === "execute"
                                          ? "#f0fdf4"
                                          : item.statut === "en_cours"
                                            ? "#eff6ff"
                                            : "#fff7ed",
                                    }}
                                    data-ocid={`planning.semaine.mission.${mIdx + 1}`}
                                  >
                                    <div className="flex items-center gap-1 mb-0.5">
                                      <span
                                        className="w-3 h-3 rounded-full flex-shrink-0"
                                        style={{
                                          backgroundColor:
                                            item.statut === "execute"
                                              ? "#16a34a"
                                              : item.statut === "en_cours"
                                                ? "#2563eb"
                                                : "#ea580c",
                                        }}
                                      />
                                      <span
                                        className="text-sm font-semibold break-words"
                                        style={{
                                          color: "#0f1e4a",
                                        }}
                                      >
                                        {item.clientNom || "Sans client"}
                                      </span>
                                    </div>
                                    <span className="text-xs text-gray-500">
                                      {TYPE_LABELS[item.typeMission] ||
                                        item.typeMission}
                                    </span>
                                    {item.clientAdresse && (
                                      <span
                                        className="text-gray-400 block truncate"
                                        style={{
                                          maxWidth: "90px",
                                          fontSize: "10px",
                                        }}
                                      >
                                        📍 {item.clientAdresse}
                                      </span>
                                    )}
                                    {(() => {
                                      const mc = clients.find(
                                        (c) =>
                                          c.nom.toLowerCase().trim() ===
                                          item.clientNom.toLowerCase().trim(),
                                      );
                                      return mc?.telephone ? (
                                        <a
                                          href={`tel:${mc.telephone}`}
                                          className="flex items-center gap-0.5 text-xs text-blue-600 hover:text-blue-800"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <Phone className="w-3 h-3" />
                                          <span
                                            className="truncate"
                                            style={{ maxWidth: "80px" }}
                                          >
                                            {mc.telephone}
                                          </span>
                                        </a>
                                      ) : null;
                                    })()}
                                    {item.destinataire?.toString() ===
                                      callerPrincipalStr && (
                                      <div className="mt-1 flex flex-col gap-0.5">
                                        {item.statut === "a_realiser" && (
                                          <button
                                            type="button"
                                            onClick={async (e) => {
                                              e.stopPropagation();
                                              if (!actor) return;
                                              try {
                                                await actor.accepterPlanningItem(
                                                  item.id,
                                                );
                                                queryClient.invalidateQueries({
                                                  queryKey: ["planningItems"],
                                                });
                                                const { toast } = await import(
                                                  "sonner"
                                                );
                                                toast.success(
                                                  "Mission acceptée",
                                                );
                                              } catch (err: any) {
                                                const { toast } = await import(
                                                  "sonner"
                                                );
                                                toast.error(
                                                  `Erreur : ${err?.message ?? String(err)}`,
                                                );
                                              }
                                            }}
                                            className="text-sm text-white px-2 py-1 rounded font-medium"
                                            style={{
                                              backgroundColor: "#f97316",
                                            }}
                                            data-ocid={`planning.semaine.accept_button.${mIdx + 1}`}
                                          >
                                            ✓ Accepter
                                          </button>
                                        )}
                                        {item.statut === "en_cours" && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              onRemplirFiche(item);
                                            }}
                                            className="text-sm text-white px-2 py-1 rounded font-medium"
                                            style={{
                                              backgroundColor: "#2563eb",
                                            }}
                                            data-ocid={`planning.semaine.fiche_button.${mIdx + 1}`}
                                          >
                                            📋 Fiche
                                          </button>
                                        )}
                                        {item.statut === "execute" && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              onRemplirFiche(item);
                                            }}
                                            className="text-sm text-white px-2 py-1 rounded font-medium"
                                            style={{
                                              backgroundColor: "#16a34a",
                                            }}
                                            data-ocid={`planning.semaine.modifier_button.${mIdx + 1}`}
                                          >
                                            ✏️ Fiche
                                          </button>
                                        )}
                                      </div>
                                    )}
                                    {item.description && (
                                      <div className="mt-1">
                                        <p
                                          className="text-xs text-gray-600"
                                          style={
                                            expandedDescIds.has(item.id)
                                              ? {}
                                              : {
                                                  display: "-webkit-box",
                                                  WebkitLineClamp: 2,
                                                  WebkitBoxOrient: "vertical",
                                                  overflow: "hidden",
                                                }
                                          }
                                        >
                                          {item.description}
                                        </p>
                                        {item.description.length > 80 && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setExpandedDescIds((prev) => {
                                                const next = new Set(prev);
                                                if (next.has(item.id))
                                                  next.delete(item.id);
                                                else next.add(item.id);
                                                return next;
                                              });
                                            }}
                                            className="text-xs text-blue-500 hover:text-blue-700 mt-0.5"
                                            data-ocid={`planning.semaine.desc_toggle.${mIdx + 1}`}
                                          >
                                            {expandedDescIds.has(item.id)
                                              ? "Voir moins"
                                              : "Voir plus"}
                                          </button>
                                        )}
                                      </div>
                                    )}
                                    {isOwner(item) && (
                                      <div className="mt-1 flex gap-0.5">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setShowAddDaysFor(item.id);
                                            setAddDaysSelection([]);
                                          }}
                                          className="flex-1 text-xs px-1 py-0.5 rounded border border-orange-300 hover:bg-orange-50 text-orange-600"
                                          data-ocid={`planning.semaine.add_days_button.${mIdx + 1}`}
                                        >
                                          + Jours
                                        </button>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setDeleteConfirm(item.id);
                                          }}
                                          className="flex-1 text-xs px-1 py-0.5 rounded border border-red-300 hover:bg-red-50 text-red-600"
                                          data-ocid={`planning.semaine.delete_button.${mIdx + 1}`}
                                        >
                                          <Trash2 className="w-2.5 h-2.5 inline mr-0.5" />
                                          Supprimer
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}

                            {/* Empty cell click area */}
                            {!isActive && cellItems.length === 0 && (
                              <button
                                type="button"
                                className="w-full h-10 flex items-center justify-center rounded text-gray-300 hover:text-gray-500 hover:bg-gray-50 transition-colors text-lg"
                                onClick={() => {
                                  setActiveCell({
                                    userPrincipal: principalStr,
                                    dateStr: ds,
                                  });
                                  setCreateForm({
                                    clientNom: "",
                                    typeMission: "depannage",
                                    description: "",
                                  });
                                  setSelectedClient(null);
                                }}
                                data-ocid={`planning.semaine.add_button.${rowIdx + 1}`}
                              >
                                +
                              </button>
                            )}
                            {!isActive && cellItems.length > 0 && (
                              <button
                                type="button"
                                className="w-full mt-1 flex items-center justify-center rounded text-gray-300 hover:text-gray-500 hover:bg-gray-50 transition-colors text-sm py-0.5"
                                onClick={() => {
                                  setActiveCell({
                                    userPrincipal: principalStr,
                                    dateStr: ds,
                                  });
                                  setCreateForm({
                                    clientNom: "",
                                    typeMission: "depannage",
                                    description: "",
                                  });
                                  setSelectedClient(null);
                                }}
                                data-ocid={`planning.semaine.add_more_button.${rowIdx + 1}`}
                              >
                                +
                              </button>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
            )}
          </tbody>
        </table>
      </div>

      {/* Add days dialog */}
      <Dialog
        open={!!showAddDaysFor}
        onOpenChange={(o) => !o && setShowAddDaysFor(null)}
      >
        <DialogContent
          className="max-w-sm"
          data-ocid="planning.semaine.add_days_dialog"
        >
          <DialogHeader>
            <DialogTitle>Ajouter sur d’autres jours</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <DateMultiPicker
              selected={addDaysSelection}
              onChange={setAddDaysSelection}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowAddDaysFor(null)}
              data-ocid="planning.semaine.add_days_cancel_button"
            >
              Annuler
            </Button>
            <Button
              disabled={addDaysSelection.length === 0 || saving}
              onClick={async () => {
                if (!showAddDaysFor || !actor || !callerPrincipal) return;
                const srcItem = allItems.find((it) => it.id === showAddDaysFor);
                if (!srcItem) return;
                setSaving(true);
                try {
                  const targetProfile = profiles.find(
                    ([p]) => p.toString() === srcItem.destinataire?.toString(),
                  );
                  const callerProfile = profiles.find(
                    ([p]) => p.toString() === callerPrincipal.toString(),
                  );
                  const nomDestinataire = targetProfile
                    ? targetProfile[1].name
                    : srcItem.nomDestinataire || "";
                  const nomCreateur = callerProfile
                    ? callerProfile[1].name
                    : "";
                  const typeMission = srcItem.typeMission;
                  const generatedTitre = `${TYPE_LABELS[typeMission] || typeMission}${srcItem.clientNom ? ` — ${srcItem.clientNom}` : ""}`;
                  for (const dStr of addDaysSelection) {
                    const did = generateId();
                    const dNs = dateToNs(dStr);
                    await actor.creerPlanningItem(
                      did,
                      generatedTitre,
                      [dNs],
                      srcItem.destinataire!,
                      nomDestinataire,
                      nomCreateur,
                      srcItem.clientNom,
                      typeMission,
                      srcItem.description,
                    );
                    if ((srcItem as any).clientAdresse) {
                      try {
                        await (actor as any).setPlanningClientAdresse(
                          did,
                          (srcItem as any).clientAdresse,
                        );
                      } catch {}
                    }
                  }
                  queryClient.invalidateQueries({
                    queryKey: ["planningItems"],
                  });
                  toast.success(`${addDaysSelection.length} jour(s) ajouté(s)`);
                  setShowAddDaysFor(null);
                  setAddDaysSelection([]);
                } catch {
                  toast.error("Erreur lors de l’ajout");
                } finally {
                  setSaving(false);
                }
              }}
              style={{ backgroundColor: "#ea580c" }}
              className="text-white"
              data-ocid="planning.semaine.add_days_confirm_button"
            >
              {saving ? "..." : `Ajouter (${addDaysSelection.length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog
        open={!!deleteConfirm}
        onOpenChange={(o) => !o && setDeleteConfirm(null)}
      >
        <DialogContent
          className="max-w-sm"
          data-ocid="planning.semaine.delete_dialog"
        >
          <DialogHeader>
            <DialogTitle>Supprimer la mission</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 py-2">
            Êtes-vous sûr de vouloir supprimer cette mission ?
          </p>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
              data-ocid="planning.semaine.delete_cancel_button"
            >
              Annuler
            </Button>
            <Button
              onClick={() => {
                if (deleteConfirm) {
                  handleDelete(deleteConfirm);
                  setDeleteConfirm(null);
                }
              }}
              className="text-white bg-red-600 hover:bg-red-700"
              data-ocid="planning.semaine.delete_confirm_button"
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
  excludeDate?: string;
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
