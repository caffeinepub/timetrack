import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Car, FileText, Fuel, Plus, Search, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { TicketEssence as TE, VehiculeDefaut } from "../backend";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

function formatDate(timestamp: bigint): string {
  return new Date(Number(timestamp) / 1_000_000).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function exportTicketPdf(ticket: TE, profileName: string) {
  const date = new Date(Number(ticket.date) / 1_000_000).toLocaleDateString(
    "fr-FR",
    { weekday: "long", day: "numeric", month: "long", year: "numeric" },
  );

  const adBlueHtml =
    ticket.adBlueMontant != null
      ? `<tr><td style="padding:6px 10px;border-bottom:1px solid #eee;font-weight:bold">Montant AdBlue</td><td style="padding:6px 10px;text-align:right;border-bottom:1px solid #eee">${ticket.adBlueMontant.toFixed(2)} €</td></tr>
         ${ticket.adBluePrixLitre != null ? `<tr><td style="padding:6px 10px;border-bottom:1px solid #eee;font-weight:bold">Prix litre AdBlue</td><td style="padding:6px 10px;text-align:right;border-bottom:1px solid #eee">${ticket.adBluePrixLitre.toFixed(3)} €</td></tr>` : ""}`
      : "";

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head>
    <meta charset="utf-8"/>
    <title>Ticket Essence</title>
    <style>body { font-family: Arial, sans-serif; margin: 30px; color: #222; font-size: 13px; }</style>
  </head><body>
    <div style="background:#0f1e4a;color:#fff;padding:12px 16px;border-radius:8px;margin-bottom:20px;display:flex;align-items:center;gap:14px">
      <img src="/assets/generated/vache-logo-transparent.dim_300x300.png" style="width:50px;height:50px" alt="Logo" />
      <div>
        <div style="font-size:18px;font-weight:800">Vial Traite Service</div>
        <div style="font-size:12px;opacity:0.8">Ticket Carburant</div>
      </div>
    </div>
    <div style="display:inline-block;background:#e0f0ff;color:#1d6fa5;padding:2px 8px;border-radius:4px;font-size:12px;margin-bottom:12px">Créé par : ${profileName}</div>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px">
      <tbody>
        <tr><td style="padding:6px 10px;border-bottom:1px solid #eee;font-weight:bold">Date</td><td style="padding:6px 10px;text-align:right;border-bottom:1px solid #eee">${date}</td></tr>
        <tr><td style="padding:6px 10px;border-bottom:1px solid #eee;font-weight:bold">Immatriculation</td><td style="padding:6px 10px;text-align:right;border-bottom:1px solid #eee">${ticket.immatriculation}</td></tr>
        <tr><td style="padding:6px 10px;border-bottom:1px solid #eee;font-weight:bold">Type véhicule</td><td style="padding:6px 10px;text-align:right;border-bottom:1px solid #eee">${ticket.typeVehicule}</td></tr>
        <tr><td style="padding:6px 10px;border-bottom:1px solid #eee;font-weight:bold">Km total</td><td style="padding:6px 10px;text-align:right;border-bottom:1px solid #eee">${String(ticket.kmTotal)} km</td></tr>
        <tr><td style="padding:6px 10px;border-bottom:1px solid #eee;font-weight:bold">Montant</td><td style="padding:6px 10px;text-align:right;border-bottom:1px solid #eee">${ticket.montant.toFixed(2)} €</td></tr>
        <tr><td style="padding:6px 10px;border-bottom:1px solid #eee;font-weight:bold">Prix au litre</td><td style="padding:6px 10px;text-align:right;border-bottom:1px solid #eee">${ticket.prixLitre.toFixed(3)} €</td></tr>
        ${adBlueHtml}
      </tbody>
    </table>
    <div style="margin-top:30px;padding-top:10px;border-top:1px solid #ccc;text-align:center;font-size:11px;color:#888">
      Z.I. du Martinet — 15300 Murat<br/><br/>04 71 20 12 22
    </div>
  </body></html>`);
  win.document.close();
  setTimeout(() => win.print(), 500);
}

interface FormState {
  date: string;
  kmTotal: string;
  immatriculation: string;
  typeVehicule: string;
  montant: string;
  prixLitre: string;
  withAdBlue: boolean;
  adBlueMontant: string;
  adBluePrixLitre: string;
}

function defaultForm(): FormState {
  return {
    date: new Date().toISOString().split("T")[0],
    kmTotal: "",
    immatriculation: "",
    typeVehicule: "",
    montant: "",
    prixLitre: "",
    withAdBlue: false,
    adBlueMontant: "",
    adBluePrixLitre: "",
  };
}

interface VehiculeStats {
  immatriculation: string;
  typeVehicule: string;
  totalMontant: number;
  dernierKm: number;
  nbTickets: number;
}

export default function TicketEssencePage() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(defaultForm());
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [filterName, setFilterName] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const myPrincipal = identity?.getPrincipal().toString();

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

  const { data: allTickets = [], isLoading } = useQuery<TE[]>({
    queryKey: ["ticketsEssence"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.obtenirTicketsEssence();
    },
    enabled: !!actor && !actorFetching,
  });

  const { data: vehiculeDefaut } = useQuery<VehiculeDefaut | null>({
    queryKey: ["vehiculeDefaut"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.obtenirVehiculeDefaut();
    },
    enabled: !!actor && !actorFetching,
  });

  // Calcul récapitulatif par véhicule pour l'utilisateur connecté uniquement
  const myVehiculeStats = useMemo((): VehiculeStats[] => {
    if (!myPrincipal) return [];
    const myTickets = allTickets.filter(
      (t) => t.userId.toString() === myPrincipal,
    );
    const statsMap = new Map<string, VehiculeStats>();
    // Trier par date croissante pour avoir le dernier km
    const sorted = [...myTickets].sort(
      (a, b) => Number(a.date) - Number(b.date),
    );
    for (const t of sorted) {
      const key = t.immatriculation.toUpperCase();
      const existing = statsMap.get(key);
      if (existing) {
        existing.totalMontant += t.montant;
        existing.dernierKm = Number(t.kmTotal);
        existing.nbTickets += 1;
      } else {
        statsMap.set(key, {
          immatriculation: t.immatriculation,
          typeVehicule: t.typeVehicule,
          totalMontant: t.montant,
          dernierKm: Number(t.kmTotal),
          nbTickets: 1,
        });
      }
    }
    return Array.from(statsMap.values());
  }, [allTickets, myPrincipal]);

  const openForm = () => {
    const base = defaultForm();
    if (vehiculeDefaut) {
      base.immatriculation = vehiculeDefaut.immatriculation ?? "";
      base.typeVehicule = vehiculeDefaut.typeVehicule ?? "";
      if (vehiculeDefaut.lastAdBluePrixLitre != null) {
        base.withAdBlue = true;
        base.adBluePrixLitre = vehiculeDefaut.lastAdBluePrixLitre.toFixed(3);
      }
      if (vehiculeDefaut.lastAdBlueMontant != null) {
        base.withAdBlue = true;
        base.adBlueMontant = vehiculeDefaut.lastAdBlueMontant.toFixed(2);
      }
    }
    setForm(base);
    setFormOpen(true);
  };

  const filteredTickets = useMemo(() => {
    let list = [...allTickets].sort((a, b) => Number(b.date) - Number(a.date));
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
  }, [allTickets, filterName, filterDateFrom, filterDateTo, profileNameMap]);

  const hasFilters = filterName || filterDateFrom || filterDateTo;

  const addMutation = useMutation({
    mutationFn: async (f: FormState) => {
      if (!actor || !identity) throw new Error("Non connecté");
      const dateTs = BigInt(new Date(f.date).getTime()) * 1_000_000n;
      const ticket: TE = {
        id: crypto.randomUUID(),
        userId: identity.getPrincipal(),
        date: dateTs,
        createdAt: BigInt(Date.now()) * 1_000_000n,
        immatriculation: f.immatriculation,
        typeVehicule: f.typeVehicule,
        kmTotal: BigInt(f.kmTotal || "0"),
        nomUtilisateur:
          profileNameMap.get(identity.getPrincipal().toString()) ||
          "Utilisateur",
        montant: Number.parseFloat(f.montant) || 0,
        prixLitre: Number.parseFloat(f.prixLitre) || 0,
        adBlueMontant:
          f.withAdBlue && f.adBlueMontant
            ? Number.parseFloat(f.adBlueMontant)
            : undefined,
        adBluePrixLitre:
          f.withAdBlue && f.adBluePrixLitre
            ? Number.parseFloat(f.adBluePrixLitre)
            : undefined,
      };

      const vehicule: VehiculeDefaut = {
        immatriculation: f.immatriculation,
        typeVehicule: f.typeVehicule,
        lastAdBlueMontant:
          f.withAdBlue && f.adBlueMontant
            ? Number.parseFloat(f.adBlueMontant)
            : undefined,
        lastAdBluePrixLitre:
          f.withAdBlue && f.adBluePrixLitre
            ? Number.parseFloat(f.adBluePrixLitre)
            : undefined,
      };

      await Promise.all([
        actor.ajouterTicketEssence(ticket),
        actor.sauverVehiculeDefaut(vehicule),
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticketsEssence"] });
      queryClient.invalidateQueries({ queryKey: ["vehiculeDefaut"] });
      setFormOpen(false);
      setForm(defaultForm());
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error("Non connecté");
      return actor.supprimerTicketEssence(id);
    },
    onSuccess: () => {
      setDeletingId(null);
      queryClient.invalidateQueries({ queryKey: ["ticketsEssence"] });
    },
  });

  const setField = (field: keyof FormState, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
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
          data-ocid="ticket-essence.section"
        >
          Ticket Essence
        </h2>
        <Button
          size="sm"
          className="h-8 text-xs font-semibold border-0"
          style={{ backgroundColor: "oklch(var(--vts-orange))", color: "#fff" }}
          onClick={openForm}
          data-ocid="ticket-essence.open_modal_button"
        >
          <Plus className="w-4 h-4 mr-1" />
          Ajouter
        </Button>
      </div>

      {/* Récapitulatif véhicules — visible uniquement par l'utilisateur connecté */}
      {myVehiculeStats.length > 0 && (
        <div
          className="rounded-xl border p-3 space-y-2"
          style={{
            borderColor: "oklch(var(--vts-orange) / 0.4)",
            backgroundColor: "oklch(var(--vts-orange) / 0.05)",
          }}
          data-ocid="ticket-essence.my_vehicles_recap"
        >
          <div className="flex items-center gap-2 mb-1">
            <Fuel
              className="w-4 h-4"
              style={{ color: "oklch(var(--vts-orange))" }}
            />
            <span
              className="text-xs font-semibold"
              style={{ color: "oklch(var(--navy))" }}
            >
              Mon récapitulatif carburant
            </span>
          </div>
          <div className="space-y-2">
            {myVehiculeStats.map((stats) => (
              <div
                key={stats.immatriculation}
                className="flex items-center justify-between bg-white/70 rounded-lg px-3 py-2 border"
                style={{ borderColor: "oklch(var(--vts-orange) / 0.2)" }}
              >
                <div className="flex items-center gap-2">
                  <Car
                    className="w-4 h-4 shrink-0"
                    style={{ color: "oklch(var(--navy))" }}
                  />
                  <div>
                    <div
                      className="text-xs font-bold"
                      style={{ color: "oklch(var(--navy))" }}
                    >
                      {stats.immatriculation}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {stats.typeVehicule} · {stats.nbTickets} ticket
                      {stats.nbTickets > 1 ? "s" : ""}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className="text-sm font-extrabold"
                    style={{ color: "oklch(var(--vts-orange))" }}
                  >
                    {stats.totalMontant.toFixed(2)} €
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Dernier km :{" "}
                    <span className="font-semibold text-foreground">
                      {stats.dernierKm.toLocaleString("fr-FR")}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
          data-ocid="ticket-essence.search_input"
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

      {/* Ticket list */}
      {filteredTickets.length === 0 ? (
        <div
          className="text-center py-12 text-muted-foreground"
          data-ocid="ticket-essence.empty_state"
        >
          <Fuel className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">
            {hasFilters ? "Aucun ticket correspondant" : "Aucun ticket essence"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTickets.map((ticket, idx) => {
            const profileName =
              profileNameMap.get(ticket.userId.toString()) ??
              ticket.nomUtilisateur ??
              "Utilisateur";
            const isOwn = ticket.userId.toString() === myPrincipal;
            const isDeleting = deletingId === ticket.id;

            return (
              <div
                key={ticket.id ?? idx}
                className="bg-card border rounded-xl p-3 space-y-2"
                style={{ borderColor: "oklch(var(--vts-green) / 0.2)" }}
                data-ocid={`ticket-essence.item.${idx + 1}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant="secondary"
                      className="text-xs"
                      style={{
                        backgroundColor: "oklch(var(--navy) / 0.1)",
                        color: "oklch(var(--navy))",
                      }}
                    >
                      {profileName}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(ticket.date)}
                    </span>
                  </div>
                  <span
                    className="text-base font-extrabold shrink-0"
                    style={{ color: "oklch(var(--vts-orange))" }}
                  >
                    {ticket.montant.toFixed(2)} €
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <div className="flex items-center gap-1">
                    <Car className="w-3 h-3 text-muted-foreground" />
                    <span className="font-medium">
                      {ticket.immatriculation}
                    </span>
                  </div>
                  <div className="text-muted-foreground">
                    {ticket.typeVehicule}
                  </div>
                  <div className="text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {String(ticket.kmTotal)}
                    </span>{" "}
                    km
                  </div>
                  <div className="text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {ticket.prixLitre.toFixed(3)}
                    </span>{" "}
                    €/L
                  </div>
                </div>

                {ticket.adBlueMontant != null && (
                  <div
                    className="flex items-center gap-2 text-xs rounded-lg px-2 py-1"
                    style={{
                      backgroundColor: "oklch(var(--vts-green) / 0.1)",
                      color: "oklch(var(--vts-green))",
                    }}
                  >
                    <span className="font-semibold">AdBlue</span>
                    <span>{ticket.adBlueMontant.toFixed(2)} €</span>
                    {ticket.adBluePrixLitre != null && (
                      <span className="text-muted-foreground">
                        ({ticket.adBluePrixLitre.toFixed(3)} €/L)
                      </span>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => exportTicketPdf(ticket, profileName)}
                    data-ocid="ticket-essence.button"
                  >
                    <FileText className="w-3.5 h-3.5 mr-1" />
                    PDF
                  </Button>

                  {isOwn && !isDeleting && (
                    <button
                      type="button"
                      onClick={() => setDeletingId(ticket.id)}
                      className="ml-auto text-red-400 hover:text-red-600 p-1 rounded"
                      aria-label="Supprimer"
                      data-ocid="ticket-essence.delete_button"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  {isOwn && isDeleting && (
                    <div className="ml-auto flex items-center gap-1">
                      <span className="text-xs text-red-500">Supprimer ?</span>
                      <button
                        type="button"
                        onClick={() => deleteMutation.mutate(ticket.id)}
                        className="text-xs bg-red-500 text-white px-2 py-0.5 rounded font-medium"
                        data-ocid="ticket-essence.confirm_button"
                      >
                        {deleteMutation.isPending ? "..." : "Oui"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingId(null)}
                        className="text-xs border border-border px-2 py-0.5 rounded"
                        data-ocid="ticket-essence.cancel_button"
                      >
                        Non
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add ticket dialog */}
      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setForm(defaultForm());
        }}
      >
        <DialogContent
          className="max-w-[calc(100vw-2rem)] sm:max-w-md max-h-[90vh] overflow-y-auto"
          data-ocid="ticket-essence.dialog"
        >
          <DialogHeader>
            <DialogTitle>Nouveau ticket carburant</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="te-date" className="text-xs">
                  Date *
                </Label>
                <Input
                  id="te-date"
                  type="date"
                  value={form.date}
                  onChange={(e) => setField("date", e.target.value)}
                  className="h-9 text-sm"
                  data-ocid="ticket-essence.input"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="te-km" className="text-xs">
                  Km total *
                </Label>
                <Input
                  id="te-km"
                  type="number"
                  min="0"
                  placeholder="125000"
                  value={form.kmTotal}
                  onChange={(e) => setField("kmTotal", e.target.value)}
                  className="h-9 text-sm"
                  data-ocid="ticket-essence.input"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="te-immat" className="text-xs">
                  Immatriculation *
                </Label>
                <Input
                  id="te-immat"
                  placeholder="AB-123-CD"
                  value={form.immatriculation}
                  onChange={(e) =>
                    setField("immatriculation", e.target.value.toUpperCase())
                  }
                  className="h-9 text-sm"
                  data-ocid="ticket-essence.input"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="te-type" className="text-xs">
                  Type véhicule *
                </Label>
                <Input
                  id="te-type"
                  placeholder="Camion, Voiture…"
                  value={form.typeVehicule}
                  onChange={(e) => setField("typeVehicule", e.target.value)}
                  className="h-9 text-sm"
                  data-ocid="ticket-essence.input"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="te-montant" className="text-xs">
                  Montant (€) *
                </Label>
                <Input
                  id="te-montant"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="80.00"
                  value={form.montant}
                  onChange={(e) => setField("montant", e.target.value)}
                  className="h-9 text-sm"
                  data-ocid="ticket-essence.input"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="te-prix" className="text-xs">
                  Prix/litre (€) *
                </Label>
                <Input
                  id="te-prix"
                  type="number"
                  min="0"
                  step="0.001"
                  placeholder="1.849"
                  value={form.prixLitre}
                  onChange={(e) => setField("prixLitre", e.target.value)}
                  className="h-9 text-sm"
                  data-ocid="ticket-essence.input"
                />
              </div>
            </div>

            {/* AdBlue section */}
            <div
              className="rounded-xl border p-3 space-y-3"
              style={{ borderColor: "oklch(var(--vts-green) / 0.3)" }}
            >
              <div className="flex items-center gap-2">
                <Checkbox
                  id="te-adblue"
                  checked={form.withAdBlue}
                  onCheckedChange={(v) => setField("withAdBlue", !!v)}
                  data-ocid="ticket-essence.checkbox"
                />
                <Label
                  htmlFor="te-adblue"
                  className="text-sm font-medium cursor-pointer"
                >
                  AdBlue
                </Label>
              </div>

              {form.withAdBlue && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="te-ab-montant" className="text-xs">
                      Montant AdBlue (€)
                    </Label>
                    <Input
                      id="te-ab-montant"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="15.00"
                      value={form.adBlueMontant}
                      onChange={(e) =>
                        setField("adBlueMontant", e.target.value)
                      }
                      className="h-9 text-sm"
                      data-ocid="ticket-essence.input"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="te-ab-prix" className="text-xs">
                      Prix litre AdBlue (€)
                    </Label>
                    <Input
                      id="te-ab-prix"
                      type="number"
                      min="0"
                      step="0.001"
                      placeholder="0.399"
                      value={form.adBluePrixLitre}
                      onChange={(e) =>
                        setField("adBluePrixLitre", e.target.value)
                      }
                      className="h-9 text-sm"
                      data-ocid="ticket-essence.input"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setFormOpen(false)}
              className="flex-1"
              data-ocid="ticket-essence.cancel_button"
            >
              Annuler
            </Button>
            <Button
              onClick={() => addMutation.mutate(form)}
              disabled={
                !form.date ||
                !form.kmTotal ||
                !form.immatriculation ||
                !form.typeVehicule ||
                !form.montant ||
                !form.prixLitre ||
                addMutation.isPending
              }
              className="flex-1 border-0"
              style={{
                backgroundColor: "oklch(var(--vts-orange))",
                color: "#fff",
              }}
              data-ocid="ticket-essence.submit_button"
            >
              {addMutation.isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
