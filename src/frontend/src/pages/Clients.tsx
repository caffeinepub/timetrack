import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronUp,
  FileText,
  Image as ImageIcon,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Play,
  Plus,
  Search,
  Trash2,
  UserX,
  Video,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { Client } from "../backend";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useAddClient,
  useDeleteClient,
  useGetClients,
  useToggleBlacklist,
  useUpdateClient,
} from "../hooks/useQueries";

const emptyForm = (): Omit<Client, "id" | "createdAt" | "listeNoire"> & {
  telephone2: string;
} => ({
  nom: "",
  adresse: "",
  telephone: "",
  telephone2: "",
  email: "",
});

function getMediaUrl(media: any): string {
  if (typeof media === "string") return media;
  if (media && typeof media.getDirectURL === "function")
    return media.getDirectURL();
  if (media?.url) return media.url;
  return "";
}

function formatHeure(h: bigint | number, m: bigint | number): string {
  const hh = Number(h);
  const mm = String(Number(m)).padStart(2, "0");
  return `${hh}h${mm}`;
}

function formatDate(timestamp: bigint): string {
  const date = new Date(Number(timestamp) / 1_000_000);
  return date.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function exportInterventionPdf(inv: any, profileName: string) {
  const win = window.open("", "_blank");
  if (!win) return;

  const date = new Date(Number(inv.date) / 1_000_000).toLocaleDateString(
    "fr-FR",
    { weekday: "long", day: "numeric", month: "long", year: "numeric" },
  );

  const piecesHtml =
    inv.pieces && inv.pieces.length > 0
      ? `<table border="1" cellpadding="6" cellspacing="0" style="width:100%;border-collapse:collapse;margin-top:8px">
          <thead><tr style="background:#f0f0f0">
            <th>Référence</th><th>Article</th><th>Quantité</th>
          </tr></thead>
          <tbody>${inv.pieces
            .map(
              (p: any) =>
                `<tr><td>${p.reference}</td><td>${p.article}</td><td>${String(p.quantite)}</td></tr>`,
            )
            .join("")}</tbody>
        </table>`
      : "<p style='color:#888'>Aucune pièce</p>";

  const sigClientHtml = inv.signatureClient
    ? `<img src="${inv.signatureClient}" style="max-width:200px;border:1px solid #ccc" />`
    : "<span style='color:#888'>Non signée</span>";

  const sigIntervHtml = inv.signatureIntervenant
    ? `<img src="${inv.signatureIntervenant}" style="max-width:200px;border:1px solid #ccc" />`
    : "<span style='color:#888'>Non signée</span>";

  win.document.write(`<!DOCTYPE html><html><head>
    <meta charset="utf-8"/>
    <title>Fiche Intervention</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 30px; color: #222; font-size: 13px; }
      h1 { font-size: 18px; margin-bottom: 4px; }
      .badge { display:inline-block; background:#e0f0ff; color:#1d6fa5; padding:2px 8px; border-radius:4px; font-size:12px; margin-bottom:4px; }
      .badge-astreinte { display:inline-block; background:#fff3e0; color:#e65100; padding:2px 8px; border-radius:4px; font-size:12px; margin-bottom:12px; font-weight:bold; }
      .section { margin-bottom: 16px; }
      .label { font-weight: bold; color: #555; }
      table { width:100%; border-collapse:collapse; }
      th, td { border:1px solid #ccc; padding:6px; text-align:left; }
      .sigs { display:flex; gap:40px; margin-top:20px; }
      .sig-block { text-align:center; }
    </style>
  </head><body>
    <div style="background:#0f1e4a;color:#fff;padding:12px 16px;border-radius:8px;margin-bottom:16px;display:flex;align-items:center;gap:14px">
      <img src="/assets/generated/vache-logo-transparent.dim_300x300.png" style="width:56px;height:56px" alt="Logo" />
      <div><div style="font-size:20px;font-weight:800">Vial Traite Service</div><div style="font-size:12px;color:rgba(255,255,255,0.7)">Fiche d'Intervention</div></div>
    </div>
    <div class="badge">Créée par : ${profileName}</div><br/>
    ${inv.estAstreinte ? '<div class="badge-astreinte">ASTREINTE</div>' : ""}
    <div class="section"><span class="label">Date :</span> ${date}</div>
    <div class="section">
      <span class="label">Client :</span> ${inv.clientNom || "—"}<br/>
      <span class="label">Adresse :</span> ${inv.clientAdresse || "—"}
    </div>
    <div class="section">
      <span class="label">Horaires Matin :</span>
      ${formatHeure(inv.heureMatinDebutH, inv.heureMatinDebutMin)} → ${formatHeure(inv.heureMatinFinH, inv.heureMatinFinMin)}<br/>
      <span class="label">Horaires Après-midi :</span>
      ${formatHeure(inv.heureApremDebutH, inv.heureApremDebutMin)} → ${formatHeure(inv.heureApremFinH, inv.heureApremFinMin)}
    </div>
    ${inv.description ? `<div class="section"><span class="label">Description :</span><br/><em>${inv.description}</em></div>` : ""}
    <div class="section"><span class="label">Pièces utilisées :</span>${piecesHtml}</div>
    <div class="sigs">
      <div class="sig-block"><div class="label">Signature Client</div>${sigClientHtml}</div>
      <div class="sig-block"><div class="label">Signature Intervenant</div>${sigIntervHtml}</div>
    </div>
      <div style="margin-top:24px;padding-top:10px;border-top:1px solid #ccc;text-align:center;font-size:11px;color:#888">
        Z.I. du Martinet — 15300 Murat
        <br/><br/>
        04 71 20 12 22
      </div>
  </body></html>`);
  win.document.close();
  setTimeout(() => win.print(), 500);
}

type MediaModalState = { url: string; type: "image" | "video" } | null;

function ClientInterventions({
  clientNom,
  allInterventions,
  currentUserPrincipal,
  actor,
  onInterventionDeleted,
  profileNameMap,
}: {
  clientNom: string;
  allInterventions: any[];
  currentUserPrincipal: string | null;
  actor: any;
  onInterventionDeleted: () => void;
  profileNameMap: Map<string, string>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [mediaModal, setMediaModal] = useState<MediaModalState>(null);
  const [deleteConfirmInterv, setDeleteConfirmInterv] = useState<string | null>(
    null,
  );

  const interventions = useMemo(
    () =>
      allInterventions.filter(
        (inv) =>
          (inv.clientNom || "").toLowerCase() === clientNom.toLowerCase() &&
          inv.valide === true,
      ),
    [allInterventions, clientNom],
  );

  return (
    <div className="mt-2 border-t border-border pt-2">
      {/* Media modal */}
      {mediaModal && (
        <dialog
          open
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center m-0 p-0 max-w-none max-h-none border-0 bg-transparent"
          onClick={() => setMediaModal(null)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setMediaModal(null);
          }}
        >
          <button
            type="button"
            className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/40 rounded-full p-2"
            onClick={(e) => {
              e.stopPropagation();
              setMediaModal(null);
            }}
          >
            <X className="w-5 h-5" />
          </button>
          <div
            className="max-w-[95vw] max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            {mediaModal.type === "image" ? (
              <img
                src={mediaModal.url}
                alt="Aperçu"
                className="max-w-full max-h-[85vh] rounded object-contain"
              />
            ) : (
              <video
                src={mediaModal.url}
                controls
                autoPlay
                className="max-w-full max-h-[85vh] rounded"
              >
                <track kind="captions" />
              </video>
            )}
          </div>
        </dialog>
      )}

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors w-full text-left"
        data-ocid="clients.toggle"
      >
        {expanded ? (
          <ChevronUp className="w-3.5 h-3.5" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5" />
        )}
        Interventions ({interventions.length})
      </button>

      {expanded && (
        <div className="mt-2 space-y-3">
          {interventions.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">
              Aucune intervention validée
            </p>
          ) : (
            interventions.map((inv: any, i: number) => {
              const profileName =
                profileNameMap.get(inv.user?.toString()) ||
                (inv as any).nomUtilisateur ||
                "—";
              const photos: any[] = Array.isArray(inv.photos) ? inv.photos : [];
              const videos: any[] = Array.isArray(inv.videos) ? inv.videos : [];

              return (
                <div
                  key={inv.id ?? i}
                  className="rounded-lg border border-emerald-200 bg-emerald-50/20 p-3 space-y-2"
                  data-ocid={`clients.intervention.item.${i + 1}`}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                        {profileName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(inv.date)}
                      </span>
                      {inv.estAstreinte && (
                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold">
                          ASTREINTE
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs shrink-0"
                        onClick={() => exportInterventionPdf(inv, profileName)}
                        data-ocid={`clients.intervention.secondary_button.${i + 1}`}
                      >
                        <FileText className="w-3 h-3 mr-1" />
                        PDF
                      </Button>
                      {currentUserPrincipal &&
                        inv.user?.toString?.() === currentUserPrincipal && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs shrink-0 text-destructive hover:bg-destructive/10"
                            onClick={() =>
                              setDeleteConfirmInterv(inv.id ?? String(i))
                            }
                            data-ocid={`clients.intervention.delete_button.${i + 1}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                    </div>
                  </div>

                  {/* Horaires */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Matin : </span>
                      {formatHeure(
                        inv.heureMatinDebutH,
                        inv.heureMatinDebutMin,
                      )}{" "}
                      → {formatHeure(inv.heureMatinFinH, inv.heureMatinFinMin)}
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        Après-midi :{" "}
                      </span>
                      {formatHeure(
                        inv.heureApremDebutH,
                        inv.heureApremDebutMin,
                      )}{" "}
                      → {formatHeure(inv.heureApremFinH, inv.heureApremFinMin)}
                    </div>
                  </div>

                  {/* Description */}
                  {inv.description && (
                    <p className="text-xs text-muted-foreground italic border-l-2 border-emerald-200 pl-2">
                      {inv.description}
                    </p>
                  )}

                  {/* Pieces */}
                  {inv.pieces && inv.pieces.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border border-border rounded">
                        <thead>
                          <tr className="bg-muted/50">
                            <th className="text-left px-2 py-1 font-medium text-muted-foreground">
                              Réf.
                            </th>
                            <th className="text-left px-2 py-1 font-medium text-muted-foreground">
                              Article
                            </th>
                            <th className="text-right px-2 py-1 font-medium text-muted-foreground">
                              Qté
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {inv.pieces.map((piece: any, pIdx: number) => (
                            <tr
                              key={`${piece.reference}-${pIdx}`}
                              className="border-t border-border"
                            >
                              <td className="px-2 py-1">{piece.reference}</td>
                              <td className="px-2 py-1">{piece.article}</td>
                              <td className="px-2 py-1 text-right">
                                {String(piece.quantite)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Photos */}
                  {photos.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                        <ImageIcon className="w-3 h-3" /> Photos (
                        {photos.length})
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {photos.map((photo: any, pi: number) => {
                          const url = getMediaUrl(photo);
                          if (!url) return null;
                          return (
                            <button
                              key={url || `photo-${pi}`}
                              type="button"
                              onClick={() =>
                                setMediaModal({ url, type: "image" })
                              }
                              className="w-12 h-12 rounded overflow-hidden border border-border shrink-0 hover:opacity-80 transition-opacity"
                            >
                              <img
                                src={url}
                                alt={`Aperçu ${pi + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Videos */}
                  {videos.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                        <Video className="w-3 h-3" /> Vidéos ({videos.length})
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {videos.map((video: any, vi: number) => {
                          const url = getMediaUrl(video);
                          if (!url) return null;
                          return (
                            <button
                              key={url || `video-${vi}`}
                              type="button"
                              onClick={() =>
                                setMediaModal({ url, type: "video" })
                              }
                              className="relative w-12 h-12 rounded overflow-hidden border border-border shrink-0 bg-black hover:opacity-80 transition-opacity flex items-center justify-center"
                            >
                              <Play className="w-4 h-4 text-white" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Signatures */}
                  <div className="flex gap-4 text-xs">
                    <span
                      className={
                        inv.signatureClient
                          ? "text-emerald-600"
                          : "text-muted-foreground"
                      }
                    >
                      Signature client : {inv.signatureClient ? "✓" : "✗"}
                    </span>
                    <span
                      className={
                        inv.signatureIntervenant
                          ? "text-emerald-600"
                          : "text-muted-foreground"
                      }
                    >
                      Signature interv. : {inv.signatureIntervenant ? "✓" : "✗"}
                    </span>
                  </div>
                </div>
              );
            })
          )}

          {/* Delete intervention confirmation */}
          <Dialog
            open={!!deleteConfirmInterv}
            onOpenChange={() => setDeleteConfirmInterv(null)}
          >
            <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>Supprimer cette intervention ?</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                Cette action est irréversible. L'intervention sera supprimée
                définitivement.
              </p>
              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => setDeleteConfirmInterv(null)}
                >
                  Annuler
                </Button>
                <Button
                  variant="destructive"
                  onClick={async () => {
                    if (!deleteConfirmInterv || !actor) return;
                    try {
                      await (actor as any).supprimerInterventionDuDossierClient(
                        deleteConfirmInterv,
                      );
                      onInterventionDeleted();
                      setDeleteConfirmInterv(null);
                    } catch (e) {
                      console.error(e);
                    }
                  }}
                >
                  Supprimer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}

export default function Clients() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const currentUserPrincipal = identity
    ? identity.getPrincipal().toString()
    : null;
  const {
    data: clients = [],
    isLoading,
    error: clientsError,
  } = useGetClients();
  const addClient = useAddClient();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();
  const toggleBlacklist = useToggleBlacklist();

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"clients" | "blacklist">(
    "clients",
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { data: allInterventions = [] } = useQuery({
    queryKey: ["clientsInterventions"],
    queryFn: async () => {
      if (!actor) return [];
      return (actor as any).obtenirToutesInterventionsValideesClient();
    },
    enabled: !!actor && !actorFetching,
  });

  const { data: allProfiles = [] } = useQuery<any[]>({
    queryKey: ["allProfilesClients"],
    queryFn: async () => {
      if (!actor) return [];
      return (actor as any).obtenirTousLesProfils();
    },
    enabled: !!actor && !actorFetching,
  });

  const profileNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const [principal, profile] of allProfiles as any[]) {
      const name = profile?.name;
      if (name && name !== "") {
        map.set(principal.toString(), name);
      }
    }
    return map;
  }, [allProfiles]);

  const filtered = clients.filter((c) => {
    const q = search.toLowerCase();
    const phones = (c.telephone || "").split("|");
    return (
      c.nom.toLowerCase().includes(q) ||
      phones.some((p) => p.toLowerCase().includes(q)) ||
      c.email.toLowerCase().includes(q)
    );
  });

  const clientsTab = filtered.filter((c) => !c.listeNoire);
  const blacklistTab = filtered.filter((c) => c.listeNoire);
  const displayedClients = activeTab === "clients" ? clientsTab : blacklistTab;

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (client: Client) => {
    setEditingId(client.id);
    const [_tel1, _tel2] = (client.telephone || "").split("|");
    setForm({
      nom: client.nom,
      adresse: client.adresse,
      telephone: _tel1 || "",
      telephone2: _tel2 || "",
      email: client.email,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.nom.trim()) return;
    const now = BigInt(Date.now()) * 1_000_000n;
    const duplicate = clients.find(
      (c) =>
        c.id !== editingId &&
        c.nom.trim().toLowerCase() === form.nom.trim().toLowerCase() &&
        c.adresse.trim().toLowerCase() === form.adresse.trim().toLowerCase(),
    );
    if (duplicate) {
      alert(`Ce client existe déjà : ${duplicate.nom} — ${duplicate.adresse}`);
      return;
    }
    if (editingId) {
      const existing = clients.find((c) => c.id === editingId);
      await updateClient.mutateAsync({
        id: editingId,
        client: {
          id: editingId,
          nom: form.nom.trim(),
          adresse: form.adresse.trim(),
          telephone: [form.telephone.trim(), (form.telephone2 ?? "").trim()]
            .filter(Boolean)
            .join("|"),
          email: form.email.trim(),
          listeNoire: existing?.listeNoire ?? false,
          createdAt: existing?.createdAt ?? now,
        },
      });
    } else {
      const id = crypto.randomUUID();
      await addClient.mutateAsync({
        id,
        nom: form.nom.trim(),
        adresse: form.adresse.trim(),
        telephone: [form.telephone.trim(), (form.telephone2 ?? "").trim()]
          .filter(Boolean)
          .join("|"),
        email: form.email.trim(),
        listeNoire: false,
        createdAt: now,
      });
    }
    setDialogOpen(false);
  };

  const isSaving = addClient.isPending || updateClient.isPending;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <h1
          className="text-xl font-bold"
          style={{
            borderLeft: "4px solid oklch(var(--vts-green))",
            paddingLeft: "0.75rem",
            color: "oklch(var(--navy))",
          }}
        >
          Clients
        </h1>
        <Button
          size="sm"
          onClick={openAdd}
          className="flex items-center gap-1"
          data-ocid="clients.open_modal_button"
        >
          <Plus className="w-4 h-4" />
          Ajouter
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
          style={{ color: "oklch(var(--vts-green))" }}
        />
        <Input
          className="pl-9 text-base"
          placeholder="Rechercher par nom, téléphone, email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          data-ocid="clients.search_input"
        />
      </div>

      {/* Tabs */}
      <div
        className="flex rounded-lg overflow-hidden border border-border"
        data-ocid="clients.tab"
      >
        <button
          type="button"
          onClick={() => setActiveTab("clients")}
          className={[
            "flex-1 py-2 text-sm font-medium transition-colors",
            activeTab === "clients"
              ? "bg-[oklch(var(--navy))] text-white"
              : "bg-card text-muted-foreground hover:bg-muted",
          ].join(" ")}
        >
          Clients
          {clientsTab.length > 0 && (
            <span
              className={[
                "ml-1.5 text-xs px-1.5 py-0.5 rounded-full",
                activeTab === "clients"
                  ? "bg-white/20 text-white"
                  : "bg-muted-foreground/20 text-muted-foreground",
              ].join(" ")}
            >
              {clientsTab.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("blacklist")}
          className={[
            "flex-1 py-2 text-sm font-medium transition-colors border-l border-border",
            activeTab === "blacklist"
              ? "bg-destructive text-white"
              : "bg-card text-muted-foreground hover:bg-destructive/10",
          ].join(" ")}
        >
          ⛔ Blacklist
          {blacklistTab.length > 0 && (
            <span
              className={[
                "ml-1.5 text-xs px-1.5 py-0.5 rounded-full",
                activeTab === "blacklist"
                  ? "bg-white/20 text-white"
                  : "bg-destructive/20 text-destructive",
              ].join(" ")}
            >
              {blacklistTab.length}
            </span>
          )}
        </button>
      </div>

      {/* Loading */}
      {clientsError && (
        <div className="text-center py-8 text-red-500 text-sm">
          Erreur de chargement des clients. Veuillez recharger la page.
        </div>
      )}
      {isLoading && (
        <div
          className="flex justify-center py-12"
          data-ocid="clients.loading_state"
        >
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty */}
      {!isLoading && displayedClients.length === 0 && (
        <div
          className="flex flex-col items-center justify-center py-16 text-muted-foreground"
          data-ocid="clients.empty_state"
        >
          <UserX className="w-12 h-12 mb-3 opacity-40" />
          <p className="text-sm">
            {search
              ? "Aucun résultat"
              : activeTab === "clients"
                ? "Aucun client enregistré"
                : "Aucun client en liste noire"}
          </p>
        </div>
      )}

      {/* Client list */}
      <div className="space-y-3">
        {displayedClients.map((client, idx) => (
          <Card
            key={client.id}
            className={[
              "overflow-hidden border transition-colors",
              client.listeNoire
                ? "border-destructive/60 bg-destructive/5"
                : "border-border bg-card",
            ].join(" ")}
            data-ocid={`clients.item.${idx + 1}`}
          >
            <CardContent className="p-3 space-y-2">
              {/* Name + badge */}
              <div className="flex items-start justify-between gap-2">
                <button
                  type="button"
                  className="text-left font-semibold text-base leading-tight hover:underline"
                  onClick={() => openEdit(client)}
                  data-ocid={`clients.edit_button.${idx + 1}`}
                >
                  {client.nom}
                </button>
                {client.listeNoire && (
                  <Badge
                    variant="destructive"
                    className="shrink-0 text-[11px] px-1.5 py-0.5"
                  >
                    ⛔ Liste noire
                  </Badge>
                )}
              </div>

              {/* Contact info */}
              <div className="space-y-1 text-sm text-muted-foreground">
                {client.adresse && (
                  <div className="flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span className="break-all">{client.adresse}</span>
                  </div>
                )}
                {(() => {
                  const [tel1, tel2] = (client.telephone || "").split("|");
                  return (
                    <>
                      {tel1 && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 shrink-0" />
                          <a
                            href={`tel:${tel1}`}
                            className="hover:text-foreground"
                          >
                            {tel1}
                          </a>
                        </div>
                      )}
                      {tel2 && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 shrink-0" />
                          <a
                            href={`tel:${tel2}`}
                            className="hover:text-foreground"
                          >
                            {tel2}
                          </a>
                        </div>
                      )}
                    </>
                  );
                })()}
                {client.email && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 shrink-0" />
                    <a
                      href={`mailto:${client.email}`}
                      className="hover:text-foreground break-all"
                    >
                      {client.email}
                    </a>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7 px-2"
                  onClick={() => openEdit(client)}
                >
                  Modifier
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className={[
                    "text-xs h-7 px-2",
                    client.listeNoire
                      ? "border-muted-foreground text-muted-foreground"
                      : "border-destructive text-destructive hover:bg-destructive/10",
                  ].join(" ")}
                  disabled={toggleBlacklist.isPending}
                  onClick={() => toggleBlacklist.mutate(client.id)}
                  data-ocid={`clients.toggle.${idx + 1}`}
                >
                  {activeTab === "blacklist"
                    ? "Retirer de la liste noire"
                    : client.listeNoire
                      ? "Retirer de la liste noire"
                      : "Mettre en liste noire"}
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs h-7 px-2 text-destructive hover:bg-destructive/10 ml-auto"
                  onClick={() => setDeleteConfirmId(client.id)}
                  data-ocid={`clients.delete_button.${idx + 1}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>

              {/* Validated interventions section */}
              <ClientInterventions
                clientNom={client.nom}
                allInterventions={allInterventions as any[]}
                currentUserPrincipal={currentUserPrincipal}
                actor={actor}
                profileNameMap={profileNameMap}
                onInterventionDeleted={() => {
                  queryClient.invalidateQueries({
                    queryKey: ["clientsInterventions"],
                  });
                  queryClient.invalidateQueries({
                    queryKey: ["facturationInterventions"],
                  });
                }}
              />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className="max-w-[calc(100vw-2rem)] sm:max-w-md max-h-[85vh] overflow-y-auto"
          data-ocid="clients.dialog"
        >
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Modifier le client" : "Nouveau client"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="client-nom" className="text-sm">
                Nom *
              </Label>
              <Input
                id="client-nom"
                value={form.nom}
                onChange={(e) =>
                  setForm((f) => ({ ...f, nom: e.target.value }))
                }
                placeholder="Nom du client"
                className="text-base"
                data-ocid="clients.input"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="client-adresse" className="text-sm">
                Adresse
              </Label>
              <Input
                id="client-adresse"
                value={form.adresse}
                onChange={(e) =>
                  setForm((f) => ({ ...f, adresse: e.target.value }))
                }
                placeholder="123 rue de la Paix, Paris"
                className="text-base"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="client-telephone" className="text-sm">
                Téléphone 1
              </Label>
              <Input
                id="client-telephone"
                type="tel"
                value={form.telephone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, telephone: e.target.value }))
                }
                placeholder="+33 6 12 34 56 78"
                className="text-base"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="client-telephone2" className="text-sm">
                Téléphone 2
              </Label>
              <Input
                id="client-telephone2"
                type="tel"
                value={form.telephone2 ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, telephone2: e.target.value }))
                }
                placeholder="+33 6 98 76 54 32"
                className="text-base"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="client-email" className="text-sm">
                Email
              </Label>
              <Input
                id="client-email"
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
                placeholder="client@example.com"
                className="text-base"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              data-ocid="clients.cancel_button"
            >
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!form.nom.trim() || isSaving}
              data-ocid="clients.submit_button"
            >
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingId ? "Enregistrer" : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteConfirmId}
        onOpenChange={() => setDeleteConfirmId(null)}
      >
        <DialogContent
          className="max-w-[calc(100vw-2rem)] sm:max-w-sm"
          data-ocid="clients.modal"
        >
          <DialogHeader>
            <DialogTitle>Supprimer le client ?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Cette action est irréversible. Le client et toutes ses données
            seront supprimés.
          </p>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmId(null)}
              data-ocid="clients.cancel_button"
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              disabled={deleteClient.isPending}
              onClick={async () => {
                if (deleteConfirmId) {
                  await deleteClient.mutateAsync(deleteConfirmId);
                  setDeleteConfirmId(null);
                }
              }}
              data-ocid="clients.confirm_button"
            >
              {deleteClient.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
