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
import { Loader2, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Intervention, InterventionInput } from "../backend.d";
import {
  useAddIntervention,
  useDeleteIntervention,
  useGetClients,
  useUpdateIntervention,
} from "../hooks/useQueries";
import { SignaturePad } from "./SignaturePad";

interface InterventionFormModalProps {
  open: boolean;
  onClose: () => void;
  date: bigint;
  editingIntervention?: Intervention | null;
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
}

function defaultForm(): IForm {
  return {
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
    description: "",
    signatureClient: "",
    signatureIntervenant: "",
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

export function InterventionFormModal({
  open,
  onClose,
  date,
  editingIntervention,
}: InterventionFormModalProps) {
  const [form, setForm] = useState<IForm>(defaultForm());
  const [clientSearch, setClientSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: clients = [] } = useGetClients();
  const addIntervention = useAddIntervention();
  const updateIntervention = useUpdateIntervention();
  const deleteIntervention = useDeleteIntervention();

  const isMutating =
    addIntervention.isPending ||
    updateIntervention.isPending ||
    deleteIntervention.isPending;

  useEffect(() => {
    if (!open) return;
    if (editingIntervention) {
      setForm({
        clientNom: editingIntervention.clientNom,
        clientAdresse: editingIntervention.clientAdresse,
        matinDebutH: String(Number(editingIntervention.heureMatinDebutH)),
        matinDebutMin: String(Number(editingIntervention.heureMatinDebutMin)),
        matinFinH: String(Number(editingIntervention.heureMatinFinH)),
        matinFinMin: String(Number(editingIntervention.heureMatinFinMin)),
        apremDebutH: String(Number(editingIntervention.heureApremDebutH)),
        apremDebutMin: String(Number(editingIntervention.heureApremDebutMin)),
        apremFinH: String(Number(editingIntervention.heureApremFinH)),
        apremFinMin: String(Number(editingIntervention.heureApremFinMin)),
        description: editingIntervention.description,
        signatureClient: editingIntervention.signatureClient,
        signatureIntervenant: editingIntervention.signatureIntervenant,
      });
      setClientSearch(editingIntervention.clientNom);
    } else {
      setForm(defaultForm());
      setClientSearch("");
    }
  }, [open, editingIntervention]);

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

  const buildInput = () => ({
    id:
      editingIntervention?.id ??
      `intv-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    date,
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
    signatureClient: form.signatureClient,
    signatureIntervenant: form.signatureIntervenant,
    pieces: [],
  });

  const handleSave = async () => {
    const input = buildInput();
    if (editingIntervention) {
      await updateIntervention.mutateAsync({
        id: editingIntervention.id,
        input,
      });
    } else {
      await addIntervention.mutateAsync(input);
    }
    onClose();
  };

  const handleDelete = async () => {
    if (!editingIntervention) return;
    await deleteIntervention.mutateAsync({ id: editingIntervention.id, date });
    onClose();
  };

  const set = (field: keyof IForm) => (v: string) =>
    setForm((f) => ({ ...f, [field]: v }));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-4">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            {editingIntervention
              ? "Modifier l'intervention"
              : "Nouvelle intervention"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
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
              data-ocid="intervention.client_nom.input"
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
              data-ocid="intervention.client_adresse.input"
            />
          </div>

          {/* Matin */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
            <Label className="text-sm font-semibold text-blue-700 block">
              Matin
            </Label>
            <div className="grid grid-cols-2 gap-3">
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
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 space-y-2">
            <Label className="text-sm font-semibold text-orange-700 block">
              Après-midi
            </Label>
            <div className="grid grid-cols-2 gap-3">
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
              data-ocid="intervention.description.textarea"
            />
          </div>

          {/* Signatures */}
          <SignaturePad
            label="Signature client"
            value={form.signatureClient}
            onChange={set("signatureClient")}
          />
          <SignaturePad
            label="Signature intervenant"
            value={form.signatureIntervenant}
            onChange={set("signatureIntervenant")}
          />
        </div>

        <DialogFooter className="flex gap-2 mt-4">
          {editingIntervention && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={isMutating}
              data-ocid="intervention.delete.delete_button"
            >
              {deleteIntervention.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isMutating}
            data-ocid="intervention.cancel.cancel_button"
          >
            Annuler
          </Button>
          <Button
            onClick={handleSave}
            disabled={isMutating}
            data-ocid="intervention.save.save_button"
          >
            {addIntervention.isPending || updateIntervention.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-1" />{" "}
                Enregistrement...
              </>
            ) : editingIntervention ? (
              "Mettre à jour"
            ) : (
              "Enregistrer"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
