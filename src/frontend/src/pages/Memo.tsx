import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useQuery } from "@tanstack/react-query";
import {
  Image as ImageIcon,
  Loader2,
  Plus,
  Trash2,
  User,
  Video,
  X,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ExternalBlob } from "../backend";
import MediaViewer, { type MediaItem } from "../components/MediaViewer";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useCreateMemo, useDeleteMemo, useGetMemos } from "../hooks/useQueries";

function formatDateFr(ts: bigint): string {
  const date = new Date(Number(ts) / 1_000_000);
  return date
    .toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
    .replace(" à ", " à ");
}

export default function Memo() {
  const { identity } = useInternetIdentity();
  const isAuthenticated = !!identity;
  const { actor, isFetching } = useActor();

  const { data: memos = [], isLoading } = useGetMemos();
  const createMemo = useCreateMemo();
  const deleteMemo = useDeleteMemo();

  const [selectedProfilePrincipal, setSelectedProfilePrincipal] = useState<
    string | null
  >(isAuthenticated && identity ? identity.getPrincipal().toString() : null);
  const [authorName, setAuthorName] = useState("");
  const [content, setContent] = useState("");
  const [photos, setPhotos] = useState<ExternalBlob[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [videos, setVideos] = useState<ExternalBlob[]>([]);
  const [videoUrls, setVideoUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [mediaViewer, setMediaViewer] = useState<{
    items: MediaItem[];
    index: number;
  } | null>(null);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const { data: allProfiles = [], isLoading: profilesLoading } = useQuery<
    Array<[any, { name: string; email: string }]>
  >({
    queryKey: ["allProfiles"],
    queryFn: async () => {
      if (!actor) return [];
      return (actor as any).obtenirTousLesProfils();
    },
    enabled: !!actor && !isFetching,
  });

  const filteredMemos = useMemo(() => {
    if (!selectedProfilePrincipal) return memos;
    return memos.filter((memo: any) => {
      const createdBy = memo.createdBy?.toString?.() ?? String(memo.createdBy);
      return createdBy === selectedProfilePrincipal;
    });
  }, [memos, selectedProfilePrincipal]);

  const handlePhotoSelect = async (files: FileList | null) => {
    if (!files) return;
    setIsUploading(true);
    const newBlobs: ExternalBlob[] = [];
    const newUrls: string[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) {
        toast.error(`"${file.name}" n'est pas une image valide.`);
        continue;
      }
      try {
        const arrayBuffer = await file.arrayBuffer();
        const blob = ExternalBlob.fromBytes(new Uint8Array(arrayBuffer));
        newBlobs.push(blob);
        newUrls.push(URL.createObjectURL(file));
      } catch {
        toast.error(`Erreur lors du traitement de "${file.name}".`);
      }
    }
    setPhotos((p) => [...p, ...newBlobs]);
    setPhotoUrls((u) => [...u, ...newUrls]);
    setIsUploading(false);
  };

  const handleVideoSelect = async (files: FileList | null) => {
    if (!files) return;
    setIsUploading(true);
    const newBlobs: ExternalBlob[] = [];
    const newUrls: string[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("video/")) {
        toast.error(`"${file.name}" n'est pas une vidéo valide.`);
        continue;
      }
      try {
        const arrayBuffer = await file.arrayBuffer();
        const blob = ExternalBlob.fromBytes(new Uint8Array(arrayBuffer));
        newBlobs.push(blob);
        newUrls.push(URL.createObjectURL(file));
      } catch {
        toast.error(`Erreur lors du traitement de "${file.name}".`);
      }
    }
    setVideos((v) => [...v, ...newBlobs]);
    setVideoUrls((u) => [...u, ...newUrls]);
    setIsUploading(false);
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error("Le contenu de la note est requis.");
      return;
    }
    if (!authorName.trim()) {
      toast.error("Veuillez saisir votre nom.");
      return;
    }
    if (!actor) {
      toast.error("Connexion requise.");
      return;
    }
    try {
      await createMemo.mutateAsync({
        id: `memo-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        authorName: authorName.trim(),
        content: content.trim(),
        photos,
        videos,
      });
      setContent("");
      setPhotos([]);
      setPhotoUrls([]);
      setVideos([]);
      setVideoUrls([]);
      toast.success("Mémo publié !");
    } catch (e) {
      toast.error(`Erreur : ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMemo.mutateAsync(id);
      toast.success("Mémo supprimé.");
    } catch (e) {
      toast.error(`Erreur : ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const openPhotoViewer = (items: MediaItem[], index: number) => {
    setMediaViewer({ items, index });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Mémo Public</h2>
          <p className="text-xs text-muted-foreground">
            Notes publiques avec photos et vidéos
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          {filteredMemos.length} note{filteredMemos.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      {/* Profile selector */}
      <div className="flex items-center gap-2 p-3 bg-card rounded-xl border border-border">
        <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <label
          htmlFor="memo-profile-select"
          className="text-xs text-muted-foreground whitespace-nowrap"
        >
          Profil :
        </label>
        <select
          id="memo-profile-select"
          value={selectedProfilePrincipal ?? ""}
          onChange={(e) => setSelectedProfilePrincipal(e.target.value || null)}
          className="flex-1 text-xs bg-background border border-input rounded px-2 py-1"
          data-ocid="memo.profile.select"
        >
          <option value="">Tous les profils</option>
          {profilesLoading && (
            <option value="" disabled>
              Chargement...
            </option>
          )}
          {allProfiles.map(([principal, profile]: [any, any]) => (
            <option key={principal.toString()} value={principal.toString()}>
              {profile.name || `${principal.toString().slice(0, 12)}...`}
            </option>
          ))}
        </select>
      </div>

      {/* Add memo form (authenticated only) */}
      {isAuthenticated && (
        <Card className="border-primary/20">
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Plus className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-primary">
                Nouvelle note
              </span>
            </div>
            <div>
              <Label htmlFor="memo-author" className="text-xs mb-1 block">
                Votre nom *
              </Label>
              <Input
                id="memo-author"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="Ex: Jean Dupont"
                className="text-sm"
                data-ocid="memo.author.input"
              />
            </div>
            <div>
              <Label htmlFor="memo-content" className="text-xs mb-1 block">
                Note *
              </Label>
              <Textarea
                id="memo-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Écrivez votre note ici..."
                rows={3}
                className="text-sm"
                data-ocid="memo.content.textarea"
              />
            </div>

            {/* Preview photos */}
            {photoUrls.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {photoUrls.map((url, i) => (
                  <div
                    key={`photo-prev-${i}-${url}`}
                    className="relative w-16 h-16 rounded overflow-hidden border border-border"
                  >
                    <img
                      src={url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setPhotos((p) => p.filter((_, idx) => idx !== i));
                        setPhotoUrls((u) => u.filter((_, idx) => idx !== i));
                      }}
                      className="absolute top-0 right-0 p-0.5 bg-black/60 text-white rounded-bl"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Preview videos */}
            {videoUrls.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {videoUrls.map((url, i) => (
                  <div
                    key={`video-prev-${i}-${url}`}
                    className="relative w-24 h-16 rounded overflow-hidden border border-border bg-muted flex items-center justify-center"
                  >
                    <video src={url} className="w-full h-full object-cover">
                      <track kind="captions" />
                    </video>
                    <button
                      type="button"
                      onClick={() => {
                        setVideos((v) => v.filter((_, idx) => idx !== i));
                        setVideoUrls((u) => u.filter((_, idx) => idx !== i));
                      }}
                      className="absolute top-0 right-0 p-0.5 bg-black/60 text-white rounded-bl"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2 flex-wrap">
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handlePhotoSelect(e.target.files)}
              />
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                multiple
                className="hidden"
                onChange={(e) => handleVideoSelect(e.target.files)}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => photoInputRef.current?.click()}
                disabled={isUploading}
                data-ocid="memo.photo.upload_button"
                className="text-xs"
              >
                <ImageIcon className="w-3 h-3 mr-1" />
                Photo
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => videoInputRef.current?.click()}
                disabled={isUploading}
                data-ocid="memo.video.upload_button"
                className="text-xs"
              >
                <Video className="w-3 h-3 mr-1" />
                Vidéo
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSubmit}
                disabled={createMemo.isPending || isUploading}
                data-ocid="memo.publish.primary_button"
                className="ml-auto text-xs"
              >
                {createMemo.isPending ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />{" "}
                    Publication...
                  </>
                ) : (
                  "Publier"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Feed */}
      {isLoading ? (
        <div
          className="flex items-center justify-center py-12"
          data-ocid="memo.loading_state"
        >
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredMemos.length === 0 ? (
        <div
          className="text-center py-12 text-muted-foreground"
          data-ocid="memo.empty_state"
        >
          <p className="text-sm">Aucune note publiée pour l'instant.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredMemos.map((memo: any, i: number) => {
            const allMedia: MediaItem[] = [
              ...(memo.photos ?? []).map((p: ExternalBlob) => ({
                type: "photo" as const,
                url: p.getDirectURL(),
              })),
              ...(memo.videos ?? []).map((v: ExternalBlob) => ({
                type: "video" as const,
                url: v.getDirectURL(),
              })),
            ];
            return (
              <Card key={memo.id} data-ocid={`memo.item.${i + 1}`}>
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant="secondary"
                        className="text-xs font-semibold"
                      >
                        {memo.authorName}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDateFr(memo.createdAt)}
                      </span>
                    </div>
                    {isAuthenticated && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(memo.id)}
                        disabled={deleteMemo.isPending}
                        data-ocid={`memo.delete_button.${i + 1}`}
                        className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 flex-shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap mb-3">
                    {memo.content}
                  </p>

                  {/* Media thumbnails */}
                  {allMedia.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {allMedia.map((m, mi) => (
                        <button
                          key={`${m.url}-${mi}`}
                          type="button"
                          onClick={() => openPhotoViewer(allMedia, mi)}
                          className="relative w-20 h-20 rounded overflow-hidden border border-border hover:opacity-80 transition-opacity"
                          data-ocid={`memo.media.${i + 1}`}
                        >
                          {m.type === "photo" ? (
                            <img
                              src={m.url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                              <Video className="w-6 h-6 text-white" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Media Lightbox */}
      {mediaViewer && (
        <MediaViewer
          media={mediaViewer.items}
          initialIndex={mediaViewer.index}
          onClose={() => setMediaViewer(null)}
        />
      )}
    </div>
  );
}
