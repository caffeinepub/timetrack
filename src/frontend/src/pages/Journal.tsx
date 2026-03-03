import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertCircle,
  Edit,
  Image as ImageIcon,
  Mic,
  Plus,
  Save,
  Square,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { DayType, ExternalBlob } from "../backend";
import { DayTypeCheckboxGroup } from "../components/DayTypeCheckboxGroup";
import {
  useDeleteJournalEntry,
  useGetJournalEntries,
  useSaveJournalEntry,
  useUpdateJournalEntry,
} from "../hooks/useQueries";

type MicrophonePermissionState = "checking" | "granted" | "denied" | "error";

export default function Journal() {
  const { data: journalEntries = [], isLoading } = useGetJournalEntries();
  const saveEntry = useSaveJournalEntry();
  const updateEntry = useUpdateJournalEntry();
  const deleteEntry = useDeleteJournalEntry();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    transcription: "",
    notes: "",
    photos: [] as ExternalBlob[],
    dayType: DayType.work,
  });
  const [micPermission, setMicPermission] =
    useState<MicrophonePermissionState>("checking");
  const [uploadProgress, setUploadProgress] = useState<{
    [key: number]: number;
  }>({});
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const requestMicrophonePermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        for (const track of stream.getTracks()) track.stop();
        setMicPermission("granted");
      } catch (error: any) {
        console.error("Microphone permission error:", error);

        if (
          error.name === "NotAllowedError" ||
          error.name === "PermissionDeniedError"
        ) {
          setMicPermission("denied");
        } else if (error.name === "NotFoundError") {
          setMicPermission("error");
        } else {
          setMicPermission("denied");
        }
      }
    };

    requestMicrophonePermission();
  }, []);

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const simulatedTranscription =
          "Transcription automatique non disponible. Veuillez ajouter vos notes manuellement.";

        setFormData({
          ...formData,
          transcription: simulatedTranscription,
        });

        for (const track of stream.getTracks()) track.stop();
      };

      mediaRecorder.start();
      setIsRecording(true);
      setMicPermission("granted");
    } catch (error: any) {
      console.error("Error accessing microphone:", error);

      if (
        error.name === "NotAllowedError" ||
        error.name === "PermissionDeniedError"
      ) {
        setMicPermission("denied");
        toast.error(
          "Accès au microphone refusé. Veuillez autoriser l'accès dans les paramètres de votre navigateur.",
        );
      } else {
        toast.error(
          "Impossible d'accéder au microphone. Veuillez vérifier les permissions.",
        );
      }
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newPhotos: ExternalBlob[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) {
        toast.error(
          `Le fichier "${file.name}" n'est pas une image valide. Formats acceptés : JPG, PNG, GIF.`,
        );
        continue;
      }

      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
        toast.error(
          `Le fichier "${file.name}" est trop volumineux (${sizeMB}MB). Taille maximale : 10MB.`,
        );
        continue;
      }

      try {
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        const photoIndex = formData.photos.length + newPhotos.length;
        const blob = ExternalBlob.fromBytes(uint8Array).withUploadProgress(
          (percentage) => {
            setUploadProgress((prev) => ({
              ...prev,
              [photoIndex]: percentage,
            }));
          },
        );

        newPhotos.push(blob);
      } catch (error) {
        console.error("Error processing file:", error);
        toast.error(`Erreur lors du traitement du fichier "${file.name}".`);
      }
    }

    if (newPhotos.length > 0) {
      setFormData({
        ...formData,
        photos: [...formData.photos, ...newPhotos],
      });
      toast.success(
        `${newPhotos.length} photo${newPhotos.length > 1 ? "s" : ""} ajoutée${newPhotos.length > 1 ? "s" : ""} avec succès.`,
      );
    }

    setIsUploading(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleRemovePhoto = (index: number) => {
    setFormData({
      ...formData,
      photos: formData.photos.filter((_, i) => i !== index),
    });
    setUploadProgress((prev) => {
      const newProgress = { ...prev };
      delete newProgress[index];
      return newProgress;
    });
    toast.success("Photo supprimée.");
  };

  const handleNewEntry = () => {
    setEditingEntry(null);
    setFormData({
      transcription: "",
      notes: "",
      photos: [],
      dayType: DayType.work,
    });
    setUploadProgress({});
    setIsDialogOpen(true);
  };

  const handleEditEntry = (entry: (typeof journalEntries)[0]) => {
    setEditingEntry(entry.id);
    setFormData({
      transcription: entry.transcription,
      notes: entry.notes,
      photos: entry.photos || [],
      dayType: entry.dayType || DayType.work,
    });
    setUploadProgress({});
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const id = editingEntry || `journal-${Date.now()}`;
      const audioUrl = "";

      if (editingEntry) {
        await updateEntry.mutateAsync({
          id: editingEntry,
          audioUrl,
          transcription: formData.transcription,
          notes: formData.notes,
          photos: formData.photos,
          dayType: formData.dayType,
        });
        toast.success("Entrée de journal mise à jour avec succès.");
      } else {
        await saveEntry.mutateAsync({
          id,
          audioUrl,
          transcription: formData.transcription,
          notes: formData.notes,
          photos: formData.photos,
          dayType: formData.dayType,
        });
        toast.success("Entrée de journal enregistrée avec succès.");
      }
      setIsDialogOpen(false);
      setFormData({
        transcription: "",
        notes: "",
        photos: [],
        dayType: DayType.work,
      });
      setUploadProgress({});
    } catch (error) {
      console.error("Error saving journal entry:", error);
      toast.error("Erreur lors de l'enregistrement de l'entrée de journal.");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette entrée ?")) {
      try {
        await deleteEntry.mutateAsync(id);
        toast.success("Entrée de journal supprimée.");
      } catch (error) {
        console.error("Error deleting journal entry:", error);
        toast.error("Erreur lors de la suppression de l'entrée de journal.");
      }
    }
  };

  const getDayTypeLabel = (dayType: DayType | null | undefined): string => {
    if (!dayType) return "Non spécifié";
    switch (dayType) {
      case DayType.work:
        return "Travail";
      case DayType.conge:
        return "Congé";
      case DayType.astreinte:
        return "Astreinte";
      default:
        return "Non spécifié";
    }
  };

  const getDayTypeBadgeVariant = (
    dayType: DayType | null | undefined,
  ): "default" | "secondary" | "outline" => {
    if (!dayType) return "outline";
    switch (dayType) {
      case DayType.work:
        return "default";
      case DayType.conge:
        return "secondary";
      case DayType.astreinte:
        return "outline";
      default:
        return "outline";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement du journal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            Journal de travail
          </h2>
          <p className="text-sm md:text-base text-muted-foreground">
            Enregistrez vos mémos, notes et photos quotidiennes
          </p>
        </div>
        <Button onClick={handleNewEntry} className="gap-2 w-full sm:w-auto">
          <Plus className="w-4 h-4" />
          Nouvelle entrée
        </Button>
      </div>

      {micPermission === "checking" && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Vérification de l'accès au microphone...
          </AlertDescription>
        </Alert>
      )}

      {micPermission === "denied" && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Accès au microphone refusé.</strong> Pour utiliser
            l'enregistrement vocal, veuillez autoriser l'accès au microphone
            dans les paramètres de votre navigateur.
          </AlertDescription>
        </Alert>
      )}

      {micPermission === "error" && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Aucun microphone détecté.</strong> Veuillez connecter un
            microphone pour utiliser l'enregistrement vocal.
          </AlertDescription>
        </Alert>
      )}

      {micPermission === "granted" && (
        <Alert>
          <AlertDescription>
            💡 Astuce : Utilisez l'enregistrement vocal pour capturer rapidement
            vos pensées, ajoutez des notes écrites et des photos pour plus de
            détails.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4">
        {journalEntries.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">
                Aucune entrée dans votre journal
              </p>
              <Button
                onClick={handleNewEntry}
                variant="outline"
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Créer votre première entrée
              </Button>
            </CardContent>
          </Card>
        ) : (
          journalEntries.map((entry) => (
            <Card key={entry.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base sm:text-lg mb-2">
                      {new Date(
                        Number(entry.createdAt) / 1000000,
                      ).toLocaleDateString("fr-FR", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </CardTitle>
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant={getDayTypeBadgeVariant(entry.dayType)}>
                        {getDayTypeLabel(entry.dayType)}
                      </Badge>
                      {entry.transcription && (
                        <Badge variant="secondary">Transcription vocale</Badge>
                      )}
                      {entry.photos && entry.photos.length > 0 && (
                        <Badge variant="secondary">
                          {entry.photos.length} photo
                          {entry.photos.length > 1 ? "s" : ""}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditEntry(entry)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(entry.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {entry.transcription && (
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1 font-medium">
                      Transcription :
                    </p>
                    <p className="text-sm">{entry.transcription}</p>
                  </div>
                )}
                {entry.notes && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1 font-medium">
                      Notes :
                    </p>
                    <p className="text-sm whitespace-pre-wrap">{entry.notes}</p>
                  </div>
                )}
                {entry.photos && entry.photos.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2 font-medium">
                      Photos :
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {entry.photos.map((photo, index) => (
                        <button
                          key={photo.getDirectURL()}
                          type="button"
                          className="relative aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer hover:opacity-90 transition-opacity w-full"
                          onClick={() =>
                            window.open(photo.getDirectURL(), "_blank")
                          }
                        >
                          <img
                            src={photo.getDirectURL()}
                            alt={`Vue ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingEntry ? "Modifier" : "Nouvelle"} entrée de journal
            </DialogTitle>
            <DialogDescription>
              Enregistrez un mémo vocal, ajoutez des notes écrites et des photos
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-3">
              <Label className="text-base font-semibold">Type de journée</Label>
              <DayTypeCheckboxGroup
                value={formData.dayType}
                onChange={(value) =>
                  setFormData({ ...formData, dayType: value })
                }
              />
            </div>

            {micPermission === "denied" && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  L'enregistrement vocal est désactivé. Veuillez autoriser
                  l'accès au microphone dans les paramètres de votre navigateur.
                </AlertDescription>
              </Alert>
            )}

            {micPermission === "error" && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Aucun microphone détecté. Veuillez connecter un microphone
                  pour utiliser l'enregistrement vocal.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex items-center justify-center p-8 bg-muted/50 rounded-lg">
              {!isRecording ? (
                <Button
                  onClick={handleStartRecording}
                  size="lg"
                  className="gap-2"
                  variant="default"
                  disabled={micPermission !== "granted"}
                >
                  <Mic className="w-5 h-5" />
                  {micPermission === "granted"
                    ? "Démarrer l'enregistrement"
                    : micPermission === "checking"
                      ? "Vérification..."
                      : "Enregistrement indisponible"}
                </Button>
              ) : (
                <Button
                  onClick={handleStopRecording}
                  size="lg"
                  className="gap-2"
                  variant="destructive"
                >
                  <Square className="w-5 h-5" />
                  Arrêter l'enregistrement
                </Button>
              )}
            </div>

            {formData.transcription && (
              <div className="space-y-2">
                <Label
                  htmlFor="transcription-input"
                  className="text-sm font-medium"
                >
                  Transcription
                </Label>
                <Textarea
                  id="transcription-input"
                  value={formData.transcription}
                  onChange={(e) =>
                    setFormData({ ...formData, transcription: e.target.value })
                  }
                  rows={4}
                  className="bg-muted/50"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes-input" className="text-sm font-medium">
                Notes écrites
              </Label>
              <Textarea
                id="notes-input"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Ajoutez vos notes ici..."
                rows={6}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Photos</Label>

              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFileSelect(e.target.files)}
                />
                <ImageIcon className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-2">
                  Glissez-déposez vos photos ici ou
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2"
                  disabled={isUploading}
                >
                  <Upload className="w-4 h-4" />
                  {isUploading ? "Chargement..." : "Sélectionner des fichiers"}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Formats acceptés : JPG, PNG, GIF (max 10MB par fichier)
                </p>
              </div>

              {formData.photos.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
                  {formData.photos.map((photo, index) => (
                    <div
                      key={photo.getDirectURL()}
                      className="relative aspect-square rounded-lg overflow-hidden bg-muted group"
                    >
                      <img
                        src={photo.getDirectURL()}
                        alt={`Vue ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {uploadProgress[index] !== undefined &&
                        uploadProgress[index] < 100 && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <div className="text-white text-sm font-medium">
                              {uploadProgress[index]}%
                            </div>
                          </div>
                        )}
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7"
                        onClick={() => handleRemovePhoto(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                saveEntry.isPending ||
                updateEntry.isPending ||
                (!formData.transcription &&
                  !formData.notes &&
                  formData.photos.length === 0)
              }
              className="gap-2"
            >
              <Save className="w-4 h-4" />
              {saveEntry.isPending || updateEntry.isPending
                ? "Enregistrement..."
                : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
