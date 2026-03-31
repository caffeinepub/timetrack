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
import { Building2, Mail, Phone, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ADMIN_PRINCIPAL_ID } from "../hooks/useAccessControl";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

interface ContactRaw {
  id: string;
  nom: string;
  telephone: string;
  email: string;
  createdBy: any;
  createdAt: bigint;
}

interface Contact {
  id: string;
  nom: string;
  societe: string;
  telephone: string;
  email: string;
  createdBy: any;
  createdAt: bigint;
}

function decodeContact(raw: ContactRaw): Contact {
  const parts = raw.nom.split("||");
  return {
    ...raw,
    nom: parts[0] ?? "",
    societe: parts[1] ?? "",
  };
}

function useContacts() {
  const { actor, isFetching } = useActor();
  return useQuery<Contact[]>({
    queryKey: ["contacts"],
    queryFn: async () => {
      if (!actor) return [];
      const raws: ContactRaw[] = await (actor as any).obtenirContacts();
      return raws.map(decodeContact);
    },
    enabled: !!actor && !isFetching,
  });
}

function useAddContact() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      id: string;
      nom: string;
      societe: string;
      telephone: string;
      email: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      // Encode nom||societe into a single nom field as expected by backend
      const encodedNom = `${params.nom}||${params.societe}`;
      return (actor as any).ajouterContact(
        params.id,
        encodedNom,
        params.telephone,
        params.email,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
}

function useDeleteContact() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error("Actor not available");
      return (actor as any).supprimerContact(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
}

export default function ContactPage() {
  const { identity } = useInternetIdentity();
  const principalId = identity?.getPrincipal().toText() ?? null;
  const isAdmin = principalId === ADMIN_PRINCIPAL_ID;

  const { data: contacts = [], isLoading } = useContacts();
  const addContact = useAddContact();
  const deleteContact = useDeleteContact();

  const [showForm, setShowForm] = useState(false);
  const [nom, setNom] = useState("");
  const [societe, setSociete] = useState("");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");

  const handleAdd = async () => {
    if (!nom.trim() && !societe.trim()) {
      toast.error("Le nom ou la soci\u00e9t\u00e9 est requis");
      return;
    }
    try {
      const id = `contact-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      await addContact.mutateAsync({
        id,
        nom: nom.trim(),
        societe: societe.trim(),
        telephone: telephone.trim(),
        email: email.trim(),
      });
      toast.success("Contact ajout\u00e9");
      setNom("");
      setSociete("");
      setTelephone("");
      setEmail("");
      setShowForm(false);
    } catch {
      toast.error("Erreur lors de l'ajout du contact");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteContact.mutateAsync(id);
      toast.success("Contact supprim\u00e9");
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-xl font-bold"
            style={{ color: "oklch(var(--navy-dark))" }}
          >
            Contacts
          </h1>
          <p className="text-sm text-muted-foreground">
            {contacts.length} contact{contacts.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 font-semibold"
          style={{ backgroundColor: "#ea580c", color: "white" }}
          data-ocid="contact.open_modal_button"
        >
          <Plus className="w-4 h-4" />
          Ajouter
        </Button>
      </div>

      {isLoading && (
        <div className="text-center py-12" data-ocid="contact.loading_state">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      )}

      {!isLoading && contacts.length === 0 && (
        <div
          className="text-center py-16 rounded-2xl border-2 border-dashed"
          style={{
            borderColor: "oklch(var(--vts-green) / 0.3)",
            backgroundColor: "oklch(var(--vts-green) / 0.04)",
          }}
          data-ocid="contact.empty_state"
        >
          <Building2
            className="w-12 h-12 mx-auto mb-3 opacity-30"
            style={{ color: "oklch(var(--navy-dark))" }}
          />
          <p className="text-muted-foreground font-medium">
            Aucun contact enregistr\u00e9
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Cliquez sur &quot;Ajouter&quot; pour cr\u00e9er un contact
          </p>
        </div>
      )}

      <div className="space-y-3">
        {contacts.map((contact, idx) => (
          <div
            key={contact.id}
            className="rounded-xl border p-4 shadow-sm flex flex-col gap-2 bg-card"
            style={{ borderColor: "oklch(var(--vts-green) / 0.25)" }}
            data-ocid={`contact.item.${idx + 1}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    backgroundColor: "oklch(var(--navy-dark))",
                    color: "white",
                  }}
                >
                  <Building2 className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  {contact.nom && (
                    <p
                      className="font-bold text-base truncate"
                      style={{ color: "oklch(var(--navy-dark))" }}
                    >
                      {contact.nom}
                    </p>
                  )}
                  {contact.societe && (
                    <p className="text-sm text-muted-foreground truncate">
                      {contact.societe}
                    </p>
                  )}
                  {!contact.nom && !contact.societe && (
                    <span
                      className="font-bold text-base"
                      style={{ color: "oklch(var(--navy-dark))" }}
                    >
                      Contact
                    </span>
                  )}
                </div>
              </div>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => handleDelete(contact.id)}
                  className="flex-shrink-0 p-1.5 rounded-lg transition-colors hover:bg-red-50"
                  title="Supprimer ce contact"
                  data-ocid={`contact.delete_button.${idx + 1}`}
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              )}
            </div>

            <div className="flex flex-col gap-1.5 pl-11">
              {contact.telephone && (
                <a
                  href={`tel:${contact.telephone}`}
                  className="flex items-center gap-2 text-sm font-medium hover:underline"
                  style={{ color: "#ea580c" }}
                >
                  <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                  {contact.telephone}
                </a>
              )}
              {contact.email && (
                <a
                  href={`mailto:${contact.email}`}
                  className="flex items-center gap-2 text-sm hover:underline"
                  style={{ color: "oklch(var(--vts-green))" }}
                >
                  <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                  {contact.email}
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-sm" data-ocid="contact.dialog">
          <DialogHeader>
            <DialogTitle>Nouveau contact</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="contact-nom">Nom</Label>
              <Input
                id="contact-nom"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Jean Dupont"
                data-ocid="contact.input_nom"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-societe">Soci\u00e9t\u00e9</Label>
              <Input
                id="contact-societe"
                value={societe}
                onChange={(e) => setSociete(e.target.value)}
                placeholder="Vial Traite Service"
                data-ocid="contact.input_societe"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-tel">T\u00e9l\u00e9phone</Label>
              <Input
                id="contact-tel"
                type="tel"
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                placeholder="04 71 20 12 22"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-email">Email</Label>
              <Input
                id="contact-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contact@exemple.fr"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowForm(false)}
                data-ocid="contact.cancel_button"
              >
                Annuler
              </Button>
              <Button
                className="flex-1 font-semibold"
                style={{ backgroundColor: "#ea580c", color: "white" }}
                onClick={handleAdd}
                disabled={
                  addContact.isPending || (!nom.trim() && !societe.trim())
                }
                data-ocid="contact.submit_button"
              >
                {addContact.isPending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  "Enregistrer"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
