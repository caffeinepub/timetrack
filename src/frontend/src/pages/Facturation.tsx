import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, FileText, Search, Trash2, User, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useActor } from "../hooks/useActor";

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
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    },
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
    <h1>Fiche Intervention</h1>
    <div class="badge">Créée par : ${profileName}</div><br/>
    ${inv.estAstreinte ? '<div class="badge-astreinte">ASTREINTE</div>' : ""}
    <div class="section">
      <span class="label">Date :</span> ${date}
    </div>
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
    <div class="section">
      <span class="label">Pièces utilisées :</span>
      ${piecesHtml}
    </div>
    <div class="sigs">
      <div class="sig-block"><div class="label">Signature Client</div>${sigClientHtml}</div>
      <div class="sig-block"><div class="label">Signature Intervenant</div>${sigIntervHtml}</div>
    </div>
  </body></html>`);
  win.document.close();
  setTimeout(() => win.print(), 500);
}

type StatusFilter = "all" | "validated" | "pending";

export default function Facturation() {
  const { actor, isFetching: actorFetching } = useActor();
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<"validate" | "delete" | null>(
    null,
  );

  // Filters
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterName, setFilterName] = useState("");
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("all");

  // Load all profiles
  const { data: allProfiles = [] } = useQuery({
    queryKey: ["allProfiles"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.obtenirTousLesProfils();
    },
    enabled: !!actor && !actorFetching,
  });

  // Build profile name map: Principal -> name
  const profileNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const [principal, profile] of allProfiles as [Principal, any][]) {
      map.set(principal.toString(), profile.name || "Utilisateur");
    }
    return map;
  }, [allProfiles]);

  // Load ALL users' interventions
  const { data: allInterventions = [], isLoading } = useQuery({
    queryKey: [
      "facturationInterventions",
      (allProfiles as [Principal, any][]).map(([p]) => p.toString()).join(","),
    ],
    queryFn: async () => {
      if (!actor || (allProfiles as any[]).length === 0) return [];
      const results = await Promise.all(
        (allProfiles as [Principal, any][]).map(([principal]) =>
          actor.obtenirInterventionsPubliques(principal),
        ),
      );
      return results.flat();
    },
    enabled: !!actor && !actorFetching && (allProfiles as any[]).length > 0,
  });

  // Sort + filter
  const filteredInterventions = useMemo(() => {
    let list = [...(allInterventions as any[])].sort(
      (a, b) => Number(b.date) - Number(a.date),
    );

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
        const profileName =
          profileNameMap.get(inv.user?.toString?.() ?? "") ?? "Utilisateur";
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
    return list;
  }, [
    allInterventions,
    filterDateFrom,
    filterDateTo,
    filterName,
    filterStatus,
    profileNameMap,
  ]);

  const hasFilters =
    filterDateFrom || filterDateTo || filterName || filterStatus !== "all";

  const clearFilters = () => {
    setFilterDateFrom("");
    setFilterDateTo("");
    setFilterName("");
    setFilterStatus("all");
  };

  const validateMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error("Non connecté");
      await (actor as any).validerIntervention(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facturationInterventions"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error("Non connecté");
      await actor.supprimerIntervention(id);
    },
    onSuccess: () => {
      setDeletingId(null);
      queryClient.invalidateQueries({ queryKey: ["facturationInterventions"] });
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
      if (inv && !inv.valide) {
        await (actor as any).validerIntervention(id);
      }
    }
    setSelectedIds(new Set());
    setBulkAction(null);
    queryClient.invalidateQueries({ queryKey: ["facturationInterventions"] });
  };

  const handleBulkDelete = async () => {
    if (!actor) return;
    for (const id of selectedIds) {
      try {
        await actor.supprimerIntervention(id);
      } catch (_) {
        // continue on error
      }
    }
    setSelectedIds(new Set());
    setBulkAction(null);
    queryClient.invalidateQueries({ queryKey: ["facturationInterventions"] });
  };

  if (isLoading && !(allInterventions as any[]).length) {
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
              { value: "all", label: "Toutes" },
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
            <div className="flex items-center gap-2">
              {bulkAction === "delete" ? (
                <>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={handleBulkDelete}
                  >
                    Confirmer suppression
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
                    Confirmer validation
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
              profileNameMap.get(inv.user?.toString?.() ?? "") ?? "Utilisateur";
            const isValide = inv.valide === true;
            const isDeleting = deletingId === inv.id;
            const isSelected = selectedIds.has(inv.id);

            return (
              <div
                key={inv.id ?? idx}
                className={`rounded-xl border bg-card p-4 space-y-3 ${
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
                    Signature client :{" "}
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
                    Signature intervenant :{" "}
                    {inv.signatureIntervenant ? "✓" : "✗"}
                  </span>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 flex-wrap pt-1">
                  {/* PDF */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-8"
                    onClick={() => exportInterventionPdf(inv, profileName)}
                  >
                    <FileText className="w-3.5 h-3.5 mr-1" />
                    PDF
                  </Button>

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

                  {/* Supprimer - toujours disponible si validée */}
                  {isValide && isDeleting && (
                    <div className="flex gap-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        className="text-xs h-8"
                        onClick={() => deleteMutation.mutate(inv.id)}
                        disabled={deleteMutation.isPending}
                      >
                        Confirmer
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-8"
                        onClick={() => setDeletingId(null)}
                      >
                        Annuler
                      </Button>
                    </div>
                  )}
                  {isValide && !isDeleting && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-8 border-red-300 text-red-600 hover:bg-red-50"
                      onClick={() => setDeletingId(inv.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      Supprimer
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
