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
import { Loader2, Minus, Plus, Trash2, UserX, X, ZoomIn } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ExternalBlob } from "../backend";
import type { InterventionInput } from "../backend";
import { useActor } from "../hooks/useActor";
import { useOfflineSync } from "../hooks/useOfflineSync";
import type { OfflineInterventionData } from "../hooks/useOfflineSync";
import { useGetClients } from "../hooks/useQueries";
import { SignaturePad } from "./SignaturePad";
import { VoiceInput } from "./VoiceInput";

interface PlanningInterventionModalProps {
  open: boolean;
  onClose: () => void;
  missionId: string;
  destinatairePrincipal: any;
  interventionId?: string;
  creatorPrincipalStr?: string;
  currentUserPrincipalStr?: string;
  prefill: {
    clientNom: string;
    clientAdresse: string;
    description: string;
    date: bigint;
  };
}

interface IForm {
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
  description: string;
  signatureClient: string;
  signatureIntervenant: string;
  estAstreinte: boolean;
  clientAbsent: boolean;
}

interface Piece {
  id: string;
  article: string;
  reference: string;
  quantite: string;
}

interface MediaFile {
  id: string;
  type: "photo" | "video";
  dataUrl: string;
  name: string;
}

function defaultForm(prefill?: {
  clientNom: string;
  clientAdresse: string;
}): IForm {
  return {
    clientNom: prefill?.clientNom ?? "",
    clientAdresse: prefill?.clientAdresse ?? "",
    matinDebutH: "",
    matinDebutMin: "",
    matinFinH: "",
    matinFinMin: "",
    apremDebutH: "",
    apremDebutMin: "",
    apremFinH: "",
    apremFinMin: "",
    description: "", // always blank — technician fills what they actually did
    signatureClient: "",
    signatureIntervenant: "",
    estAstreinte: false,
    clientAbsent: false,
  };
}

function clampH(v: string) {
  const n = Number.parseInt(v) || 0;
  return String(Math.min(23, Math.max(0, n)));
}
function clampM(v: string) {
  const n = Number.parseInt(v) || 0;
  return String(Math.min(59, Math.max(0, n)));
}

function TimeField({
  labelH,
  labelM,
  hVal,
  mVal,
  onH,
  onM,
}: {
  labelH: string;
  labelM: string;
  hVal: string;
  mVal: string;
  onH: (v: string) => void;
  onM: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <Input
        type="number"
        min={0}
        max={23}
        placeholder="HH"
        value={hVal}
        onChange={(e) => onH(clampH(e.target.value))}
        className="w-14 text-center px-1"
        aria-label={labelH}
      />
      <span className="text-muted-foreground font-bold">h</span>
      <Input
        type="number"
        min={0}
        max={59}
        placeholder="MM"
        value={mVal}
        onChange={(e) => onM(clampM(e.target.value))}
        className="w-14 text-center px-1"
        aria-label={labelM}
      />
    </div>
  );
}

export function PlanningInterventionModal({
  open,
  onClose,
  missionId,
  destinatairePrincipal,
  interventionId,
  creatorPrincipalStr,
  currentUserPrincipalStr,
  prefill,
}: PlanningInterventionModalProps) {
  const isEditMode = !!interventionId;
  const [form, setForm] = useState<IForm>(defaultForm(prefill));
  const [clientSearch, setClientSearch] = useState(prefill.clientNom);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const saveSignatureTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [_existingInterventionId, setExistingInterventionId] = useState<
    string | undefined
  >(interventionId);
  // existingFound: true = intervention found in backend (show Mettre à jour), false = new (show Enregistrer)
  const [existingFound, setExistingFound] = useState(false);

  // Track whether the modal was already open to avoid resetting user-entered
  // data (pieces, mediaFiles) when actor becomes available after the modal opens.
  const wasOpenRef = useRef(false);

  const { actor } = useActor();
  const { isOnline, addToQueue } = useOfflineSync();
  const { data: clients = [] } = useGetClients();
  const queryClient = useQueryClient();

  // Effect 1 — runs only when the modal transitions from closed → open.
  // Resets form state (including pieces and mediaFiles) exactly once per opening.
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional — only [open] triggers reset; actor/prefill/interventionId are read inside the guard
  useEffect(() => {
    const justOpened = open && !wasOpenRef.current;
    wasOpenRef.current = open;

    if (!justOpened) return;

    setForm(defaultForm(prefill));
    setClientSearch(prefill.clientNom);
    setExistingInterventionId(interventionId);
    setExistingFound(false);
    setPieces([]);
    setMediaFiles([]);

    // Deterministic interventionId = "intv-plan-${missionId}"
    const targetId = interventionId; // already deterministic from parent

    // If actor is already available at open time, load existing data immediately.
    if (actor && targetId) {
      (actor as any)
        .obtenirInterventionsPourJour?.(prefill.date)
        .then((interventions: any[]) => {
          // Look up by exact deterministic ID
          const existing = interventions.find((i: any) => i.id === targetId);
          if (existing) {
            setExistingFound(true);
            setExistingInterventionId(existing.id);
            setClientSearch(existing.clientNom);
            setForm({
              clientNom: existing.clientNom,
              clientAdresse: existing.clientAdresse,
              matinDebutH: String(Number(existing.heureMatinDebutH)),
              matinDebutMin: String(Number(existing.heureMatinDebutMin)),
              matinFinH: String(Number(existing.heureMatinFinH)),
              matinFinMin: String(Number(existing.heureMatinFinMin)),
              apremDebutH: String(Number(existing.heureApremDebutH)),
              apremDebutMin: String(Number(existing.heureApremDebutMin)),
              apremFinH: String(Number(existing.heureApremFinH)),
              apremFinMin: String(Number(existing.heureApremFinMin)),
              description: existing.description ?? "",
              signatureClient: existing.signatureClient,
              signatureIntervenant: existing.signatureIntervenant,
              estAstreinte: existing.estAstreinte ?? false,
              clientAbsent: existing.clientAbsent ?? false,
            });
            // Load pieces
            if (existing.pieces?.length) {
              setPieces(
                existing.pieces.map((p: any, i: number) => ({
                  id: `existing-piece-${i}-${Date.now()}`,
                  article: p.article ?? "",
                  reference: p.reference ?? "",
                  quantite: String(Number(p.quantite ?? 0)),
                })),
              );
            }
            // Load photos and videos
            const loadedPhotos = (existing.photos ?? []).map(
              (blob: any, i: number) => ({
                id: `existing-photo-${i}-${Date.now()}`,
                type: "photo" as const,
                dataUrl: blob.getDirectURL
                  ? blob.getDirectURL()
                  : (blob.directURL ?? ""),
                name: `photo-${i + 1}.jpg`,
              }),
            );
            const loadedVideos = (existing.videos ?? []).map(
              (blob: any, i: number) => ({
                id: `existing-video-${i}-${Date.now()}`,
                type: "video" as const,
                dataUrl: blob.getDirectURL
                  ? blob.getDirectURL()
                  : (blob.directURL ?? ""),
                name: `video-${i + 1}.mp4`,
              }),
            );
            if (loadedPhotos.length + loadedVideos.length > 0) {
              setMediaFiles([...loadedPhotos, ...loadedVideos]);
            }
          }
        })
        .catch(() => {});
    }
  }, [open]);

  // Effect 2 — loads actor-dependent data (signature + edit mode data) without
  // ever touching pieces or mediaFiles. Safe to re-run when actor becomes available.
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional — [open, actor] only; prefill/interventionId/isEditMode are stable for the modal's lifetime
  useEffect(() => {
    if (!open || !actor) return;

    // Load saved intervenant signature
    actor
      .obtenirSignatureIntervenant()
      .then((sig) => {
        if (sig) setForm((f) => ({ ...f, signatureIntervenant: sig }));
      })
      .catch(() => {});

    // Load existing intervention data by deterministic ID (only if not already loaded via Effect 1)
    if (interventionId) {
      (actor as any)
        .obtenirInterventionsPourJour?.(prefill.date)
        .then((interventions: any[]) => {
          const existing = interventions.find(
            (i: any) => i.id === interventionId,
          );
          if (existing) {
            setExistingFound(true);
            setExistingInterventionId(existing.id);
            setClientSearch(existing.clientNom);
            setForm((f) => ({
              ...f,
              clientNom: existing.clientNom,
              clientAdresse: existing.clientAdresse,
              matinDebutH: String(Number(existing.heureMatinDebutH)),
              matinDebutMin: String(Number(existing.heureMatinDebutMin)),
              matinFinH: String(Number(existing.heureMatinFinH)),
              matinFinMin: String(Number(existing.heureMatinFinMin)),
              apremDebutH: String(Number(existing.heureApremDebutH)),
              apremDebutMin: String(Number(existing.heureApremDebutMin)),
              apremFinH: String(Number(existing.heureApremFinH)),
              apremFinMin: String(Number(existing.heureApremFinMin)),
              description: existing.description ?? f.description,
              signatureClient: existing.signatureClient,
              signatureIntervenant: existing.signatureIntervenant,
              estAstreinte: existing.estAstreinte ?? false,
              clientAbsent: existing.clientAbsent ?? false,
            }));
            // Load pieces only if not yet loaded (avoid overwriting user-added data)
            setPieces((prev) => {
              if (prev.length > 0) return prev;
              if (!existing.pieces?.length) return prev;
              return existing.pieces.map((p: any, i: number) => ({
                id: `existing-piece-${i}-${Date.now()}`,
                article: p.article ?? "",
                reference: p.reference ?? "",
                quantite: String(Number(p.quantite ?? 0)),
              }));
            });
            // Load photos and videos only if not yet loaded
            setMediaFiles((prev) => {
              if (prev.length > 0) return prev;
              const loadedPhotos = (existing.photos ?? []).map(
                (blob: any, i: number) => ({
                  id: `existing-photo-${i}-${Date.now()}`,
                  type: "photo" as const,
                  dataUrl: blob.getDirectURL
                    ? blob.getDirectURL()
                    : (blob.directURL ?? ""),
                  name: `photo-${i + 1}.jpg`,
                }),
              );
              const loadedVideos = (existing.videos ?? []).map(
                (blob: any, i: number) => ({
                  id: `existing-video-${i}-${Date.now()}`,
                  type: "video" as const,
                  dataUrl: blob.getDirectURL
                    ? blob.getDirectURL()
                    : (blob.directURL ?? ""),
                  name: `video-${i + 1}.mp4`,
                }),
              );
              return [...loadedPhotos, ...loadedVideos];
            });
          }
        })
        .catch(() => {});
    }
  }, [open, actor]);

  const handleIntervenantSignatureChange = (sig: string) => {
    setForm((f) => ({ ...f, signatureIntervenant: sig }));
    if (saveSignatureTimer.current) clearTimeout(saveSignatureTimer.current);
    saveSignatureTimer.current = setTimeout(() => {
      if (actor && sig) {
        actor.sauvegarderSignatureIntervenant(sig).catch(() => {});
      }
    }, 1500);
  };

  const filteredClients =
    clientSearch.length >= 1
      ? clients
          .filter((c) =>
            c.nom.toLowerCase().includes(clientSearch.toLowerCase()),
          )
          .slice(0, 5)
      : [];

  const handleClientSelect = (nom: string, adresse: string) => {
    setClientSearch(nom);
    setForm((f) => ({ ...f, clientNom: nom, clientAdresse: adresse }));
    setShowDropdown(false);
  };

  const set = (field: keyof IForm) => (v: string) =>
    setForm((f) => ({ ...f, [field]: v }));

  // Pieces management
  const addPiece = () => {
    setPieces((prev) => [
      ...prev,
      { id: `piece-${Date.now()}`, article: "", reference: "", quantite: "" },
    ]);
  };

  const updatePiece = (
    id: string,
    field: keyof Omit<Piece, "id">,
    value: string,
  ) => {
    setPieces((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
    );
  };

  const removePiece = (id: string) => {
    setPieces((prev) => prev.filter((p) => p.id !== id));
  };

  // Media management
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    for (const file of files) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        const isVideo = file.type.startsWith("video/");
        setMediaFiles((prev) => [
          ...prev,
          {
            id: `media-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            type: isVideo ? "video" : "photo",
            dataUrl,
            name: file.name,
          },
        ]);
      };
      reader.readAsDataURL(file);
    }
    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  const removeMedia = (id: string) => {
    setMediaFiles((prev) => prev.filter((m) => m.id !== id));
  };

  const buildInput = (
    id: string,
    photoBlobs: any[] = [],
    videoBlobs: any[] = [],
  ): InterventionInput => {
    const piecesInput = pieces.map((p) => ({
      article: p.article,
      reference: p.reference,
      quantite: BigInt(Number.parseInt(p.quantite) || 0),
    }));

    return {
      id,
      date: prefill.date,
      clientNom: form.clientNom || clientSearch,
      clientAdresse: form.clientAdresse,
      heureMatinDebutH: BigInt(Number.parseInt(form.matinDebutH) || 0),
      heureMatinDebutMin: BigInt(Number.parseInt(form.matinDebutMin) || 0),
      heureMatinFinH: BigInt(Number.parseInt(form.matinFinH) || 0),
      heureMatinFinMin: BigInt(Number.parseInt(form.matinFinMin) || 0),
      heureApremDebutH: BigInt(Number.parseInt(form.apremDebutH) || 0),
      heureApremDebutMin: BigInt(Number.parseInt(form.apremDebutMin) || 0),
      heureApremFinH: BigInt(Number.parseInt(form.apremFinH) || 0),
      heureApremFinMin: BigInt(Number.parseInt(form.apremFinMin) || 0),
      description: form.description,
      signatureClient: form.clientAbsent ? "" : form.signatureClient,
      signatureIntervenant: form.signatureIntervenant,
      pieces: piecesInput,
      photos: photoBlobs,
      videos: videoBlobs,
      estAstreinte: form.estAstreinte,
      clientAbsent: form.clientAbsent,
    };
  };

  const handleOfflineSave = async () => {
    const deterministicId = `intv-plan-${missionId}`;
    const data: OfflineInterventionData = {
      id: deterministicId,
      missionId,
      destinatairePrincipalStr: destinatairePrincipal?.toString() ?? "",
      clientNom: form.clientNom || clientSearch,
      clientAdresse: form.clientAdresse,
      date: String(prefill.date),
      heureMatinDebutH: Number.parseInt(form.matinDebutH) || 0,
      heureMatinDebutMin: Number.parseInt(form.matinDebutMin) || 0,
      heureMatinFinH: Number.parseInt(form.matinFinH) || 0,
      heureMatinFinMin: Number.parseInt(form.matinFinMin) || 0,
      heureApremDebutH: Number.parseInt(form.apremDebutH) || 0,
      heureApremDebutMin: Number.parseInt(form.apremDebutMin) || 0,
      heureApremFinH: Number.parseInt(form.apremFinH) || 0,
      heureApremFinMin: Number.parseInt(form.apremFinMin) || 0,
      description: form.description,
      signatureClient: form.clientAbsent ? "" : form.signatureClient,
      signatureIntervenant: form.signatureIntervenant,
      estAstreinte: form.estAstreinte,
      clientAbsent: form.clientAbsent,
      pieces: pieces.map((p) => ({
        article: p.article,
        reference: p.reference,
        quantite: Number.parseInt(p.quantite) || 0,
      })),
      photos: mediaFiles
        .filter((m) => m.type === "photo")
        .map((m) => m.dataUrl),
      videos: mediaFiles
        .filter((m) => m.type === "video")
        .map((m) => m.dataUrl),
      queuedAt: Date.now(),
    };
    await addToQueue(data);
    const { toast } = await import("sonner");
    toast.success(
      "Fiche sauvegardée hors ligne. Elle sera synchronisée automatiquement à la reconnexion.",
    );
    onClose();
  };

  const handleSave = async () => {
    if (!actor) return;
    setIsSaving(true);
    // Deterministic intervention ID — always the same for a given mission
    const deterministicId = `intv-plan-${missionId}`;

    const toBlob = async (dataUrl: string): Promise<ExternalBlob> => {
      if (dataUrl.startsWith("blob:") || dataUrl.startsWith("http")) {
        return ExternalBlob.fromURL(dataUrl);
      }
      const res = await fetch(dataUrl);
      const ab = await res.arrayBuffer();
      const bytes = new Uint8Array(ab);
      return ExternalBlob.fromBytes(bytes);
    };

    try {
      const photoBlobs = await Promise.all(
        mediaFiles
          .filter((m) => m.type === "photo")
          .map((m) => toBlob(m.dataUrl)),
      );
      const videoBlobs = await Promise.all(
        mediaFiles
          .filter((m) => m.type === "video")
          .map((m) => toBlob(m.dataUrl)),
      );
      const input = buildInput(deterministicId, photoBlobs, videoBlobs);

      if (existingFound) {
        // Update existing intervention — backend will also reset validées → en attente
        await actor.modifierIntervention(deterministicId, input);
        const { toast } = await import("sonner");
        toast.success(
          "Fiche mise à jour — repassée en Attente dans Facturation",
        );
      } else {
        // Create new intervention for the destinataire
        await actor.ajouterInterventionPourUtilisateur(
          destinatairePrincipal,
          input,
        );
        // Mark the mission as "execute" (réalisé)
        try {
          await (actor as any).validerPlanningItem(missionId);
        } catch (_e) {
          /* non-blocking */
        }
        const { toast } = await import("sonner");
        toast.success("Fiche enregistrée — mission passée en Réalisé ✓");
      }

      queryClient.invalidateQueries({ queryKey: ["planningItems"] });
      queryClient.invalidateQueries({ queryKey: ["facturationInterventions"] });
      queryClient.invalidateQueries({ queryKey: ["clientsInterventions"] });
      queryClient.invalidateQueries({ queryKey: ["journees"] });
      onClose();
    } catch (e: any) {
      const { toast } = await import("sonner");
      toast.error(`Erreur : ${e?.message ?? String(e)}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center cursor-pointer"
          onClick={() => setLightboxUrl(null)}
          onKeyDown={(e) => e.key === "Escape" && setLightboxUrl(null)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2"
            onClick={() => setLightboxUrl(null)}
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={lightboxUrl}
            alt="Plein écran"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-4">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              {isEditMode
                ? "✏️ Modifier la fiche — Mission"
                : "📋 Fiche intervention — Mission"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Astreinte toggle */}
            <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
              <input
                type="checkbox"
                id="pi-estAstreinte"
                checked={form.estAstreinte}
                onChange={(e) =>
                  setForm((f) => ({ ...f, estAstreinte: e.target.checked }))
                }
                className="w-4 h-4 accent-orange-500"
              />
              <label
                htmlFor="pi-estAstreinte"
                className="text-sm font-semibold text-orange-700 cursor-pointer select-none"
              >
                Intervention d'astreinte
              </label>
              {form.estAstreinte && (
                <span className="ml-auto text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full font-bold">
                  ASTREINTE
                </span>
              )}
            </div>

            {/* Client Nom with autocomplete */}
            <div className="relative">
              <Label className="text-sm font-medium mb-1 block">
                Nom du client
              </Label>
              <Input
                value={clientSearch}
                onChange={(e) => {
                  setClientSearch(e.target.value);
                  setForm((f) => ({ ...f, clientNom: e.target.value }));
                  setShowDropdown(true);
                }}
                onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                onFocus={() => setShowDropdown(true)}
                placeholder="Nom du client..."
                autoComplete="off"
                data-ocid="planning.intervention.client_nom.input"
              />
              {showDropdown && filteredClients.length > 0 && (
                <div
                  ref={dropdownRef}
                  className="absolute z-50 w-full bg-card border border-border rounded-lg shadow-lg mt-1 overflow-auto max-h-48"
                >
                  {filteredClients.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 flex flex-col"
                      onMouseDown={() => handleClientSelect(c.nom, c.adresse)}
                    >
                      <span className="font-medium">{c.nom}</span>
                      {c.adresse && (
                        <span className="text-xs text-muted-foreground">
                          {c.adresse}
                        </span>
                      )}
                      {c.listeNoire && (
                        <span className="text-xs text-red-500 font-semibold">
                          ⛔ Liste noire
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Client Adresse */}
            <div>
              <Label className="text-sm font-medium mb-1 block">Adresse</Label>
              <Input
                value={form.clientAdresse}
                onChange={(e) => set("clientAdresse")(e.target.value)}
                placeholder="Adresse du client..."
                data-ocid="planning.intervention.client_adresse.input"
              />
            </div>

            {/* Matin */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
              <Label className="text-sm font-semibold text-blue-700 block">
                Matin
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">
                    Début
                  </Label>
                  <TimeField
                    labelH="Heure début matin"
                    labelM="Minute début matin"
                    hVal={form.matinDebutH}
                    mVal={form.matinDebutMin}
                    onH={set("matinDebutH")}
                    onM={set("matinDebutMin")}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">
                    Fin
                  </Label>
                  <TimeField
                    labelH="Heure fin matin"
                    labelM="Minute fin matin"
                    hVal={form.matinFinH}
                    mVal={form.matinFinMin}
                    onH={set("matinFinH")}
                    onM={set("matinFinMin")}
                  />
                </div>
              </div>
            </div>

            {/* Après-midi */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
              <Label className="text-sm font-semibold text-blue-700 block">
                Après-midi
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">
                    Début
                  </Label>
                  <TimeField
                    labelH="Heure début après-midi"
                    labelM="Minute début après-midi"
                    hVal={form.apremDebutH}
                    mVal={form.apremDebutMin}
                    onH={set("apremDebutH")}
                    onM={set("apremDebutMin")}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">
                    Fin
                  </Label>
                  <TimeField
                    labelH="Heure fin après-midi"
                    labelM="Minute fin après-midi"
                    hVal={form.apremFinH}
                    mVal={form.apremFinMin}
                    onH={set("apremFinH")}
                    onM={set("apremFinMin")}
                  />
                </div>
              </div>
            </div>

            {/* Description with voice input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-sm font-medium">Description</Label>
                <VoiceInput
                  value={form.description}
                  onChange={(v) => setForm((f) => ({ ...f, description: v }))}
                />
              </div>
              <Textarea
                value={form.description}
                onChange={(e) => set("description")(e.target.value)}
                placeholder="Décrivez ce que vous avez réalisé..."
                rows={3}
                spellCheck={true}
                lang="fr"
                data-ocid="planning.intervention.description.textarea"
              />
            </div>

            {/* Pièces utilisées */}
            <div className="border-2 border-green-500 rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold text-green-700">
                  🔧 Pièces utilisées
                </Label>
                <Button
                  type="button"
                  size="sm"
                  onClick={addPiece}
                  className="h-7 px-2 text-xs bg-green-600 hover:bg-green-700 text-white"
                  data-ocid="planning.intervention.add_piece.button"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Ajouter une pièce
                </Button>
              </div>
              {pieces.length === 0 && (
                <p className="text-xs text-muted-foreground italic">
                  Aucune pièce ajoutée
                </p>
              )}
              {pieces.map((piece, idx) => (
                <div
                  key={piece.id}
                  className="grid grid-cols-[1fr_1fr_80px_auto] gap-2 items-end"
                  data-ocid={`planning.intervention.piece.row.${idx + 1}`}
                >
                  <div>
                    {idx === 0 && (
                      <Label className="text-xs text-muted-foreground mb-1 block">
                        Article
                      </Label>
                    )}
                    <Input
                      value={piece.article}
                      onChange={(e) =>
                        updatePiece(piece.id, "article", e.target.value)
                      }
                      placeholder="Article"
                      className="text-sm"
                    />
                  </div>
                  <div>
                    {idx === 0 && (
                      <Label className="text-xs text-muted-foreground mb-1 block">
                        Référence
                      </Label>
                    )}
                    <Input
                      value={piece.reference}
                      onChange={(e) =>
                        updatePiece(piece.id, "reference", e.target.value)
                      }
                      placeholder="Réf."
                      className="text-sm"
                    />
                  </div>
                  <div>
                    {idx === 0 && (
                      <Label className="text-xs text-muted-foreground mb-1 block">
                        Qté
                      </Label>
                    )}
                    <Input
                      type="number"
                      value={piece.quantite}
                      onChange={(e) =>
                        updatePiece(piece.id, "quantite", e.target.value)
                      }
                      placeholder="1"
                      min={0}
                      className="text-sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removePiece(piece.id)}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                    title="Supprimer"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Photos & Vidéos */}
            <div className="border-2 border-orange-400 rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold text-orange-700">
                  📷 Photos & Vidéos
                </Label>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-7 px-2 text-xs bg-orange-500 hover:bg-orange-600 text-white"
                  data-ocid="planning.intervention.upload_button"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Ajouter
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
              {mediaFiles.length === 0 && (
                <p className="text-xs text-muted-foreground italic">
                  Aucun fichier ajouté
                </p>
              )}
              {mediaFiles.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {mediaFiles.map((media) => (
                    <div key={media.id} className="relative group">
                      {media.type === "photo" ? (
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setLightboxUrl(media.dataUrl)}
                            className="w-full p-0 border-0 bg-transparent"
                          >
                            <img
                              src={media.dataUrl}
                              alt={media.name}
                              className="w-full h-20 object-cover rounded-lg cursor-pointer"
                            />
                          </button>
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-lg transition-all flex items-center justify-center">
                            <ZoomIn className="w-5 h-5 text-white opacity-0 group-hover:opacity-100" />
                          </div>
                        </div>
                      ) : (
                        <video
                          src={media.dataUrl}
                          controls
                          className="w-full h-20 object-cover rounded-lg"
                        >
                          <track kind="captions" />
                        </video>
                      )}
                      <button
                        type="button"
                        onClick={() => removeMedia(media.id)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 shadow"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Signature client */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Signature client</Label>
                <label
                  className="flex items-center gap-2 cursor-pointer select-none"
                  data-ocid="planning.intervention.client_absent.checkbox"
                >
                  <input
                    type="checkbox"
                    checked={form.clientAbsent}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        clientAbsent: e.target.checked,
                        signatureClient: e.target.checked
                          ? ""
                          : f.signatureClient,
                      }))
                    }
                    className="w-4 h-4 accent-orange-500"
                  />
                  <span className="flex items-center gap-1 text-sm text-orange-700 font-medium">
                    <UserX className="w-4 h-4" />
                    Client absent
                  </span>
                </label>
              </div>
              {form.clientAbsent ? (
                <div className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-orange-300 bg-orange-50 py-5">
                  <UserX className="w-5 h-5 text-orange-500" />
                  <span className="text-sm font-semibold text-orange-600">
                    Client absent — pas de signature
                  </span>
                </div>
              ) : (
                <SignaturePad
                  label=""
                  value={form.signatureClient}
                  onChange={set("signatureClient")}
                />
              )}
            </div>

            {/* Signature intervenant */}
            <SignaturePad
              label="Signature intervenant"
              value={form.signatureIntervenant}
              onChange={handleIntervenantSignatureChange}
            />
          </div>

          <DialogFooter className="flex gap-2 mt-4 flex-wrap">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
              data-ocid="planning.intervention.cancel_button"
            >
              Annuler
            </Button>
            {/* "Mettre à jour" — visible to creator when intervention exists in backend */}
            {existingFound &&
              creatorPrincipalStr &&
              currentUserPrincipalStr &&
              creatorPrincipalStr === currentUserPrincipalStr && (
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  variant="outline"
                  className="border-blue-500 text-blue-700 hover:bg-blue-50"
                  data-ocid="planning.intervention.update_button"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-1" />
                      Mise à jour...
                    </>
                  ) : (
                    "✏️ Mettre à jour"
                  )}
                </Button>
              )}
            {/* "Enregistrer" — visible when no existing intervention yet */}
            {!existingFound && (
              <Button
                onClick={isOnline ? handleSave : handleOfflineSave}
                disabled={isSaving}
                className={
                  isOnline
                    ? "bg-orange-500 hover:bg-orange-600 text-white"
                    : "bg-amber-600 hover:bg-amber-700 text-white"
                }
                data-ocid="planning.intervention.submit_button"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                    Enregistrement...
                  </>
                ) : isOnline ? (
                  "✓ Enregistrer"
                ) : (
                  "💾 Sauvegarder hors ligne"
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
