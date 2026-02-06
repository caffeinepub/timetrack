import { useState, useMemo, useRef, useEffect } from 'react';
import { useGetTimeEntries, useSaveTimeEntry, useUpdateTimeEntry, useDeleteTimeEntry, useSaveDailyMedia, useDeleteDailyMedia, useGetDailyMedia } from '../hooks/useQueries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Trash2, Upload, X, Image as ImageIcon, Mic, Square, Play, Pause, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { DayType, type TimeEntryInput, ExternalBlob } from '../backend';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { DayTypeCheckboxGroup } from '../components/DayTypeCheckboxGroup';

const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

const DAYS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

function isWeekday(date: Date): boolean {
  const day = date.getDay();
  return day >= 1 && day <= 5;
}

export default function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [isDragging, setIsDragging] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioPlayingIndex, setAudioPlayingIndex] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { data: timeEntries = [], isLoading } = useGetTimeEntries();
  const { data: dailyMediaEntries = [] } = useGetDailyMedia(selectedDate);
  const saveEntry = useSaveTimeEntry();
  const updateEntry = useUpdateTimeEntry();
  const deleteEntry = useDeleteTimeEntry();
  const saveDailyMedia = useSaveDailyMedia();
  const deleteDailyMedia = useDeleteDailyMedia();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});

  const [formData, setFormData] = useState({
    typeOfDay: DayType.work,
    startMorning: '08:00',
    endMorning: '12:00',
    startAfternoon: '13:00',
    endAfternoon: '17:00',
    startAstreinte: '00:00',
    endAstreinte: '00:00',
    heuresRepas: '',
    heuresTrajet: '',
    description: '',
  });

  // Extract photos and audio from dailyMediaEntries
  const dailyPhotos = useMemo(() => {
    return dailyMediaEntries
      .filter(entry => entry.mediaType.__kind__ === 'photo')
      .map(entry => ({
        id: entry.id,
        blob: entry.mediaType.__kind__ === 'photo' ? entry.mediaType.photo : null,
      }))
      .filter(item => item.blob !== null) as { id: string; blob: ExternalBlob }[];
  }, [dailyMediaEntries]);

  const dailyAudio = useMemo(() => {
    return dailyMediaEntries
      .filter(entry => entry.mediaType.__kind__ === 'audio')
      .map(entry => ({
        id: entry.id,
        blob: entry.mediaType.__kind__ === 'audio' ? entry.mediaType.audio : null,
      }))
      .filter(item => item.blob !== null) as { id: string; blob: ExternalBlob }[];
  }, [dailyMediaEntries]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];
    
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(currentYear, currentMonth, i));
    }

    return days;
  }, [currentMonth, currentYear]);

  const entriesByDate = useMemo(() => {
    const map = new Map<string, typeof timeEntries[0]>();
    timeEntries.forEach((entry) => {
      const date = new Date(Number(entry.date) / 1000000);
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      map.set(key, entry);
    });
    return map;
  }, [timeEntries]);

  const getEntryForDate = (date: Date) => {
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    return entriesByDate.get(key);
  };

  // Helper function to shift months with proper year handling
  const shiftMonth = (delta: number) => {
    setCurrentMonth((prevMonth) => {
      setCurrentYear((prevYear) => {
        const newMonth = prevMonth + delta;
        if (newMonth > 11) {
          return prevYear + Math.floor(newMonth / 12);
        } else if (newMonth < 0) {
          return prevYear + Math.floor(newMonth / 12);
        }
        return prevYear;
      });
      
      const newMonth = prevMonth + delta;
      if (newMonth > 11) {
        return newMonth % 12;
      } else if (newMonth < 0) {
        return ((newMonth % 12) + 12) % 12;
      }
      return newMonth;
    });
  };

  const handlePrevMonth = () => shiftMonth(-1);
  const handleNextMonth = () => shiftMonth(1);
  const handlePrevYear = () => shiftMonth(-12);
  const handleNextYear = () => shiftMonth(12);

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setValidationError('');
    const existingEntry = getEntryForDate(date);
    
    if (existingEntry) {
      setEditingEntry(existingEntry.id);
      const startMorningHour = Math.floor(Number(existingEntry.startMorning) / 60);
      const startMorningMin = Number(existingEntry.startMorning) % 60;
      const endMorningHour = Math.floor(Number(existingEntry.endMorning) / 60);
      const endMorningMin = Number(existingEntry.endMorning) % 60;
      const startAfternoonHour = Math.floor(Number(existingEntry.startAfternoon) / 60);
      const startAfternoonMin = Number(existingEntry.startAfternoon) % 60;
      const endAfternoonHour = Math.floor(Number(existingEntry.endAfternoon) / 60);
      const endAfternoonMin = Number(existingEntry.endAfternoon) % 60;
      
      let startAstreinteStr = '00:00';
      let endAstreinteStr = '00:00';
      if (existingEntry.startAstreinte !== undefined && existingEntry.endAstreinte !== undefined) {
        const startAstreinteHour = Math.floor(Number(existingEntry.startAstreinte) / 60);
        const startAstreinteMin = Number(existingEntry.startAstreinte) % 60;
        const endAstreinteHour = Math.floor(Number(existingEntry.endAstreinte) / 60);
        const endAstreinteMin = Number(existingEntry.endAstreinte) % 60;
        startAstreinteStr = `${String(startAstreinteHour).padStart(2, '0')}:${String(startAstreinteMin).padStart(2, '0')}`;
        endAstreinteStr = `${String(endAstreinteHour).padStart(2, '0')}:${String(endAstreinteMin).padStart(2, '0')}`;
      }
      
      setFormData({
        typeOfDay: existingEntry.typeOfDay,
        startMorning: `${String(startMorningHour).padStart(2, '0')}:${String(startMorningMin).padStart(2, '0')}`,
        endMorning: `${String(endMorningHour).padStart(2, '0')}:${String(endMorningMin).padStart(2, '0')}`,
        startAfternoon: `${String(startAfternoonHour).padStart(2, '0')}:${String(startAfternoonMin).padStart(2, '0')}`,
        endAfternoon: `${String(endAfternoonHour).padStart(2, '0')}:${String(endAfternoonMin).padStart(2, '0')}`,
        startAstreinte: startAstreinteStr,
        endAstreinte: endAstreinteStr,
        heuresRepas: String(Number(existingEntry.heuresRepas) / 60),
        heuresTrajet: String(Number(existingEntry.heuresTrajet) / 60),
        description: existingEntry.description,
      });
    } else {
      setEditingEntry(null);
      setFormData({
        typeOfDay: DayType.work,
        startMorning: '08:00',
        endMorning: '12:00',
        startAfternoon: '13:00',
        endAfternoon: '17:00',
        startAstreinte: '00:00',
        endAstreinte: '00:00',
        heuresRepas: '1',
        heuresTrajet: '0',
        description: '',
      });
    }
    
    setIsDialogOpen(true);
  };

  const validateTimeOrder = (): boolean => {
    const [startMorningHour, startMorningMin] = formData.startMorning.split(':').map(Number);
    const [endMorningHour, endMorningMin] = formData.endMorning.split(':').map(Number);
    const [startAfternoonHour, startAfternoonMin] = formData.startAfternoon.split(':').map(Number);
    const [endAfternoonHour, endAfternoonMin] = formData.endAfternoon.split(':').map(Number);

    const startMorningMinutes = startMorningHour * 60 + startMorningMin;
    const endMorningMinutes = endMorningHour * 60 + endMorningMin;
    const startAfternoonMinutes = startAfternoonHour * 60 + startAfternoonMin;
    const endAfternoonMinutes = endAfternoonHour * 60 + endAfternoonMin;

    if (startMorningMinutes >= endMorningMinutes) {
      setValidationError('L\'heure de fin du matin doit être après l\'heure de début du matin');
      return false;
    }

    if (endMorningMinutes >= startAfternoonMinutes) {
      setValidationError('L\'heure de début de l\'après-midi doit être après l\'heure de fin du matin');
      return false;
    }

    if (startAfternoonMinutes >= endAfternoonMinutes) {
      setValidationError('L\'heure de fin de l\'après-midi doit être après l\'heure de début de l\'après-midi');
      return false;
    }

    if (formData.typeOfDay === DayType.astreinte) {
      const [startAstreinteHour, startAstreinteMin] = formData.startAstreinte.split(':').map(Number);
      const [endAstreinteHour, endAstreinteMin] = formData.endAstreinte.split(':').map(Number);
      const startAstreinteMinutes = startAstreinteHour * 60 + startAstreinteMin;
      const endAstreinteMinutes = endAstreinteHour * 60 + endAstreinteMin;

      if (startAstreinteMinutes >= endAstreinteMinutes) {
        setValidationError('L\'heure de fin d\'astreinte doit être après l\'heure de début d\'astreinte');
        return false;
      }
    }

    setValidationError('');
    return true;
  };

  const handleSave = async () => {
    if (!selectedDate) return;

    if (!validateTimeOrder()) {
      return;
    }

    const [startMorningHour, startMorningMin] = formData.startMorning.split(':').map(Number);
    const [endMorningHour, endMorningMin] = formData.endMorning.split(':').map(Number);
    const [startAfternoonHour, startAfternoonMin] = formData.startAfternoon.split(':').map(Number);
    const [endAfternoonHour, endAfternoonMin] = formData.endAfternoon.split(':').map(Number);

    const heuresRepas = parseFloat(formData.heuresRepas || '0') * 60;
    const heuresTrajet = parseFloat(formData.heuresTrajet || '0') * 60;

    const input: TimeEntryInput = {
      id: editingEntry || `entry-${Date.now()}`,
      date: BigInt(selectedDate.getTime() * 1000000),
      startMorning: BigInt(startMorningHour * 60 + startMorningMin),
      endMorning: BigInt(endMorningHour * 60 + endMorningMin),
      startAfternoon: BigInt(startAfternoonHour * 60 + startAfternoonMin),
      endAfternoon: BigInt(endAfternoonHour * 60 + endAfternoonMin),
      typeOfDay: formData.typeOfDay,
      heuresRepas: BigInt(Math.round(heuresRepas)),
      heuresTrajet: BigInt(Math.round(heuresTrajet)),
      description: formData.description,
    };

    if (formData.typeOfDay === DayType.astreinte) {
      const [startAstreinteHour, startAstreinteMin] = formData.startAstreinte.split(':').map(Number);
      const [endAstreinteHour, endAstreinteMin] = formData.endAstreinte.split(':').map(Number);
      input.startAstreinte = BigInt(startAstreinteHour * 60 + startAstreinteMin);
      input.endAstreinte = BigInt(endAstreinteHour * 60 + endAstreinteMin);
    }

    try {
      if (editingEntry) {
        await updateEntry.mutateAsync({ id: editingEntry, input });
        toast.success('Journée mise à jour avec succès.');
      } else {
        await saveEntry.mutateAsync(input);
        toast.success('Journée enregistrée avec succès.');
      }
      setIsDialogOpen(false);
      setValidationError('');
    } catch (error) {
      console.error('Error saving entry:', error);
      toast.error('Erreur lors de l\'enregistrement de la journée.');
    }
  };

  const handleDelete = async () => {
    if (!editingEntry) return;

    try {
      await deleteEntry.mutateAsync(editingEntry);
      toast.success('Journée supprimée.');
      setIsDialogOpen(false);
      setValidationError('');
    } catch (error) {
      console.error('Error deleting entry:', error);
      toast.error('Erreur lors de la suppression de la journée.');
    }
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0 || !selectedDate) return;

    setIsUploading(true);
    let successCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (!file.type.startsWith('image/')) {
        toast.error(`Le fichier "${file.name}" n'est pas une image valide. Formats acceptés : JPG, PNG, GIF.`);
        continue;
      }

      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
        toast.error(`Le fichier "${file.name}" est trop volumineux (${sizeMB}MB). Taille maximale : 10MB.`);
        continue;
      }

      const mediaId = `photo-${Date.now()}-${i}`;

      try {
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        const blob = ExternalBlob.fromBytes(uint8Array).withUploadProgress((percentage) => {
          setUploadProgress((prev) => ({ ...prev, [mediaId]: percentage }));
        });
        
        await saveDailyMedia.mutateAsync({
          id: mediaId,
          mediaType: { __kind__: 'photo', photo: blob },
          relatedDay: selectedDate,
        });

        successCount++;

        setUploadProgress((prev) => {
          const newProgress = { ...prev };
          delete newProgress[mediaId];
          return newProgress;
        });
      } catch (error) {
        console.error('Error uploading photo:', error);
        toast.error(`Erreur lors du téléchargement du fichier "${file.name}".`);
        setUploadProgress((prev) => {
          const newProgress = { ...prev };
          delete newProgress[mediaId];
          return newProgress;
        });
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} photo${successCount > 1 ? 's' : ''} téléchargée${successCount > 1 ? 's' : ''} avec succès.`);
    }

    setIsUploading(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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

  const handleRemovePhoto = async (id: string) => {
    if (!selectedDate) return;
    
    try {
      await deleteDailyMedia.mutateAsync({
        id,
        relatedDay: selectedDate,
      });
      toast.success('Photo supprimée.');
    } catch (error) {
      console.error('Error deleting photo:', error);
      toast.error('Erreur lors de la suppression de la photo.');
    }
  };

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
        if (!selectedDate) return;
        
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const arrayBuffer = await audioBlob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        try {
          const blob = ExternalBlob.fromBytes(uint8Array);
          await saveDailyMedia.mutateAsync({
            id: `audio-${Date.now()}`,
            mediaType: { __kind__: 'audio', audio: blob },
            relatedDay: selectedDate,
          });
          toast.success('Enregistrement audio sauvegardé.');
        } catch (error) {
          console.error('Error saving audio:', error);
          toast.error('Erreur lors de l\'enregistrement audio.');
        }

        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast.error('Impossible d\'accéder au microphone. Veuillez vérifier les permissions.');
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handlePlayAudio = async (id: string, audioBlob: ExternalBlob) => {
    if (audioPlayingIndex === id) {
      audioRefs.current[id]?.pause();
      setAudioPlayingIndex(null);
      return;
    }

    Object.values(audioRefs.current).forEach(audio => audio?.pause());

    try {
      const bytes = await audioBlob.getBytes();
      const blob = new Blob([bytes], { type: 'audio/webm' });
      const url = URL.createObjectURL(blob);
      
      const audio = new Audio(url);
      audioRefs.current[id] = audio;
      
      audio.onended = () => {
        setAudioPlayingIndex(null);
        URL.revokeObjectURL(url);
      };
      
      await audio.play();
      setAudioPlayingIndex(id);
    } catch (error) {
      console.error('Error playing audio:', error);
      toast.error('Erreur lors de la lecture audio.');
    }
  };

  const handleRemoveAudio = async (id: string) => {
    if (!selectedDate) return;
    
    try {
      await deleteDailyMedia.mutateAsync({
        id,
        relatedDay: selectedDate,
      });
      toast.success('Enregistrement audio supprimé.');
    } catch (error) {
      console.error('Error deleting audio:', error);
      toast.error('Erreur lors de la suppression de l\'audio.');
    }
  };

  const getDayTypeColor = (entry: typeof timeEntries[0], date: Date) => {
    const type = entry.typeOfDay;
    const isWeekdayDate = isWeekday(date);
    
    if (type === DayType.astreinte && isWeekdayDate) {
      return 'bg-gradient-to-br from-green-100 via-yellow-100 to-orange-100 dark:from-green-900 dark:via-yellow-900 dark:to-orange-900 border-orange-300 dark:border-orange-700';
    }
    
    switch (type) {
      case DayType.work:
        return 'bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-700';
      case DayType.conge:
        return 'bg-purple-100 dark:bg-purple-900 border-purple-300 dark:border-purple-700';
      case DayType.astreinte:
        return 'bg-orange-100 dark:bg-orange-900 border-orange-300 dark:border-orange-700';
      default:
        return '';
    }
  };

  const calculateAstreinteHours = () => {
    if (formData.typeOfDay !== DayType.astreinte) return 0;
    const [startHour, startMin] = formData.startAstreinte.split(':').map(Number);
    const [endHour, endMin] = formData.endAstreinte.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    return endMinutes > startMinutes ? (endMinutes - startMinutes) / 60 : 0;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement du calendrier...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Calendrier</h2>
        <p className="text-sm md:text-base text-muted-foreground">Gérez vos journées de travail, congés, astreintes et médias quotidiens</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={handlePrevYear}
                aria-label="Année précédente"
                title="Année précédente"
                className="h-10 w-10"
              >
                <ChevronsLeft className="w-4 h-4" />
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={handlePrevMonth}
                aria-label="Mois précédent"
                title="Mois précédent"
                className="h-10 w-10"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-4">
              <Select
                value={currentMonth.toString()}
                onValueChange={(value) => setCurrentMonth(parseInt(value))}
              >
                <SelectTrigger className="w-[120px] sm:w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((month, index) => (
                    <SelectItem key={index} value={index.toString()}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select
                value={currentYear.toString()}
                onValueChange={(value) => setCurrentYear(parseInt(value))}
              >
                <SelectTrigger className="w-[90px] sm:w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={handleNextMonth}
                aria-label="Mois suivant"
                title="Mois suivant"
                className="h-10 w-10"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={handleNextYear}
                aria-label="Année suivante"
                title="Année suivante"
                className="h-10 w-10"
              >
                <ChevronsRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {DAYS.map((day) => (
              <div key={day} className="text-center font-semibold text-xs sm:text-sm text-muted-foreground py-2">
                {day}
              </div>
            ))}
            {calendarDays.map((date, index) => {
              if (!date) {
                return <div key={`empty-${index}`} className="aspect-square" />;
              }

              const entry = getEntryForDate(date);
              const isToday =
                date.getDate() === new Date().getDate() &&
                date.getMonth() === new Date().getMonth() &&
                date.getFullYear() === new Date().getFullYear();
              const isWeekdayDate = isWeekday(date);

              const astreinteHours = entry && entry.startAstreinte !== undefined && entry.endAstreinte !== undefined
                ? (Number(entry.endAstreinte) - Number(entry.startAstreinte)) / 60
                : 0;

              return (
                <button
                  key={index}
                  onClick={() => handleDayClick(date)}
                  className={`
                    aspect-square p-1 sm:p-2 rounded-lg border-2 transition-all hover:shadow-md active:scale-95
                    ${isToday ? 'border-primary' : 'border-border'}
                    ${entry ? getDayTypeColor(entry, date) : 'bg-card hover:bg-accent'}
                  `}
                >
                  <div className="text-xs sm:text-sm font-medium">{date.getDate()}</div>
                  {entry && (
                    <div className="mt-0.5 sm:mt-1 text-[0.6rem] sm:text-xs space-y-0.5">
                      {entry.typeOfDay === DayType.work && (
                        <div className="text-green-700 dark:text-green-300 font-medium">
                          {Math.round(((Number(entry.endMorning) - Number(entry.startMorning)) + (Number(entry.endAfternoon) - Number(entry.startAfternoon))) / 60 * 10) / 10}h
                        </div>
                      )}
                      {entry.typeOfDay === DayType.conge && (
                        <div className="text-purple-700 dark:text-purple-300 font-medium text-[0.55rem] sm:text-xs">Congé</div>
                      )}
                      {entry.typeOfDay === DayType.astreinte && (
                        <>
                          {isWeekdayDate && (
                            <div className="flex items-center justify-center gap-0.5 mb-0.5">
                              <Badge variant="outline" className="text-[0.5rem] sm:text-[0.6rem] px-0.5 sm:px-1 py-0 h-3 sm:h-4 bg-green-50 dark:bg-green-950 border-green-400">
                                T
                              </Badge>
                              <Badge variant="outline" className="text-[0.5rem] sm:text-[0.6rem] px-0.5 sm:px-1 py-0 h-3 sm:h-4 bg-orange-50 dark:bg-orange-950 border-orange-400">
                                A
                              </Badge>
                            </div>
                          )}
                          {((Number(entry.endMorning) - Number(entry.startMorning)) + (Number(entry.endAfternoon) - Number(entry.startAfternoon))) > 0 && (
                            <div className="text-green-700 dark:text-green-300 font-medium">
                              N: {Math.round(((Number(entry.endMorning) - Number(entry.startMorning)) + (Number(entry.endAfternoon) - Number(entry.startAfternoon))) / 60 * 10) / 10}h
                            </div>
                          )}
                          {astreinteHours > 0 && (
                            <div className="text-orange-700 dark:text-orange-300 font-medium">
                              A: {Math.round(astreinteHours * 10) / 10}h
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingEntry ? 'Modifier' : 'Ajouter'} une journée
            </DialogTitle>
            <DialogDescription>
              {selectedDate && (
                <>
                  {selectedDate.toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                  {selectedDate && isWeekday(selectedDate) && (
                    <span className="block mt-1 text-xs text-muted-foreground">
                      (Jour de semaine - les astreintes comptent aussi comme jours de travail)
                    </span>
                  )}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="time" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="time">Horaires</TabsTrigger>
              <TabsTrigger value="media">Médias</TabsTrigger>
            </TabsList>
            
            <TabsContent value="time" className="space-y-4 mt-4">
              {validationError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{validationError}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label>Type de journée</Label>
                <DayTypeCheckboxGroup
                  value={formData.typeOfDay}
                  onChange={(value) => setFormData({ ...formData, typeOfDay: value })}
                />
              </div>

              {formData.typeOfDay === DayType.work && (
                <>
                  <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                    <Label className="text-base font-semibold">Période du matin</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm">Début matin</Label>
                        <Input
                          type="time"
                          value={formData.startMorning}
                          onChange={(e) => setFormData({ ...formData, startMorning: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Fin matin</Label>
                        <Input
                          type="time"
                          value={formData.endMorning}
                          onChange={(e) => setFormData({ ...formData, endMorning: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                    <Label className="text-base font-semibold">Période de l'après-midi</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm">Début après-midi</Label>
                        <Input
                          type="time"
                          value={formData.startAfternoon}
                          onChange={(e) => setFormData({ ...formData, startAfternoon: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Fin après-midi</Label>
                        <Input
                          type="time"
                          value={formData.endAfternoon}
                          onChange={(e) => setFormData({ ...formData, endAfternoon: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Heures de repas</Label>
                    <Input
                      type="number"
                      step="0.25"
                      min="0"
                      value={formData.heuresRepas}
                      onChange={(e) => setFormData({ ...formData, heuresRepas: e.target.value })}
                      placeholder="1"
                    />
                    <p className="text-xs text-muted-foreground">Exclues du total de travail</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Heures de trajet</Label>
                    <Input
                      type="number"
                      step="0.25"
                      min="0"
                      value={formData.heuresTrajet}
                      onChange={(e) => setFormData({ ...formData, heuresTrajet: e.target.value })}
                      placeholder="0"
                    />
                    <p className="text-xs text-muted-foreground">Affichées séparément</p>
                  </div>
                </>
              )}

              {formData.typeOfDay === DayType.astreinte && (
                <>
                  {selectedDate && isWeekday(selectedDate) && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <p className="text-xs text-blue-900 dark:text-blue-100">
                        <strong>Info :</strong> Ce jour d'astreinte tombant en semaine sera compté à la fois comme jour de travail et jour d'astreinte dans les statistiques.
                      </p>
                    </div>
                  )}

                  <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                    <Label className="text-base font-semibold">Période du matin</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm">Début matin</Label>
                        <Input
                          type="time"
                          value={formData.startMorning}
                          onChange={(e) => setFormData({ ...formData, startMorning: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Fin matin</Label>
                        <Input
                          type="time"
                          value={formData.endMorning}
                          onChange={(e) => setFormData({ ...formData, endMorning: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                    <Label className="text-base font-semibold">Période de l'après-midi</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm">Début après-midi</Label>
                        <Input
                          type="time"
                          value={formData.startAfternoon}
                          onChange={(e) => setFormData({ ...formData, startAfternoon: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Fin après-midi</Label>
                        <Input
                          type="time"
                          value={formData.endAfternoon}
                          onChange={(e) => setFormData({ ...formData, endAfternoon: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <Label className="text-base font-semibold">Heures d'astreinte travaillées</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm">Début astreinte</Label>
                        <Input
                          type="time"
                          value={formData.startAstreinte}
                          onChange={(e) => setFormData({ ...formData, startAstreinte: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Fin astreinte</Label>
                        <Input
                          type="time"
                          value={formData.endAstreinte}
                          onChange={(e) => setFormData({ ...formData, endAstreinte: e.target.value })}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      Heures d'astreinte calculées : <strong>{calculateAstreinteHours().toFixed(2)}h</strong>
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Heures de repas</Label>
                    <Input
                      type="number"
                      step="0.25"
                      min="0"
                      value={formData.heuresRepas}
                      onChange={(e) => setFormData({ ...formData, heuresRepas: e.target.value })}
                      placeholder="1"
                    />
                    <p className="text-xs text-muted-foreground">Exclues du total de travail</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Heures de trajet</Label>
                    <Input
                      type="number"
                      step="0.25"
                      min="0"
                      value={formData.heuresTrajet}
                      onChange={(e) => setFormData({ ...formData, heuresTrajet: e.target.value })}
                      placeholder="0"
                    />
                    <p className="text-xs text-muted-foreground">Affichées séparément</p>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label>Description (optionnel)</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Ajoutez une note..."
                  rows={3}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="media" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-base font-semibold">Photos</Label>
                  
                  <div
                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                      isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
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
                      {isUploading ? 'Téléchargement...' : 'Sélectionner des fichiers'}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      Formats acceptés : JPG, PNG, GIF (max 10MB par fichier)
                    </p>
                  </div>

                  {dailyPhotos.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
                      {dailyPhotos.map((photo) => (
                        <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden bg-muted group">
                          <img
                            src={photo.blob.getDirectURL()}
                            alt="Photo du jour"
                            className="w-full h-full object-cover"
                          />
                          {uploadProgress[photo.id] !== undefined && uploadProgress[photo.id] < 100 && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <div className="text-white text-sm font-medium">
                                {uploadProgress[photo.id]}%
                              </div>
                            </div>
                          )}
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7"
                            onClick={() => handleRemovePhoto(photo.id)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-base font-semibold">Enregistrements audio</Label>
                  
                  <div className="flex items-center justify-center p-6 bg-muted/50 rounded-lg">
                    {!isRecording ? (
                      <Button
                        onClick={handleStartRecording}
                        size="lg"
                        className="gap-2"
                        variant="default"
                      >
                        <Mic className="w-5 h-5" />
                        Démarrer l'enregistrement
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

                  {dailyAudio.length > 0 && (
                    <div className="space-y-2 mt-4">
                      {dailyAudio.map((audio, index) => (
                        <div key={audio.id} className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => handlePlayAudio(audio.id, audio.blob)}
                          >
                            {audioPlayingIndex === audio.id ? (
                              <Pause className="w-4 h-4" />
                            ) : (
                              <Play className="w-4 h-4" />
                            )}
                          </Button>
                          <span className="flex-1 text-sm">Enregistrement audio {index + 1}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveAudio(audio.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="flex gap-2">
            {editingEntry && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteEntry.isPending}
                className="mr-auto"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Supprimer
              </Button>
            )}
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={saveEntry.isPending || updateEntry.isPending}>
              {saveEntry.isPending || updateEntry.isPending ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
