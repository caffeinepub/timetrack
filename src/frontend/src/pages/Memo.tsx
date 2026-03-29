import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  Image as ImageIcon,
  Loader2,
  Plus,
  Trash2,
  Video,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ExternalBlob } from "../backend";
import MediaViewer, { type MediaItem } from "../components/MediaViewer";
import { VoiceInput } from "../components/VoiceInput";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useDeleteMemo,
  useGetCallerUserProfile,
  useGetMemos,
} from "../hooks/useQueries";

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

function exportMemoPdf(memo: any) {
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) {
    alert("Popup bloqué. Veuillez autoriser les popups.");
    return;
  }
  const date = new Date(Number(memo.createdAt) / 1_000_000).toLocaleDateString(
    "fr-FR",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  );
  const photosHtml = (memo.photos ?? [])
    .map((p: any) => {
      const url =
        typeof p.getDirectURL === "function"
          ? p.getDirectURL()
          : (p.directURL ?? "");
      return url
        ? `<img src="${url}" style="max-width:100%;margin:6px 0;border-radius:6px;border:1px solid #e5e7eb" />`
        : "";
    })
    .filter(Boolean)
    .join("");
  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
    <title>Mémo — ${memo.authorName}</title>
    <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:13px;color:#1a1a1a;background:#fff;padding:24px}
    .header{background:#0f1e4a;color:#fff;padding:14px 18px;border-radius:8px;margin-bottom:20px;display:flex;align-items:center;gap:14px}
    .header img{width:48px;height:48px}.header-title{font-size:18px;font-weight:800}.header-sub{font-size:11px;color:rgba(255,255,255,0.7)}
    .meta{font-size:12px;color:#555;margin-bottom:16px}.content{font-size:14px;line-height:1.7;white-space:pre-wrap;border-left:4px solid #16a34a;padding-left:12px}
    @media print{body{padding:1cm}}</style>
  </head><body>
    <div class="header">
      <img src="/assets/generated/vache-logo-transparent.dim_300x300.png" alt="Logo" />
      <div><div class="header-title">Vial Traite Service</div><div class="header-sub">Mémo</div></div>
    </div>
    <div class="meta"><strong>${memo.authorName}</strong> — ${date}</div>
    <div class="content">${memo.content || ""}</div>
    ${photosHtml ? `<div style="margin-top:16px">${photosHtml}</div>` : ""}
  </body></html>`;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 500);
}

export default function Memo({ readOnly = false }: { readOnly?: boolean }) {
  const { identity } = useInternetIdentity();
  const isAuthenticated = !!identity;
  const { actor } = useActor();
  const queryClient = useQueryClient();

  const { data: memos = [], isLoading } = useGetMemos();
  const deleteMemo = useDeleteMemo();

  const { data: userProfile } = useGetCallerUserProfile();
  const [authorName, setAuthorName] = useState("");

  useEffect(() => {
    if (userProfile?.name) {
      setAuthorName((prev) => prev || userProfile.name);
    }
  }, [userProfile?.name]);
  const [content, setContent] = useState("");
  const [photos, setPhotos] = useState<ExternalBlob[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [videos, setVideos] = useState<ExternalBlob[]>([]);
  const [videoUrls, setVideoUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [mediaViewer, setMediaViewer] = useState<{
    items: MediaItem[];
    index: number;
  } | null>(null);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

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
      toast.error("Connexion requise. Veuillez vous connecter.");
      return;
    }

    // Check if the method exists on the actor
    const creerMemoFn = (actor as any).creerMemo;
    if (typeof creerMemoFn !== "function") {
      toast.error("Fonction de publication indisponible. Rechargez la page.");
      return;
    }

    setIsPublishing(true);
    try {
      const id = `memo-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      await creerMemoFn.call(
        actor,
        id,
        authorName.trim(),
        content.trim(),
        photos,
        videos,
      );
      await queryClient.invalidateQueries({ queryKey: ["memos"] });
      setContent("");
      setPhotos([]);
      setPhotoUrls([]);
      setVideos([]);
      setVideoUrls([]);
      toast.success("Mémo publié !");
    } catch (e) {
      toast.error(`Erreur : ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setIsPublishing(false);
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

  return (
    <div className="space-y-4">
      {readOnlyBanner}
      <div className="flex items-center justify-between">
        <div>
          <h2
            className="text-xl font-bold"
            style={{
              borderLeft: "4px solid oklch(var(--vts-green))",
              paddingLeft: "0.75rem",
              color: "oklch(var(--navy))",
            }}
          >
            Mémo Public
          </h2>
          <p className="text-xs text-muted-foreground">
            Notes publiques avec photos et vidéos
          </p>
        </div>
        <Badge variant="outline" className="text-xs badge-green">
          {memos.length} note{memos.length !== 1 ? "s" : ""}
        </Badge>
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
              <div className="flex items-start gap-1">
                <Textarea
                  id="memo-content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Écrivez votre note ici..."
                  rows={3}
                  className="text-sm flex-1"
                  data-ocid="memo.content.textarea"
                />
                <VoiceInput
                  value={content}
                  onChange={(val) => setContent(val)}
                  className="mt-1"
                />
              </div>
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
                disabled={isPublishing || isUploading}
                data-ocid="memo.publish.primary_button"
                className="ml-auto text-xs"
              >
                {isPublishing ? (
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
      ) : memos.length === 0 ? (
        <div
          className="text-center py-12 text-muted-foreground"
          data-ocid="memo.empty_state"
        >
          <p className="text-sm">Aucune note publiée pour l'instant.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {memos.map((memo: any, i: number) => {
            const allMedia: MediaItem[] = [
              ...(memo.photos ?? []).map((p: ExternalBlob) => ({
                type: "photo" as const,
                url:
                  typeof p.getDirectURL === "function"
                    ? p.getDirectURL()
                    : (p.directURL ?? ""),
              })),
              ...(memo.videos ?? []).map((v: ExternalBlob) => ({
                type: "video" as const,
                url:
                  typeof v.getDirectURL === "function"
                    ? v.getDirectURL()
                    : (v.directURL ?? ""),
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
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => exportMemoPdf(memo)}
                        data-ocid={`memo.pdf_button.${i + 1}`}
                        className="h-7 w-7 p-0 text-blue-600 hover:bg-blue-50"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </Button>
                      {isAuthenticated && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(memo.id)}
                          disabled={deleteMemo.isPending}
                          data-ocid={`memo.delete_button.${i + 1}`}
                          className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
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
