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
import {
  Loader2,
  Mail,
  MapPin,
  Phone,
  Plus,
  Search,
  Trash2,
  UserX,
} from "lucide-react";
import { useState } from "react";
import type { Client } from "../backend";
import {
  useAddClient,
  useDeleteClient,
  useGetClients,
  useToggleBlacklist,
  useUpdateClient,
} from "../hooks/useQueries";

const emptyForm = (): Omit<Client, "id" | "createdAt" | "listeNoire"> => ({
  nom: "",
  adresse: "",
  telephone: "",
  email: "",
});

export default function Clients() {
  const { data: clients = [], isLoading } = useGetClients();
  const addClient = useAddClient();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();
  const toggleBlacklist = useToggleBlacklist();

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const filtered = clients.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.nom.toLowerCase().includes(q) ||
      c.telephone.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q)
    );
  });

  // Sort: blacklisted at the top for visibility
  const sorted = [...filtered].sort((a, b) =>
    a.listeNoire === b.listeNoire ? 0 : a.listeNoire ? -1 : 1,
  );

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (client: Client) => {
    setEditingId(client.id);
    setForm({
      nom: client.nom,
      adresse: client.adresse,
      telephone: client.telephone,
      email: client.email,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.nom.trim()) return;
    const now = BigInt(Date.now()) * 1_000_000n;
    if (editingId) {
      const existing = clients.find((c) => c.id === editingId);
      await updateClient.mutateAsync({
        id: editingId,
        client: {
          id: editingId,
          nom: form.nom.trim(),
          adresse: form.adresse.trim(),
          telephone: form.telephone.trim(),
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
        telephone: form.telephone.trim(),
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
        <h1 className="text-xl font-bold text-foreground">Clients</h1>
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
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-9 text-base"
          placeholder="Rechercher par nom, téléphone, email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          data-ocid="clients.search_input"
        />
      </div>

      {/* Loading */}
      {isLoading && (
        <div
          className="flex justify-center py-12"
          data-ocid="clients.loading_state"
        >
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty */}
      {!isLoading && sorted.length === 0 && (
        <div
          className="flex flex-col items-center justify-center py-16 text-muted-foreground"
          data-ocid="clients.empty_state"
        >
          <UserX className="w-12 h-12 mb-3 opacity-40" />
          <p className="text-sm">
            {search ? "Aucun résultat" : "Aucun client enregistré"}
          </p>
        </div>
      )}

      {/* Client list */}
      <div className="space-y-3">
        {sorted.map((client, idx) => (
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
                {client.telephone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 shrink-0" />
                    <a
                      href={`tel:${client.telephone}`}
                      className="hover:text-foreground"
                    >
                      {client.telephone}
                    </a>
                  </div>
                )}
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
                  {client.listeNoire
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
                Téléphone
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
