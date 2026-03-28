import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Plus,
  RefreshCw,
  Trash2,
  UserCheck,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Mission } from "../backend";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useGetAllProfiles } from "../hooks/useQueries";

function formatDate(ts: bigint): string {
  const d = new Date(Number(ts / 1_000_000n));
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function dateToTimestamp(dateStr: string): bigint {
  const d = new Date(dateStr);
  return BigInt(d.getTime()) * 1_000_000n;
}

const TYPE_LABELS: Record<string, string> = {
  depannage: "Dépannage",
  controle: "Contrôle",
  chantier: "Chantier",
};

interface MissionCardProps {
  mission: Mission;
  myPrincipal: string;
  allProfiles: Array<[any, { name: string; email: string }]>;
  onAccept: (id: string) => void;
  onDelete: (id: string) => void;
  onRedirect: (id: string, toPrincipal: string, toName: string) => void;
  onChangeDate: (id: string, mission: Mission, newDate: string) => void;
  isReceived: boolean;
}

function MissionCard({
  mission,
  myPrincipal,
  allProfiles,
  onAccept,
  onDelete,
  onRedirect,
  onChangeDate,
  isReceived,
}: MissionCardProps) {
  const [showRedirect, setShowRedirect] = useState(false);
  const [showDateChange, setShowDateChange] = useState(false);
  const [redirectTarget, setRedirectTarget] = useState("");
  const [newDate, setNewDate] = useState("");
  const [loading, setLoading] = useState(false);

  const canDelete =
    myPrincipal === mission.createur.toString() ||
    myPrincipal === mission.destinataire.toString();

  const otherProfiles = allProfiles.filter(
    ([p]) => p.toString() !== myPrincipal,
  );

  const handleRedirect = async () => {
    if (!redirectTarget) return;
    const entry = allProfiles.find(([p]) => p.toString() === redirectTarget);
    if (!entry) return;
    setLoading(true);
    try {
      await onRedirect(
        mission.id,
        redirectTarget,
        entry[1].name || "Utilisateur",
      );
      setShowRedirect(false);
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = async () => {
    if (!newDate) return;
    setLoading(true);
    try {
      await onChangeDate(mission.id, mission, newDate);
      setShowDateChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="rounded-xl border p-3 sm:p-4 space-y-2"
      style={{
        backgroundColor: "rgba(255,255,255,0.05)",
        borderColor:
          mission.statut === "acceptee" ? "#22c55e" : "rgba(255,165,0,0.3)",
      }}
    >
      {/* Header row */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-white text-sm">
              {mission.titre}
            </span>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{
                backgroundColor:
                  mission.statut === "acceptee"
                    ? "rgba(34,197,94,0.2)"
                    : "rgba(255,165,0,0.2)",
                color: mission.statut === "acceptee" ? "#22c55e" : "#f97316",
                border: `1px solid ${
                  mission.statut === "acceptee" ? "#22c55e" : "#f97316"
                }`,
              }}
            >
              {mission.statut === "acceptee" ? "✓ Acceptée" : "⏳ En attente"}
            </span>
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: "rgba(99,102,241,0.2)",
                color: "#a5b4fc",
              }}
            >
              {TYPE_LABELS[mission.typeMission] ?? mission.typeMission}
            </span>
          </div>
          <div className="text-xs mt-1" style={{ color: "#94a3b8" }}>
            <span>📅 {formatDate(mission.datePrevue)}</span>
            {" · "}
            <span>🏢 {mission.nomClient}</span>
          </div>
          {!isReceived && (
            <div className="text-xs" style={{ color: "#94a3b8" }}>
              → {mission.nomDestinataire || "Destinataire inconnu"}
            </div>
          )}
          {isReceived && (
            <div className="text-xs" style={{ color: "#94a3b8" }}>
              Par: {mission.nomCreateur || "Inconnu"}
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      {mission.description && (
        <p className="text-xs" style={{ color: "#cbd5e1" }}>
          {mission.description}
        </p>
      )}

      {/* Actions */}
      {isReceived && mission.statut === "en_attente" && (
        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            size="sm"
            className="h-7 text-xs gap-1"
            style={{ backgroundColor: "#16a34a", color: "white" }}
            onClick={() => onAccept(mission.id)}
            data-ocid="missions.accept.button"
          >
            <Check className="w-3 h-3" /> Accepter
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1"
            style={{ borderColor: "#3b82f6", color: "#3b82f6" }}
            onClick={() => setShowDateChange(!showDateChange)}
            data-ocid="missions.change_date.button"
          >
            <Calendar className="w-3 h-3" /> Changer date
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1"
            style={{ borderColor: "#f97316", color: "#f97316" }}
            onClick={() => setShowRedirect(!showRedirect)}
            data-ocid="missions.redirect.button"
          >
            <UserCheck className="w-3 h-3" /> Rediriger
          </Button>
          {canDelete && (
            <Button
              size="sm"
              variant="destructive"
              className="h-7 text-xs gap-1"
              onClick={() => onDelete(mission.id)}
              data-ocid="missions.delete.delete_button"
            >
              <Trash2 className="w-3 h-3" /> Supprimer
            </Button>
          )}
        </div>
      )}

      {/* Non-pending received or created missions - just delete */}
      {(!isReceived || mission.statut === "acceptee") && canDelete && (
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            variant="destructive"
            className="h-7 text-xs gap-1"
            onClick={() => onDelete(mission.id)}
            data-ocid="missions.delete.delete_button"
          >
            <Trash2 className="w-3 h-3" /> Supprimer
          </Button>
        </div>
      )}

      {/* Date change inline */}
      {showDateChange && (
        <div
          className="flex items-end gap-2 p-2 rounded-lg"
          style={{ backgroundColor: "rgba(59,130,246,0.1)" }}
        >
          <div className="flex-1">
            <Label className="text-xs text-white mb-1 block">
              Nouvelle date
            </Label>
            <Input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="h-7 text-xs"
              data-ocid="missions.new_date.input"
            />
          </div>
          <Button
            size="sm"
            className="h-7 text-xs"
            onClick={handleDateChange}
            disabled={loading || !newDate}
          >
            {loading ? <RefreshCw className="w-3 h-3 animate-spin" /> : "OK"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            onClick={() => setShowDateChange(false)}
          >
            ✕
          </Button>
        </div>
      )}

      {/* Redirect inline */}
      {showRedirect && (
        <div
          className="flex items-end gap-2 p-2 rounded-lg"
          style={{ backgroundColor: "rgba(249,115,22,0.1)" }}
        >
          <div className="flex-1">
            <Label className="text-xs text-white mb-1 block">
              Rediriger vers
            </Label>
            <Select value={redirectTarget} onValueChange={setRedirectTarget}>
              <SelectTrigger
                className="h-7 text-xs"
                data-ocid="missions.redirect.select"
              >
                <SelectValue placeholder="Choisir utilisateur" />
              </SelectTrigger>
              <SelectContent>
                {otherProfiles.map(([p, profile]) => (
                  <SelectItem key={p.toString()} value={p.toString()}>
                    {profile.name || "Utilisateur"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            size="sm"
            className="h-7 text-xs"
            onClick={handleRedirect}
            disabled={loading || !redirectTarget}
          >
            {loading ? <RefreshCw className="w-3 h-3 animate-spin" /> : "OK"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            onClick={() => setShowRedirect(false)}
          >
            ✕
          </Button>
        </div>
      )}
    </div>
  );
}

export default function MissionsSection() {
  const { identity } = useInternetIdentity();
  const { actor, isFetching } = useActor();
  const queryClient = useQueryClient();
  const { data: allProfiles = [] } = useGetAllProfiles();

  const myPrincipal = identity?.getPrincipal().toString() ?? "";
  const enabled = !!actor && !isFetching && !!identity;

  const [collapsed, setCollapsed] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  // Form state
  const [form, setForm] = useState({
    titre: "",
    datePrevue: "",
    destinataire: "",
    nomClient: "",
    typeMission: "",
    description: "",
  });

  const { data: missionsRecues = [] } = useQuery<Mission[]>({
    queryKey: ["missionsRecues"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.obtenirMissionsRecues();
    },
    enabled,
    refetchInterval: 30000,
  });

  const { data: missionsCreees = [] } = useQuery<Mission[]>({
    queryKey: ["missionsCreees"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.obtenirMissionsCreees();
    },
    enabled,
    refetchInterval: 30000,
  });

  const { data: missionsAcceptees = [] } = useQuery<Mission[]>({
    queryKey: ["missionsAcceptees"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.obtenirToutesMissionsAcceptees();
    },
    enabled,
    refetchInterval: 30000,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["missionsRecues"] });
    queryClient.invalidateQueries({ queryKey: ["missionsCreees"] });
    queryClient.invalidateQueries({ queryKey: ["missionsAcceptees"] });
    queryClient.invalidateQueries({ queryKey: ["missionBadge"] });
  };

  const handleAccept = async (id: string) => {
    if (!actor) return;
    try {
      await actor.accepterMission(id);
      invalidateAll();
      toast.success("Mission acceptée");
    } catch {
      toast.error("Erreur lors de l'acceptation");
    }
  };

  const handleDelete = async (id: string) => {
    if (!actor) return;
    try {
      await actor.supprimerMission(id);
      invalidateAll();
      toast.success("Mission supprimée");
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleRedirect = async (
    id: string,
    toPrincipalStr: string,
    toName: string,
  ) => {
    if (!actor) return;
    const entry = allProfiles.find(([p]) => p.toString() === toPrincipalStr);
    if (!entry) return;
    try {
      await actor.redigerMissionVersAutre(id, entry[0], toName);
      invalidateAll();
      toast.success(`Mission redirigée vers ${toName}`);
    } catch {
      toast.error("Erreur lors de la redirection");
    }
  };

  const handleChangeDate = async (
    id: string,
    mission: Mission,
    newDateStr: string,
  ) => {
    if (!actor) return;
    try {
      // Delete then recreate with new date
      await actor.supprimerMission(id);
      const newDateTs = dateToTimestamp(newDateStr);
      const destEntry = allProfiles.find(
        ([p]) => p.toString() === mission.destinataire.toString(),
      );
      const destPrincipal = destEntry ? destEntry[0] : mission.destinataire;
      await actor.creerMission(
        id,
        mission.titre,
        newDateTs,
        destPrincipal,
        mission.nomDestinataire,
        mission.nomCreateur,
        mission.nomClient,
        mission.typeMission,
        mission.description,
      );
      invalidateAll();
      toast.success("Date mise à jour");
    } catch {
      toast.error("Erreur lors du changement de date");
    }
  };

  const handleCreate = async () => {
    if (
      !actor ||
      !form.titre ||
      !form.datePrevue ||
      !form.destinataire ||
      !form.nomClient ||
      !form.typeMission
    ) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }
    const destEntry = allProfiles.find(
      ([p]) => p.toString() === form.destinataire,
    );
    if (!destEntry) {
      toast.error("Destinataire introuvable");
      return;
    }
    const myProfile = allProfiles.find(([p]) => p.toString() === myPrincipal);
    const myName = myProfile
      ? myProfile[1].name || "Utilisateur"
      : "Utilisateur";

    setCreateLoading(true);
    try {
      await actor.creerMission(
        crypto.randomUUID(),
        form.titre,
        dateToTimestamp(form.datePrevue),
        destEntry[0],
        destEntry[1].name || "Utilisateur",
        myName,
        form.nomClient,
        form.typeMission,
        form.description,
      );
      invalidateAll();
      toast.success("Mission créée");
      setForm({
        titre: "",
        datePrevue: "",
        destinataire: "",
        nomClient: "",
        typeMission: "",
        description: "",
      });
      setCreateOpen(false);
    } catch {
      toast.error("Erreur lors de la création");
    } finally {
      setCreateLoading(false);
    }
  };

  const otherProfiles = allProfiles.filter(
    ([p]) => p.toString() !== myPrincipal,
  );
  const pendingRecuCount = missionsRecues.filter(
    (m) => m.statut === "en_attente",
  ).length;

  return (
    <div
      className="mt-6 rounded-2xl overflow-hidden"
      style={{ border: "2px solid rgba(249,115,22,0.3)" }}
    >
      {/* Section header */}
      <button
        type="button"
        className="w-full flex items-center justify-between p-4 text-left"
        style={{ backgroundColor: "rgba(249,115,22,0.1)" }}
        onClick={() => setCollapsed(!collapsed)}
        data-ocid="missions.section.toggle"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: "rgba(249,115,22,0.2)" }}
          >
            <Clock className="w-4 h-4" style={{ color: "#f97316" }} />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">Missions</h3>
            {pendingRecuCount > 0 && (
              <p className="text-xs" style={{ color: "#f97316" }}>
                {pendingRecuCount} mission{pendingRecuCount > 1 ? "s" : ""} en
                attente
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                className="h-8 text-xs gap-1 font-semibold"
                style={{ backgroundColor: "#f97316", color: "white" }}
                onClick={(e) => e.stopPropagation()}
                data-ocid="missions.create.open_modal_button"
              >
                <Plus className="w-3 h-3" /> Créer
              </Button>
            </DialogTrigger>
            <DialogContent
              className="max-w-md"
              style={{
                backgroundColor: "#0f1e4a",
                border: "2px solid rgba(249,115,22,0.4)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <DialogHeader>
                <DialogTitle className="text-white">
                  Créer une mission
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label className="text-white text-sm">Titre *</Label>
                  <Input
                    value={form.titre}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, titre: e.target.value }))
                    }
                    placeholder="Titre de la mission"
                    className="mt-1"
                    data-ocid="missions.create.titre.input"
                  />
                </div>
                <div>
                  <Label className="text-white text-sm">Date prévue *</Label>
                  <Input
                    type="date"
                    value={form.datePrevue}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, datePrevue: e.target.value }))
                    }
                    className="mt-1"
                    data-ocid="missions.create.date.input"
                  />
                </div>
                <div>
                  <Label className="text-white text-sm">Destinataire *</Label>
                  <Select
                    value={form.destinataire}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, destinataire: v }))
                    }
                  >
                    <SelectTrigger
                      className="mt-1"
                      data-ocid="missions.create.destinataire.select"
                    >
                      <SelectValue placeholder="Choisir un utilisateur" />
                    </SelectTrigger>
                    <SelectContent>
                      {otherProfiles.map(([p, profile]) => (
                        <SelectItem key={p.toString()} value={p.toString()}>
                          {profile.name || "Utilisateur"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-white text-sm">Nom client *</Label>
                  <Input
                    value={form.nomClient}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, nomClient: e.target.value }))
                    }
                    placeholder="Nom du client"
                    className="mt-1"
                    data-ocid="missions.create.client.input"
                  />
                </div>
                <div>
                  <Label className="text-white text-sm">
                    Type de mission *
                  </Label>
                  <Select
                    value={form.typeMission}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, typeMission: v }))
                    }
                  >
                    <SelectTrigger
                      className="mt-1"
                      data-ocid="missions.create.type.select"
                    >
                      <SelectValue placeholder="Type de mission" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="depannage">Dépannage</SelectItem>
                      <SelectItem value="controle">Contrôle</SelectItem>
                      <SelectItem value="chantier">Chantier</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-white text-sm">Description</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, description: e.target.value }))
                    }
                    placeholder="Description de la mission..."
                    rows={3}
                    className="mt-1"
                    data-ocid="missions.create.description.textarea"
                  />
                </div>
              </div>
              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => setCreateOpen(false)}>
                  Annuler
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={createLoading}
                  style={{ backgroundColor: "#f97316", color: "white" }}
                  data-ocid="missions.create.submit_button"
                >
                  {createLoading ? (
                    <span className="flex items-center gap-1">
                      <RefreshCw className="w-3 h-3 animate-spin" /> Création...
                    </span>
                  ) : (
                    "Créer la mission"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          {collapsed ? (
            <ChevronDown className="w-5 h-5 text-white" />
          ) : (
            <ChevronUp className="w-5 h-5 text-white" />
          )}
        </div>
      </button>

      {/* Body */}
      {!collapsed && (
        <div
          className="p-4 space-y-6"
          style={{ backgroundColor: "rgba(15,30,74,0.8)" }}
        >
          {/* Received / Created tabs */}
          <Tabs defaultValue="recues">
            <TabsList className="w-full mb-4">
              <TabsTrigger
                value="recues"
                className="flex-1"
                data-ocid="missions.recues.tab"
              >
                Reçues
                {pendingRecuCount > 0 && (
                  <span
                    className="ml-2 w-5 h-5 rounded-full text-xs flex items-center justify-center"
                    style={{ backgroundColor: "#f97316", color: "white" }}
                  >
                    {pendingRecuCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="creees"
                className="flex-1"
                data-ocid="missions.creees.tab"
              >
                Créées
                {missionsCreees.length > 0 && (
                  <span
                    className="ml-2 w-5 h-5 rounded-full text-xs flex items-center justify-center"
                    style={{
                      backgroundColor: "rgba(255,255,255,0.2)",
                      color: "white",
                    }}
                  >
                    {missionsCreees.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="recues"
              className="space-y-3"
              data-ocid="missions.recues.panel"
            >
              {missionsRecues.length === 0 ? (
                <div
                  className="text-center py-6"
                  style={{ color: "#94a3b8" }}
                  data-ocid="missions.recues.empty_state"
                >
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Aucune mission reçue</p>
                </div>
              ) : (
                missionsRecues.map((m, i) => (
                  <div key={m.id} data-ocid={`missions.recues.item.${i + 1}`}>
                    <MissionCard
                      mission={m}
                      myPrincipal={myPrincipal}
                      allProfiles={allProfiles as any}
                      onAccept={handleAccept}
                      onDelete={handleDelete}
                      onRedirect={handleRedirect}
                      onChangeDate={handleChangeDate}
                      isReceived={true}
                    />
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent
              value="creees"
              className="space-y-3"
              data-ocid="missions.creees.panel"
            >
              {missionsCreees.length === 0 ? (
                <div
                  className="text-center py-6"
                  style={{ color: "#94a3b8" }}
                  data-ocid="missions.creees.empty_state"
                >
                  <Plus className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Aucune mission créée</p>
                </div>
              ) : (
                missionsCreees.map((m, i) => (
                  <div key={m.id} data-ocid={`missions.creees.item.${i + 1}`}>
                    <MissionCard
                      mission={m}
                      myPrincipal={myPrincipal}
                      allProfiles={allProfiles as any}
                      onAccept={handleAccept}
                      onDelete={handleDelete}
                      onRedirect={handleRedirect}
                      onChangeDate={handleChangeDate}
                      isReceived={false}
                    />
                  </div>
                ))
              )}
            </TabsContent>
          </Tabs>

          {/* Accepted missions — read-only for all, with delete for creator/recipient */}
          <div>
            <h4 className="font-semibold text-white text-sm mb-3 flex items-center gap-2">
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
                style={{
                  backgroundColor: "rgba(34,197,94,0.2)",
                  color: "#22c55e",
                }}
              >
                ✓
              </span>
              Missions acceptées
            </h4>
            {missionsAcceptees.length === 0 ? (
              <div
                className="text-center py-4"
                style={{ color: "#94a3b8" }}
                data-ocid="missions.acceptees.empty_state"
              >
                <p className="text-sm">Aucune mission acceptée</p>
              </div>
            ) : (
              <div className="space-y-3">
                {missionsAcceptees.map((m, i) => {
                  const canDel =
                    myPrincipal === m.createur.toString() ||
                    myPrincipal === m.destinataire.toString();
                  return (
                    <div
                      key={m.id}
                      className="rounded-xl border p-3 space-y-1"
                      style={{
                        backgroundColor: "rgba(34,197,94,0.05)",
                        borderColor: "rgba(34,197,94,0.3)",
                      }}
                      data-ocid={`missions.acceptees.item.${i + 1}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-white text-sm">
                              {m.titre}
                            </span>
                            <span
                              className="text-xs px-2 py-0.5 rounded-full"
                              style={{
                                backgroundColor: "rgba(99,102,241,0.2)",
                                color: "#a5b4fc",
                              }}
                            >
                              {TYPE_LABELS[m.typeMission] ?? m.typeMission}
                            </span>
                          </div>
                          <div
                            className="text-xs mt-0.5"
                            style={{ color: "#94a3b8" }}
                          >
                            📅 {formatDate(m.datePrevue)} · 🏢 {m.nomClient}
                          </div>
                          <div className="text-xs" style={{ color: "#94a3b8" }}>
                            Assigné à: {m.nomDestinataire} · Par:{" "}
                            {m.nomCreateur}
                          </div>
                          {m.description && (
                            <p
                              className="text-xs mt-1"
                              style={{ color: "#cbd5e1" }}
                            >
                              {m.description}
                            </p>
                          )}
                        </div>
                        {canDel && (
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-7 text-xs flex-shrink-0"
                            onClick={() => handleDelete(m.id)}
                            data-ocid="missions.acceptees.delete_button"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
