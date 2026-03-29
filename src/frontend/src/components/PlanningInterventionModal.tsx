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
import { Loader2, UserX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { InterventionInput } from "../backend";
import { useActor } from "../hooks/useActor";
import { useGetClients } from "../hooks/useQueries";
import { SignaturePad } from "./SignaturePad";

interface PlanningInterventionModalProps {
  open: boolean;
  onClose: () => void;
  missionId: string;
  destinatairePrincipal: any;
  interventionId?: string; // If set, edit mode
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

function defaultForm(prefill?: {
  clientNom: string;
  clientAdresse: string;
  description: string;
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
    description: prefill?.description ?? "",
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
  prefill,
}: PlanningInterventionModalProps) {
  const isEditMode = !!interventionId;
  const [form, setForm] = useState<IForm>(defaultForm(prefill));
  const [clientSearch, setClientSearch] = useState(prefill.clientNom);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const saveSignatureTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [existingInterventionId, setExistingInterventionId] = useState<
    string | undefined
  >(interventionId);

  const { actor } = useActor();
  const { data: clients = [] } = useGetClients();
  const queryClient = useQueryClient();

  // Load saved intervenant signature and existing intervention data when modal opens
  useEffect(() => {
    if (!open) return;
    setForm(defaultForm(prefill));
    setClientSearch(prefill.clientNom);
    setExistingInterventionId(interventionId);

    if (actor) {
      // Load intervenant signature
      actor
        .obtenirSignatureIntervenant()
        .then((sig) => {
          if (sig) setForm((f) => ({ ...f, signatureIntervenant: sig }));
        })
        .catch(() => {});

      // If edit mode or execute statut, try to load existing intervention
      if (interventionId || isEditMode) {
        // Load by interventionId if provided
        // (no direct get by id, so we fetch by day and find matching)
        (actor as any)
          .obtenirInterventionsPourJour?.(prefill.date)
          .then((interventions: any[]) => {
            const existing = interventionId
              ? interventions.find((i: any) => i.id === interventionId)
              : interventions.find(
                  (i: any) =>
                    i.clientNom?.toLowerCase().trim() ===
                    prefill.clientNom.toLowerCase().trim(),
                );
            if (existing) {
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
                description: existing.description,
                signatureClient: existing.signatureClient,
                signatureIntervenant: existing.signatureIntervenant,
                estAstreinte: existing.estAstreinte ?? false,
                clientAbsent: existing.clientAbsent ?? false,
              });
            }
          })
          .catch(() => {});
      }
    }
  }, [open, actor, prefill, interventionId, isEditMode]);

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

  const buildInput = (id: string): InterventionInput => ({
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
    pieces: [],
    photos: [],
    videos: [],
    estAstreinte: form.estAstreinte,
    clientAbsent: form.clientAbsent,
  });

  const handleSave = async () => {
    if (!actor) return;
    setIsSaving(true);
    try {
      if (isEditMode && existingInterventionId) {
        // Edit mode: just update the intervention, don't re-validate mission
        const input = buildInput(existingInterventionId);
        await actor.modifierIntervention(existingInterventionId, input);
        queryClient.invalidateQueries({
          queryKey: ["facturationInterventions"],
        });
        queryClient.invalidateQueries({ queryKey: ["journees"] });
        const { toast } = await import("sonner");
        toast.success("Fiche mise à jour");
        onClose();
      } else {
        // New mode: create, validate, and mark mission as execute
        const newId = `intv-plan-${missionId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const input = buildInput(newId);

        // 1. Add intervention to destinataire's calendar
        await actor.ajouterInterventionPourUtilisateur(
          destinatairePrincipal,
          input,
        );

        // 2. Validate it so it goes to Facturation
        await actor.validerIntervention(newId);

        // 3. Mark the planning mission as "Exécuté"
        await (actor as any).validerPlanningItem(missionId);

        queryClient.invalidateQueries({ queryKey: ["planningItems"] });
        queryClient.invalidateQueries({
          queryKey: ["facturationInterventions"],
        });
        queryClient.invalidateQueries({ queryKey: ["journees"] });

        const { toast } = await import("sonner");
        toast.success("Intervention validée et envoyée en Facturation");
        onClose();
      }
    } catch (e: any) {
      const { toast } = await import("sonner");
      toast.error(`Erreur : ${e?.message ?? String(e)}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
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

          {/* Description */}
          <div>
            <Label className="text-sm font-medium mb-1 block">
              Description
            </Label>
            <Textarea
              value={form.description}
              onChange={(e) => set("description")(e.target.value)}
              placeholder="Description de l'intervention..."
              rows={3}
              data-ocid="planning.intervention.description.textarea"
            />
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

        <DialogFooter className="flex gap-2 mt-4">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
            data-ocid="planning.intervention.cancel_button"
          >
            Annuler
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-orange-500 hover:bg-orange-600 text-white"
            data-ocid="planning.intervention.submit_button"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
                {isEditMode ? "Mise à jour..." : "Validation..."}
              </>
            ) : isEditMode ? (
              "Enregistrer la fiche"
            ) : (
              "✓ Valider l'intervention"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
