import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, FileText, Search, Trash2, User, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useAccessControlContext } from "../contexts/AccessControlContext";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useGetToutesInterventionsFact } from "../hooks/useQueries";

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

function getMediaUrlForPdf(p: any): string {
  if (typeof p === "string") return p;
  if (p && typeof p.getDirectURL === "function") {
    try {
      return p.getDirectURL();
    } catch (_) {}
  }
  if (p?.url) return p.url;
  if (p?.data) {
    const bytes = new Uint8Array(p.data);
    const blob = new Blob([bytes], { type: p.mimeType || "image/jpeg" });
    return URL.createObjectURL(blob);
  }
  return "";
}

function buildInterventionHtml(inv: any, profileName: string): string {
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

  const sigClientHtml = (inv as any).clientAbsent
    ? "<span style='color:#e65100;font-weight:bold'>Client absent</span>"
    : inv.signatureClient
      ? `<img src="${inv.signatureClient}" style="max-width:200px;border:1px solid #ccc" />`
      : "<span style='color:#888'>Non signée</span>";

  const sigIntervHtml = inv.signatureIntervenant
    ? `<img src="${inv.signatureIntervenant}" style="max-width:200px;border:1px solid #ccc" />`
    : "<span style='color:#888'>Non signée</span>";

  return `
    <div style="page-break-inside:avoid; margin-bottom:40px; border-bottom:2px solid #ccc; padding-bottom:30px">
      <div style="background:#0f1e4a;color:#fff;padding:12px 16px;border-radius:8px;margin-bottom:16px;display:flex;align-items:center;gap:14px">
        <img src="/assets/generated/vache-logo-transparent.dim_300x300.png" style="width:56px;height:56px;flex-shrink:0" alt="Logo" />
        <div>
          <div style="font-size:20px;font-weight:800;letter-spacing:0.5px">Vial Traite Service</div>
          <div style="font-size:12px;color:rgba(255,255,255,0.7);margin-top:2px">Fiche d'Intervention</div>
        </div>
      </div>
      <div style="display:inline-block; background:#e0f0ff; color:#1d6fa5; padding:2px 8px; border-radius:4px; font-size:12px; margin-bottom:4px;">Créée par : ${profileName}</div><br/>
      ${inv.estAstreinte ? '<div style="display:inline-block; background:#fff3e0; color:#e65100; padding:2px 8px; border-radius:4px; font-size:12px; margin-bottom:12px; font-weight:bold;">ASTREINTE</div>' : ""}
      <div style="margin-bottom:12px;"><strong>Date :</strong> ${date}</div>
      <div style="margin-bottom:12px;">
        <strong>Client :</strong> ${inv.clientNom || "—"}<br/>
        <strong>Adresse :</strong> ${inv.clientAdresse || "—"}
      </div>
      <div style="margin-bottom:12px;">
        <strong>Horaires Matin :</strong> ${formatHeure(inv.heureMatinDebutH, inv.heureMatinDebutMin)} → ${formatHeure(inv.heureMatinFinH, inv.heureMatinFinMin)}<br/>
        <strong>Horaires Après-midi :</strong> ${formatHeure(inv.heureApremDebutH, inv.heureApremDebutMin)} → ${formatHeure(inv.heureApremFinH, inv.heureApremFinMin)}
      </div>
      ${inv.description ? `<div style="margin-bottom:12px;"><strong>Description :</strong><br/><em>${inv.description}</em></div>` : ""}
      <div style="margin-bottom:12px;"><strong>Pièces utilisées :</strong>${piecesHtml}</div>

      ${(() => {
        const photos: any[] = Array.isArray(inv.photos) ? inv.photos : [];
        const videos: any[] = Array.isArray(inv.videos) ? inv.videos : [];
        const photoItems = photos
          .map((p: any) => getMediaUrlForPdf(p))
          .filter(Boolean);
        const videoItems = videos
          .map((v: any) => getMediaUrlForPdf(v))
          .filter(Boolean);
        if (photoItems.length === 0 && videoItems.length === 0) return "";
        return `<div style="margin-bottom:16px">
          ${
            photoItems.length > 0
              ? `<div style="font-weight:bold;color:#555;margin-bottom:6px">Photos (${photoItems.length})</div>
          <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:12px">
            ${photoItems.map((url: string) => `<img src="${url}" style="width:200px;height:150px;object-fit:cover;border:1px solid #ccc;border-radius:4px" />`).join("")}
          </div>`
              : ""
          }
          ${
            videoItems.length > 0
              ? `<div style="font-weight:bold;color:#555;margin-bottom:6px">Vidéos (${videoItems.length})</div>
          <div style="color:#555;font-size:12px">${videoItems.map((url: string) => `<div>▶ <a href="${url}" style="color:#1d6fa5">Vidéo jointe</a></div>`).join("")}</div>`
              : ""
          }
        </div>`;
      })()}
      <div style="display:flex; gap:40px; margin-top:20px;">
        <div style="text-align:center;"><div style="font-weight:bold;">Signature Client</div>${sigClientHtml}</div>
        <div style="text-align:center;"><div style="font-weight:bold;">Signature Intervenant</div>${sigIntervHtml}</div>
      </div>
      <div style="margin-top:24px;padding-top:10px;border-top:1px solid #ccc;text-align:center;font-size:11px;color:#888">
        Z.I. du Martinet — 15300 Murat
        <br/><br/>
        04 71 20 12 22
      </div>
    </div>`;
}

function exportInterventionPdf(inv: any, profileName: string) {
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head>
    <meta charset="utf-8"/>
    <title>Fiche Intervention</title>
    <style>body { font-family: Arial, sans-serif; margin: 30px; color: #222; font-size: 13px; }</style>
  </head><body>${buildInterventionHtml(inv, profileName)}</body></html>`);
  win.document.close();
  setTimeout(() => win.print(), 500);
}

function exportMultiplePdf(interventions: any[]) {
  const win = window.open("", "_blank");
  if (!win) return;
  const body = interventions
    .map((inv) => {
      const profileName = inv.nomUtilisateur || "—";
      return buildInterventionHtml(inv, profileName);
    })
    .join("");
  win.document.write(`<!DOCTYPE html><html><head>
    <meta charset="utf-8"/>
    <title>Fiches Interventions</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 30px; color: #222; font-size: 13px; }
      @media print { div { page-break-inside: avoid; } }
    </style>
  </head><body>
    <h1 style="font-size:20px; margin-bottom:24px;">Fiches Interventions (${interventions.length})</h1>
    ${body}
  </body></html>`);
  win.document.close();
  setTimeout(() => win.print(), 500);
}

type StatusFilter = "all" | "validated" | "pending";

export default function Facturation({
  readOnly = false,
}: { readOnly?: boolean }) {
  const accessCtx = useAccessControlContext();
  const { actor } = useActor();
  const queryClient = useQueryClient();

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  // Local soft-deleted IDs (for immediate UI feedback)
  const [localDeleted, setLocalDeleted] = useState<Set<string>>(new Set());

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<
    "validate" | "delete" | "pdf" | null
  >(null);

  // Filters
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterName, setFilterName] = useState("");
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("all");
  const [editingInv, setEditingInv] = useState<any | null>(null);
  const [editFormData, setEditFormData] = useState({
    clientNom: "",
    clientAdresse: "",
    description: "",
    pieces: [] as Array<{
      article: string;
      reference: string;
      quantite: string;
    }>,
  });
  const [editSaving, setEditSaving] = useState(false);

  const { data: allInterventions = [], isLoading } =
    useGetToutesInterventionsFact();
  const { identity } = useInternetIdentity();
  const callerPrincipal = identity?.getPrincipal().toString() ?? "";

  const { data: allProfiles = [] } = useQuery<any[]>({
    queryKey: ["allProfilesFact"],
    queryFn: async () => {
      if (!actor) return [];

      return (actor as any).obtenirTousLesProfils();
    },
    enabled: !!actor,
  });

  const _filteredProfilesFact = (allProfiles as any[]).filter(
    ([principal]: [any, any]) => {
      const id = principal.toString();
      return !accessCtx.getUsersDisabledForSection("facturation").includes(id);
    },
  );

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

  // Sort + filter (exclude locally deleted)
  const filteredInterventions = useMemo(() => {
    let list = [...(allInterventions as any[])]
      .filter((inv) => !localDeleted.has(inv.id))
      .sort((a, b) => Number(b.date) - Number(a.date));

    if (filterDateFrom) {
      const from = new Date(filterDateFrom).getTime();
      list = list.filter((inv) => Number(inv.date) / 1_000_000 >= from);
    }
    if (filterDateTo) {
      const to = new Date(filterDateTo).getTime() + 86400000;
      list = list.filter((inv) => Number(inv.date) / 1_000_000 <= to);
    }
    if (filterName.trim()) {
      const search = filterName.trim().toLowerCase();
      list = list.filter((inv) => {
        const profileName = (inv as any).nomUtilisateur || "—";
        return (
          profileName.toLowerCase().includes(search) ||
          (inv.clientNom || "").toLowerCase().includes(search)
        );
      });
    }
    if (filterStatus === "validated") {
      list = list.filter((inv) => inv.valide === true);
    } else if (filterStatus === "pending") {
      list = list.filter((inv) => inv.valide !== true);
    }
    // "all" shows everything — no filter applied
    return list;
  }, [
    allInterventions,
    localDeleted,
    filterDateFrom,
    filterDateTo,
    filterName,
    filterStatus,
  ]);

  const hasFilters =
    filterDateFrom || filterDateTo || filterName || filterStatus !== "all";

  const clearFilters = () => {
    setFilterDateFrom("");
    setFilterDateTo("");
    setFilterName("");
    setFilterStatus("all");
  };

  const autoValiderPlanningPourClient = async (
    clientNom: string,
    interventionDate: bigint,
  ) => {
    if (!actor || !clientNom) return;
    try {
      // Always fetch fresh data from backend to avoid stale/empty cache issues
      const freshItems: any[] = await (actor as any).obtenirTousPlanningItems();
      const candidates = freshItems.filter(
        (p) =>
          (p.statut === "a_realiser" || p.statut === "en_cours") &&
          (p.clientNom || "").toLowerCase().trim() ===
            clientNom.toLowerCase().trim(),
      );
      if (candidates.length === 0) return;
      const closest = candidates.reduce((best: any, current: any) => {
        const currentDates: bigint[] =
          current.dates && current.dates.length > 0
            ? current.dates
            : [BigInt(0)];
        const bestDates: bigint[] =
          best.dates && best.dates.length > 0 ? best.dates : [BigInt(0)];
        const currentClosest = currentDates.reduce((a: bigint, b: bigint) =>
          Math.abs(Number(a) - Number(interventionDate)) <
          Math.abs(Number(b) - Number(interventionDate))
            ? a
            : b,
        );
        const bestClosest = bestDates.reduce((a: bigint, b: bigint) =>
          Math.abs(Number(a) - Number(interventionDate)) <
          Math.abs(Number(b) - Number(interventionDate))
            ? a
            : b,
        );
        return Math.abs(Number(currentClosest) - Number(interventionDate)) <
          Math.abs(Number(bestClosest) - Number(interventionDate))
          ? current
          : best;
      });
      await (actor as any).validerPlanningItem(closest.id);
      queryClient.invalidateQueries({ queryKey: ["planningItems"] });
    } catch (_) {
      // silent — planning auto-validation is best-effort
    }
  };

  const validateMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error("Non connecté");
      // validerIntervention also auto-validates linked planning mission via Option A (backend)
      await (actor as any).validerIntervention(id);
      // Fallback: also try string-matching for missions not linked via Option A
      const inv = (allInterventions as any[]).find((i) => i.id === id);
      if (inv?.clientNom) {
        await autoValiderPlanningPourClient(inv.clientNom, inv.date);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facturationInterventions"] });
      queryClient.invalidateQueries({ queryKey: ["clientsInterventions"] });
      queryClient.invalidateQueries({ queryKey: ["planningItems"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!actor)
        throw new Error("Non connecté — reconnectez-vous pour supprimer");
      await actor.supprimerDeFacturation(id);
    },
    onSuccess: (_data, id) => {
      setDeletingId(null);
      setDeleteError(null);
      // Immediately hide from UI
      setLocalDeleted((prev) => new Set([...prev, id]));
      // Also invalidate in background
      queryClient.invalidateQueries({ queryKey: ["facturationInterventions"] });
    },
    onError: (error: any) => {
      setDeleteError(error?.message ?? "Erreur lors de la suppression");
    },
  });

  // Bulk actions
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredInterventions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredInterventions.map((inv: any) => inv.id)));
    }
  };

  const handleBulkValidate = async () => {
    if (!actor) return;
    for (const id of selectedIds) {
      const inv = (allInterventions as any[]).find((i) => i.id === id);
      if (inv && !inv.valide && inv.user?.toString() === callerPrincipal) {
        await (actor as any).validerIntervention(id);
        if (inv.clientNom) {
          await autoValiderPlanningPourClient(inv.clientNom, inv.date);
        }
      }
    }
    setSelectedIds(new Set());
    setBulkAction(null);
    queryClient.invalidateQueries({ queryKey: ["facturationInterventions"] });
    queryClient.invalidateQueries({ queryKey: ["clientsInterventions"] });
    queryClient.invalidateQueries({ queryKey: ["planningItems"] });
  };

  const handleBulkDelete = async () => {
    if (!actor) return;
    const deleted: string[] = [];
    for (const id of selectedIds) {
      const inv = (allInterventions as any[]).find((i) => i.id === id);
      if (!inv || inv.user?.toString() !== callerPrincipal) continue;
      try {
        await actor.supprimerDeFacturation(id);
        deleted.push(id);
      } catch (_) {
        // continue on error
      }
    }
    // Immediately hide deleted ones
    if (deleted.length > 0) {
      setLocalDeleted((prev) => new Set([...prev, ...deleted]));
    }
    setSelectedIds(new Set());
    setBulkAction(null);
    queryClient.invalidateQueries({ queryKey: ["facturationInterventions"] });
  };

  const handleBulkPdf = () => {
    const selected = filteredInterventions.filter((inv: any) =>
      selectedIds.has(inv.id),
    );
    if (selected.length === 0) return;
    exportMultiplePdf(selected);
    setSelectedIds(new Set());
    setBulkAction(null);
  };

  if (isLoading && !(allInterventions as any[]).length) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

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

  const handleSaveEdit = async () => {
    if (!actor || !editingInv) return;
    setEditSaving(true);
    try {
      const input = {
        id: editingInv.id,
        date: editingInv.date,
        clientNom: editFormData.clientNom,
        clientAdresse: editFormData.clientAdresse,
        heureMatinDebutH: editingInv.heureMatinDebutH,
        heureMatinDebutMin: editingInv.heureMatinDebutMin,
        heureMatinFinH: editingInv.heureMatinFinH,
        heureMatinFinMin: editingInv.heureMatinFinMin,
        heureApremDebutH: editingInv.heureApremDebutH,
        heureApremDebutMin: editingInv.heureApremDebutMin,
        heureApremFinH: editingInv.heureApremFinH,
        heureApremFinMin: editingInv.heureApremFinMin,
        description: editFormData.description,
        signatureClient: editingInv.signatureClient ?? "",
        signatureIntervenant: editingInv.signatureIntervenant ?? "",
        pieces: editFormData.pieces.map((p) => ({
          article: p.article,
          reference: p.reference,
          quantite: BigInt(Number.parseInt(p.quantite) || 0),
        })),
        photos: editingInv.photos ?? [],
        videos: editingInv.videos ?? [],
        estAstreinte: editingInv.estAstreinte ?? false,
        clientAbsent: editingInv.clientAbsent ?? false,
      };
      await (actor as any).modifierIntervention(editingInv.id, input);
      setEditingInv(null);
      queryClient.invalidateQueries({ queryKey: ["facturationInterventions"] });
      toast.success("Intervention modifiée");
    } catch (e: any) {
      toast.error(`Erreur : ${e?.message ?? String(e)}`);
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <div className="space-y-4 pb-6">
      {readOnlyBanner}
      <div className="flex items-center justify-between">
        <h2
          className="text-lg font-semibold"
          style={{
            borderLeft: "4px solid oklch(var(--vts-green))",
            paddingLeft: "0.75rem",
            color: "oklch(var(--navy))",
          }}
        >
          Facturation
        </h2>
        <span className="text-xs text-muted-foreground">
          {filteredInterventions.length} / {(allInterventions as any[]).length}{" "}
          fiche(s)
        </span>
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
              onClick={clearFilters}
              className="ml-auto flex items-center gap-1 text-xs text-red-500 hover:text-red-700"
            >
              <X className="w-3 h-3" />
              Effacer
            </button>
          )}
        </div>
        <Input
          placeholder="Rechercher par nom (profil ou client)"
          value={filterName}
          onChange={(e) => setFilterName(e.target.value)}
          className="h-8 text-sm"
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
        <div className="flex gap-2">
          {(
            [
              { value: "all", label: "En cours" },
              { value: "pending", label: "En attente" },
              { value: "validated", label: "Validées" },
            ] as { value: StatusFilter; label: string }[]
          ).map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilterStatus(value)}
              className={`flex-1 h-7 rounded text-xs font-medium transition-colors ${
                filterStatus === value
                  ? value === "validated"
                    ? "bg-emerald-500 text-white"
                    : value === "pending"
                      ? "bg-amber-500 text-white"
                      : "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk selection bar */}
      {filteredInterventions.length > 0 && (
        <div className="flex items-center gap-2 bg-muted/20 border border-border rounded-lg px-3 py-2">
          <input
            type="checkbox"
            checked={
              selectedIds.size === filteredInterventions.length &&
              filteredInterventions.length > 0
            }
            onChange={toggleSelectAll}
            className="w-4 h-4"
            aria-label="Tout sélectionner"
          />
          <span className="text-xs text-muted-foreground flex-1">
            {selectedIds.size > 0
              ? `${selectedIds.size} sélectionnée(s)`
              : "Tout sélectionner"}
          </span>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              {bulkAction === "delete" ? (
                <>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={handleBulkDelete}
                  >
                    Confirmer
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setBulkAction(null)}
                  >
                    Annuler
                  </Button>
                </>
              ) : bulkAction === "validate" ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs border-emerald-400 text-emerald-700"
                    onClick={handleBulkValidate}
                  >
                    Confirmer
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setBulkAction(null)}
                  >
                    Annuler
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs border-blue-300 text-blue-600"
                    onClick={handleBulkPdf}
                  >
                    <FileText className="w-3 h-3 mr-1" />
                    PDF
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs border-emerald-400 text-emerald-700"
                    onClick={() => setBulkAction("validate")}
                  >
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Valider
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs border-red-300 text-red-600"
                    onClick={() => setBulkAction("delete")}
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Supprimer
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Global delete error */}
      {deleteError && (
        <div className="bg-red-50 border border-red-300 rounded-lg px-3 py-2 text-xs text-red-700 flex items-center justify-between">
          <span>{deleteError}</span>
          <button
            type="button"
            onClick={() => setDeleteError(null)}
            className="ml-2"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {filteredInterventions.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">
            {hasFilters
              ? "Aucune fiche correspondant aux filtres"
              : "Aucune fiche intervention"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredInterventions.map((inv: any, idx: number) => {
            const profileName =
              profileNameMap.get(inv.user?.toString()) ||
              (inv as any).nomUtilisateur ||
              "Utilisateur";
            const isValide = inv.valide === true;
            const isCreator = inv.user?.toString() === callerPrincipal;
            const isDeleting = deletingId === inv.id;
            const isSelected = selectedIds.has(inv.id);
            const isPendingDelete =
              deleteMutation.isPending && deleteMutation.variables === inv.id;

            return (
              <div
                key={inv.id ?? idx}
                className={`rounded-xl border bg-card p-4 space-y-3 transition-opacity ${
                  isPendingDelete ? "opacity-50" : ""
                } ${
                  isSelected
                    ? "border-primary ring-1 ring-primary"
                    : isValide
                      ? "border-emerald-300 bg-emerald-50/30"
                      : "border-border"
                }`}
              >
                {/* Header row */}
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(inv.id)}
                    className="w-4 h-4 mt-0.5 shrink-0"
                    aria-label="Sélectionner"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                        <User className="w-3 h-3" />
                        {profileName}
                      </span>
                      {isValide ? (
                        <span className="inline-flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                          <CheckCircle className="w-3 h-3" />
                          Validée
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                          En attente
                        </span>
                      )}
                      {inv.estAstreinte && (
                        <span className="inline-flex items-center gap-1 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold">
                          ASTREINTE
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground mt-1 block">
                      {formatDate(inv.date)}
                    </span>
                  </div>
                </div>

                {/* Client info */}
                {inv.clientNom && (
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {inv.clientNom}
                    </p>
                    {inv.clientAdresse && (
                      <p className="text-xs text-muted-foreground">
                        {inv.clientAdresse}
                      </p>
                    )}
                  </div>
                )}

                {/* Horaires */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-xs">
                    <span className="text-muted-foreground">Matin : </span>
                    <span className="text-foreground">
                      {formatHeure(
                        inv.heureMatinDebutH,
                        inv.heureMatinDebutMin,
                      )}{" "}
                      → {formatHeure(inv.heureMatinFinH, inv.heureMatinFinMin)}
                    </span>
                  </div>
                  <div className="text-xs">
                    <span className="text-muted-foreground">Après-midi : </span>
                    <span className="text-foreground">
                      {formatHeure(
                        inv.heureApremDebutH,
                        inv.heureApremDebutMin,
                      )}{" "}
                      → {formatHeure(inv.heureApremFinH, inv.heureApremFinMin)}
                    </span>
                  </div>
                </div>

                {/* Description */}
                {inv.description && (
                  <p className="text-xs text-muted-foreground italic border-l-2 border-border pl-2">
                    {inv.description}
                  </p>
                )}

                {/* Pièces */}
                {inv.pieces && inv.pieces.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border border-border rounded">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="text-left px-2 py-1 font-medium text-muted-foreground">
                            Référence
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
                            <td className="px-2 py-1 text-foreground">
                              {piece.reference}
                            </td>
                            <td className="px-2 py-1 text-foreground">
                              {piece.article}
                            </td>
                            <td className="px-2 py-1 text-right text-foreground">
                              {String(piece.quantite)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Signatures */}
                <div className="flex gap-4">
                  <span
                    className={`text-xs ${
                      (inv as any).clientAbsent
                        ? "text-orange-500"
                        : inv.signatureClient
                          ? "text-emerald-600"
                          : "text-muted-foreground"
                    }`}
                  >
                    Sig. client :{" "}
                    {(inv as any).clientAbsent
                      ? "absent"
                      : inv.signatureClient
                        ? "✓"
                        : "✗"}
                  </span>
                  <span
                    className={`text-xs ${
                      inv.signatureIntervenant
                        ? "text-emerald-600"
                        : "text-muted-foreground"
                    }`}
                  >
                    Sig. intervenant : {inv.signatureIntervenant ? "✓" : "✗"}
                  </span>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 flex-wrap pt-1">
                  {/* PDF individuel */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-8"
                    onClick={() => exportInterventionPdf(inv, profileName)}
                  >
                    <FileText className="w-3.5 h-3.5 mr-1" />
                    PDF
                  </Button>

                  {/* Modifier */}
                  {!isValide && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-8 border-blue-300 text-blue-600 hover:bg-blue-50"
                      data-ocid="facturation.edit_button"
                      onClick={() => {
                        setEditingInv(inv);
                        setEditFormData({
                          clientNom: inv.clientNom || "",
                          clientAdresse: inv.clientAdresse || "",
                          description: inv.description || "",
                          pieces: (inv.pieces || []).map((p: any) => ({
                            article: p.article || "",
                            reference: p.reference || "",
                            quantite: String(p.quantite ?? 0),
                          })),
                        });
                      }}
                    >
                      Modifier
                    </Button>
                  )}
                  {/* Valider */}
                  {!isValide && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-8 border-emerald-400 text-emerald-700 hover:bg-emerald-50"
                      onClick={() => validateMutation.mutate(inv.id)}
                      disabled={validateMutation.isPending}
                    >
                      <CheckCircle className="w-3.5 h-3.5 mr-1" />
                      Valider
                    </Button>
                  )}

                  {/* Supprimer - disponible uniquement pour le créateur */}
                  {isValide && isCreator && !isDeleting && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-8 border-red-300 text-red-600 hover:bg-red-50"
                      onClick={() => {
                        setDeletingId(inv.id);
                        setDeleteError(null);
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      Supprimer
                    </Button>
                  )}
                  {isValide && isCreator && isDeleting && (
                    <div className="flex gap-2 items-center">
                      <span className="text-xs text-red-600">Confirmer ?</span>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="text-xs h-8"
                        onClick={() => deleteMutation.mutate(inv.id)}
                        disabled={deleteMutation.isPending}
                      >
                        {deleteMutation.isPending ? "..." : "Oui"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-8"
                        onClick={() => {
                          setDeletingId(null);
                          setDeleteError(null);
                        }}
                      >
                        Non
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {/* Edit Modal */}
      {editingInv && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-base">
                Modifier l'intervention
              </h3>
              <button
                type="button"
                onClick={() => setEditingInv(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <span className="text-xs font-medium text-gray-600">
                  Client
                </span>
                <Input
                  value={editFormData.clientNom}
                  onChange={(e) =>
                    setEditFormData((p) => ({
                      ...p,
                      clientNom: e.target.value,
                    }))
                  }
                  className="mt-1 text-sm"
                  placeholder="Nom du client"
                />
              </div>
              <div>
                <span className="text-xs font-medium text-gray-600">
                  Adresse
                </span>
                <Input
                  value={editFormData.clientAdresse}
                  onChange={(e) =>
                    setEditFormData((p) => ({
                      ...p,
                      clientAdresse: e.target.value,
                    }))
                  }
                  className="mt-1 text-sm"
                  placeholder="Adresse"
                />
              </div>
              <div>
                <span className="text-xs font-medium text-gray-600">
                  Description
                </span>
                <textarea
                  value={editFormData.description}
                  onChange={(e) =>
                    setEditFormData((p) => ({
                      ...p,
                      description: e.target.value,
                    }))
                  }
                  className="mt-1 w-full text-sm border rounded-md px-3 py-2 min-h-[80px] resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Description de l'intervention"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-600">
                    Pièces utilisées
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setEditFormData((p) => ({
                        ...p,
                        pieces: [
                          ...p.pieces,
                          { article: "", reference: "", quantite: "1" },
                        ],
                      }))
                    }
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    + Ajouter
                  </button>
                </div>
                {editFormData.pieces.map((piece, pi) => (
                  <div
                    key={`piece-${pi}-${piece.article}`}
                    className="flex gap-2 mb-2"
                  >
                    <Input
                      value={piece.article}
                      onChange={(e) =>
                        setEditFormData((p) => ({
                          ...p,
                          pieces: p.pieces.map((x, i) =>
                            i === pi ? { ...x, article: e.target.value } : x,
                          ),
                        }))
                      }
                      placeholder="Article"
                      className="text-xs"
                    />
                    <Input
                      value={piece.reference}
                      onChange={(e) =>
                        setEditFormData((p) => ({
                          ...p,
                          pieces: p.pieces.map((x, i) =>
                            i === pi ? { ...x, reference: e.target.value } : x,
                          ),
                        }))
                      }
                      placeholder="Réf."
                      className="text-xs"
                    />
                    <Input
                      value={piece.quantite}
                      onChange={(e) =>
                        setEditFormData((p) => ({
                          ...p,
                          pieces: p.pieces.map((x, i) =>
                            i === pi ? { ...x, quantite: e.target.value } : x,
                          ),
                        }))
                      }
                      placeholder="Qté"
                      className="text-xs w-16"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setEditFormData((p) => ({
                          ...p,
                          pieces: p.pieces.filter((_, i) => i !== pi),
                        }))
                      }
                      className="text-red-400 hover:text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingInv(null)}
                disabled={editSaving}
              >
                Annuler
              </Button>
              <Button size="sm" onClick={handleSaveEdit} disabled={editSaving}>
                {editSaving ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
