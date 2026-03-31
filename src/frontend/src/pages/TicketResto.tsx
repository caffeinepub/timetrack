import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Plus,
  Search,
  Trash2,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { TicketResto as TR } from "../backend";
import { useAccessControlContext } from "../contexts/AccessControlContext";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

const JOURS = [
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
  "Dimanche",
];

function getISOWeek(date: Date): number {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function getISOYear(date: Date): number {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  return d.getUTCFullYear();
}

function getWeekKey(year: number, week: number): string {
  return `${year}-W${String(week).padStart(2, "0")}`;
}

function getMondayOfWeek(year: number, week: number): Date {
  const jan4 = new Date(year, 0, 4);
  const dow = jan4.getDay() || 7;
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - dow + 1 + (week - 1) * 7);
  return monday;
}

function formatDateShort(date: Date): string {
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

function formatDateFull(date: Date): string {
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function exportWeekPdf(
  tickets: TR[],
  weekKey: string,
  monday: Date,
  profileNameMap: Map<string, string>,
) {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const byUser = new Map<
    string,
    { name: string; total: number; rows: string }
  >();
  for (const t of tickets) {
    const uid = t.userId.toString();
    if (!byUser.has(uid)) {
      byUser.set(uid, {
        name: profileNameMap.get(uid) ?? t.nomUtilisateur ?? "Utilisateur",
        total: 0,
        rows: "",
      });
    }
    const entry = byUser.get(uid)!;
    entry.total += t.montant;
  }

  let usersHtml = "";
  for (const [uid, { name, total }] of byUser.entries()) {
    const userTickets = tickets.filter((t) => t.userId.toString() === uid);
    const rows = JOURS.map((jour) => {
      const dayTickets = userTickets.filter((t) => t.jourSemaine === jour);
      const montant = dayTickets.reduce((s, t) => s + t.montant, 0);
      return `<tr><td style="padding:6px 10px;border-bottom:1px solid #eee">${jour}</td><td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right">${montant > 0 ? `${montant.toFixed(2)} €` : "—"}</td></tr>`;
    }).join("");
    usersHtml += `
      <div style="margin-bottom:24px">
        <h3 style="font-size:14px;font-weight:bold;color:#0f1e4a;margin-bottom:8px">${name}</h3>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead><tr style="background:#f0f4f8">
            <th style="padding:6px 10px;text-align:left">Jour</th>
            <th style="padding:6px 10px;text-align:right">Montant</th>
          </tr></thead>
          <tbody>${rows}</tbody>
          <tfoot><tr style="background:#0f1e4a;color:#fff">
            <td style="padding:8px 10px;font-weight:bold">Total semaine</td>
            <td style="padding:8px 10px;text-align:right;font-weight:bold">${total.toFixed(2)} €</td>
          </tr></tfoot>
        </table>
      </div>`;
  }

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head>
    <meta charset="utf-8"/>
    <title>Tickets Resto - Semaine ${weekKey}</title>
    <style>body { font-family: Arial, sans-serif; margin: 30px; color: #222; font-size: 13px; }</style>
  </head><body>
    <div style="background:#0f1e4a;color:#fff;padding:12px 16px;border-radius:8px;margin-bottom:20px;display:flex;align-items:center;gap:14px">
      <img src="/assets/generated/vache-logo-transparent.dim_300x300.png" style="width:50px;height:50px" alt="Logo" />
      <div>
        <div style="font-size:18px;font-weight:800">Vial Traite Service</div>
        <div style="font-size:12px;opacity:0.8">Tickets Restaurant</div>
      </div>
    </div>
    <h2 style="font-size:16px;margin-bottom:4px">Semaine ${weekKey}</h2>
    <p style="color:#666;font-size:12px;margin-bottom:20px">Du ${formatDateFull(monday)} au ${formatDateFull(sunday)}</p>
    ${usersHtml}
    <div style="margin-top:30px;padding-top:10px;border-top:1px solid #ccc;text-align:center;font-size:11px;color:#888">
      Z.I. du Martinet — 15300 Murat<br/><br/>04 71 20 12 22
    </div>
  </body></html>`);
  win.document.close();
  setTimeout(() => win.print(), 500);
}

export default function TicketRestoPage({
  readOnly = false,
}: { readOnly?: boolean }) {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  const today = new Date();
  const [selectedWeek, setSelectedWeek] = useState({
    year: getISOYear(today),
    week: getISOWeek(today),
  });

  const [filterName, setFilterName] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const [addingDay, setAddingDay] = useState<string | null>(null);
  const [montantInput, setMontantInput] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const monday = getMondayOfWeek(selectedWeek.year, selectedWeek.week);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const currentWeekKey = getWeekKey(selectedWeek.year, selectedWeek.week);

  const { data: allProfiles = [] } = useQuery({
    queryKey: ["allProfiles"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.obtenirTousLesProfils();
    },
    enabled: !!actor && !actorFetching,
  });

  const profileNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const [principal, profile] of allProfiles as any[]) {
      map.set(principal.toString(), profile.name || "Utilisateur");
    }
    return map;
  }, [allProfiles]);

  const { data: allTickets = [], isLoading } = useQuery<TR[]>({
    queryKey: ["ticketsResto"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.obtenirTicketsResto();
    },
    enabled: !!actor && !actorFetching,
  });

  const weekTickets = useMemo(() => {
    let list = allTickets.filter((t) => t.semaineKey === currentWeekKey);
    if (filterName.trim()) {
      const s = filterName.trim().toLowerCase();
      list = list.filter((t) => {
        const name =
          profileNameMap.get(t.userId.toString()) ?? t.nomUtilisateur ?? "";
        return name.toLowerCase().includes(s);
      });
    }
    if (filterDateFrom) {
      const from = new Date(filterDateFrom).getTime();
      list = list.filter((t) => Number(t.date) / 1_000_000 >= from);
    }
    if (filterDateTo) {
      const to = new Date(filterDateTo).getTime() + 86400000;
      list = list.filter((t) => Number(t.date) / 1_000_000 <= to);
    }
    return list;
  }, [
    allTickets,
    currentWeekKey,
    filterName,
    filterDateFrom,
    filterDateTo,
    profileNameMap,
  ]);

  const byUser = useMemo(() => {
    const map = new Map<string, { name: string; tickets: TR[] }>();
    for (const t of weekTickets) {
      const uid = t.userId.toString();
      if (!map.has(uid)) {
        map.set(uid, {
          name: profileNameMap.get(uid) ?? t.nomUtilisateur ?? "Utilisateur",
          tickets: [],
        });
      }
      map.get(uid)!.tickets.push(t);
    }
    return map;
  }, [weekTickets, profileNameMap]);

  const myPrincipal = identity?.getPrincipal().toString();

  const myWeekTickets = useMemo(
    () => weekTickets.filter((t) => t.userId.toString() === myPrincipal),
    [weekTickets, myPrincipal],
  );
  const myWeekTotal = myWeekTickets.reduce((s, t) => s + t.montant, 0);

  const addMutation = useMutation({
    mutationFn: async ({
      jour,
      montant,
    }: { jour: string; montant: number }) => {
      if (!actor || !identity) throw new Error("Non connecté");
      const dayIndex = JOURS.indexOf(jour);
      const date = new Date(monday);
      date.setDate(monday.getDate() + dayIndex);
      const ticket: TR = {
        id: crypto.randomUUID(),
        userId: identity.getPrincipal(),
        date: BigInt(date.getTime()) * 1_000_000n,
        createdAt: BigInt(Date.now()) * 1_000_000n,
        semaineKey: currentWeekKey,
        jourSemaine: jour,
        nomUtilisateur:
          profileNameMap.get(identity.getPrincipal().toString()) ||
          "Utilisateur",
        montant,
      };
      await actor.ajouterTicketResto(ticket);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticketsResto"] });
      setMontantInput("");
      setAddingDay(null);
      setAddDialogOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error("Non connecté");
      return actor.supprimerTicketResto(id);
    },
    onSuccess: () => {
      setDeletingId(null);
      queryClient.invalidateQueries({ queryKey: ["ticketsResto"] });
    },
  });

  const prevWeek = () => {
    setSelectedWeek((prev) => {
      let w = prev.week - 1;
      let y = prev.year;
      if (w < 1) {
        y -= 1;
        w = getISOWeek(new Date(y, 11, 28));
      }
      return { year: y, week: w };
    });
  };

  const nextWeek = () => {
    setSelectedWeek((prev) => {
      let w = prev.week + 1;
      let y = prev.year;
      const maxWeek = getISOWeek(new Date(y, 11, 28));
      if (w > maxWeek) {
        y += 1;
        w = 1;
      }
      return { year: y, week: w };
    });
  };

  const hasFilters = filterName || filterDateFrom || filterDateTo;

  if (isLoading) {
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
      <div className="flex items-center justify-center h-64">
        {readOnlyBanner}
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-center justify-between">
        <h2
          className="text-lg font-semibold"
          style={{
            borderLeft: "4px solid oklch(var(--vts-green))",
            paddingLeft: "0.75rem",
            color: "oklch(var(--navy))",
          }}
          data-ocid="ticket-resto.section"
        >
          Ticket Resto
        </h2>
        <Button
          size="sm"
          className="h-8 text-xs font-semibold border-0"
          style={{ backgroundColor: "oklch(var(--vts-orange))", color: "#fff" }}
          onClick={() => setAddDialogOpen(true)}
          data-ocid="ticket-resto.open_modal_button"
        >
          <Plus className="w-4 h-4 mr-1" />
          Ajouter
        </Button>
      </div>

      {/* Week navigator */}
      <div
        className="flex items-center justify-between bg-card border rounded-xl px-3 py-2"
        style={{ borderColor: "oklch(var(--vts-green) / 0.4)" }}
      >
        <button
          type="button"
          onClick={prevWeek}
          className="p-1 rounded hover:bg-muted transition-colors"
          aria-label="Semaine précédente"
          data-ocid="ticket-resto.pagination_prev"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <p
            className="text-sm font-bold"
            style={{ color: "oklch(var(--navy))" }}
          >
            Semaine {selectedWeek.week} — {selectedWeek.year}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatDateShort(monday)} → {formatDateShort(sunday)}
          </p>
        </div>
        <button
          type="button"
          onClick={nextWeek}
          className="p-1 rounded hover:bg-muted transition-colors"
          aria-label="Semaine suivante"
          data-ocid="ticket-resto.pagination_next"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Filters */}
      <div
        className="bg-muted/30 rounded-xl border p-3 space-y-2"
        style={{ borderColor: "oklch(var(--vts-green) / 0.3)" }}
      >
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-xs font-medium text-muted-foreground">
            Filtres
          </span>
          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setFilterName("");
                setFilterDateFrom("");
                setFilterDateTo("");
              }}
              className="ml-auto flex items-center gap-1 text-xs text-red-500 hover:text-red-700"
            >
              <X className="w-3 h-3" /> Effacer
            </button>
          )}
        </div>
        <Input
          placeholder="Rechercher par nom utilisateur"
          value={filterName}
          onChange={(e) => setFilterName(e.target.value)}
          className="h-8 text-sm"
          data-ocid="ticket-resto.search_input"
        />
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Du</span>
            <Input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Au</span>
            <Input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
        </div>
      </div>

      {/* My weekly total */}
      {myPrincipal && (
        <div
          className="rounded-xl p-3 flex items-center justify-between"
          style={{ background: "oklch(var(--navy-dark))", color: "#fff" }}
        >
          <span className="text-sm font-medium">Mon total semaine</span>
          <span
            className="text-xl font-extrabold"
            style={{ color: "oklch(var(--vts-orange))" }}
          >
            {myWeekTotal.toFixed(2)} €
          </span>
        </div>
      )}

      {/* Days list */}
      <div className="space-y-2">
        {JOURS.map((jour, dayIdx) => {
          const dayDate = new Date(monday);
          dayDate.setDate(monday.getDate() + dayIdx);
          const dayTickets = weekTickets.filter((t) => t.jourSemaine === jour);
          const dayTotal = dayTickets.reduce((s, t) => s + t.montant, 0);

          return (
            <div
              key={jour}
              className="bg-card border rounded-xl overflow-hidden"
              style={{ borderColor: "oklch(var(--vts-green) / 0.2)" }}
              data-ocid={`ticket-resto.item.${dayIdx + 1}`}
            >
              <div
                className="flex items-center justify-between px-3 py-2"
                style={{ backgroundColor: "oklch(var(--navy-dark) / 0.06)" }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="text-sm font-semibold"
                    style={{ color: "oklch(var(--navy))" }}
                  >
                    {jour}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDateShort(dayDate)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {dayTotal > 0 && (
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: "oklch(var(--vts-green) / 0.2)",
                        color: "oklch(var(--vts-green))",
                      }}
                    >
                      {dayTotal.toFixed(2)} €
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setAddingDay(jour);
                      setMontantInput("");
                      setAddDialogOpen(true);
                    }}
                    className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg transition-colors hover:opacity-80"
                    style={{
                      backgroundColor: "oklch(var(--vts-orange))",
                      color: "#fff",
                    }}
                    data-ocid="ticket-resto.button"
                  >
                    <Plus className="w-3 h-3" />
                    Repas
                  </button>
                </div>
              </div>

              {dayTickets.length > 0 ? (
                <div className="divide-y divide-border">
                  {dayTickets.map((ticket) => {
                    const name =
                      profileNameMap.get(ticket.userId.toString()) ??
                      ticket.nomUtilisateur ??
                      "Utilisateur";
                    const isOwn = ticket.userId.toString() === myPrincipal;
                    const isDeleting = deletingId === ticket.id;

                    return (
                      <div
                        key={ticket.id}
                        className="flex items-center px-3 py-2 gap-2 text-sm"
                      >
                        <Badge
                          variant="secondary"
                          className="text-xs shrink-0"
                          style={{
                            backgroundColor: "oklch(var(--navy) / 0.1)",
                            color: "oklch(var(--navy))",
                          }}
                        >
                          {name}
                        </Badge>
                        <span className="flex-1 font-semibold text-foreground">
                          {ticket.montant.toFixed(2)} €
                        </span>
                        {isOwn && !isDeleting && (
                          <button
                            type="button"
                            onClick={() => setDeletingId(ticket.id)}
                            className="text-red-400 hover:text-red-600 p-1 rounded"
                            aria-label="Supprimer"
                            data-ocid="ticket-resto.delete_button"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {isOwn && isDeleting && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-red-500">
                              Supprimer ?
                            </span>
                            <button
                              type="button"
                              onClick={() => deleteMutation.mutate(ticket.id)}
                              className="text-xs bg-red-500 text-white px-2 py-0.5 rounded font-medium"
                              data-ocid="ticket-resto.confirm_button"
                            >
                              Oui
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingId(null)}
                              className="text-xs border border-border px-2 py-0.5 rounded"
                              data-ocid="ticket-resto.cancel_button"
                            >
                              Non
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground px-3 py-2 italic">
                  Aucun repas
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Per-user totals */}
      {byUser.size > 0 && (
        <div
          className="rounded-xl border p-3 space-y-2"
          style={{ borderColor: "oklch(var(--vts-green) / 0.3)" }}
        >
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Totaux par utilisateur
          </p>
          {Array.from(byUser.entries()).map(([uid, { name, tickets: ut }]) => {
            const total = ut.reduce((s, t) => s + t.montant, 0);
            return (
              <div key={uid} className="flex items-center justify-between">
                <span className="text-sm text-foreground">{name}</span>
                <span
                  className="text-sm font-bold"
                  style={{ color: "oklch(var(--vts-orange))" }}
                >
                  {total.toFixed(2)} €
                </span>
              </div>
            );
          })}
        </div>
      )}

      {weekTickets.length > 0 && (
        <Button
          variant="outline"
          className="w-full h-9 text-sm"
          onClick={() =>
            exportWeekPdf(weekTickets, currentWeekKey, monday, profileNameMap)
          }
          data-ocid="ticket-resto.button"
        >
          <FileText className="w-4 h-4 mr-2" />
          Exporter la semaine en PDF
        </Button>
      )}

      {weekTickets.length === 0 && (
        <div
          className="text-center py-12 text-muted-foreground"
          data-ocid="ticket-resto.empty_state"
        >
          <UtensilsCrossed className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Aucun ticket pour cette semaine</p>
        </div>
      )}

      {/* Add meal dialog */}
      <Dialog
        open={addDialogOpen}
        onOpenChange={(open) => {
          setAddDialogOpen(open);
          if (!open) {
            setAddingDay(null);
            setMontantInput("");
          }
        }}
      >
        <DialogContent
          className="max-w-[calc(100vw-2rem)] sm:max-w-sm"
          data-ocid="ticket-resto.dialog"
        >
          <DialogHeader>
            <DialogTitle>Ajouter un repas</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="jour-select">Jour</Label>
              <select
                id="jour-select"
                value={addingDay ?? ""}
                onChange={(e) => setAddingDay(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                data-ocid="ticket-resto.select"
              >
                <option value="">Choisir un jour…</option>
                {JOURS.map((j) => (
                  <option key={j} value={j}>
                    {j}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="montant-input">Montant (€)</Label>
              <Input
                id="montant-input"
                type="number"
                min="0"
                step="0.01"
                placeholder="Ex: 8.50"
                value={montantInput}
                onChange={(e) => setMontantInput(e.target.value)}
                className="text-base"
                data-ocid="ticket-resto.input"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setAddDialogOpen(false)}
              className="flex-1"
              data-ocid="ticket-resto.cancel_button"
            >
              Annuler
            </Button>
            <Button
              onClick={() => {
                if (!addingDay || !montantInput) return;
                addMutation.mutate({
                  jour: addingDay,
                  montant: Number.parseFloat(montantInput),
                });
              }}
              disabled={!addingDay || !montantInput || addMutation.isPending}
              className="flex-1 border-0"
              style={{
                backgroundColor: "oklch(var(--vts-orange))",
                color: "#fff",
              }}
              data-ocid="ticket-resto.submit_button"
            >
              {addMutation.isPending ? "Ajout..." : "Ajouter"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
