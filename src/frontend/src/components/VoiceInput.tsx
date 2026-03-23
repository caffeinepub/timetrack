import { Mic, Square } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface VoiceInputProps {
  value: string;
  onChange: (val: string) => void;
  className?: string;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event & { error?: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  onsoundstart: (() => void) | null;
  onspeechstart: (() => void) | null;
}

function getSpeechRecognition(): (new () => SpeechRecognitionInstance) | null {
  if (typeof window === "undefined") return null;
  const w = window as Window &
    typeof globalThis & {
      SpeechRecognition?: new () => SpeechRecognitionInstance;
      webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
    };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

// Detect iOS
function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function VoiceInput({
  value,
  onChange,
  className = "",
}: VoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [statusText, setStatusText] = useState("");
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const accumulatedRef = useRef("");
  const valueRef = useRef(value);

  // Keep valueRef in sync
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    setIsSupported(getSpeechRecognition() !== null);
  }, []);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {
        // ignore
      }
      recognitionRef.current = null;
    }
    setIsRecording(false);
    setStatusText("");
    accumulatedRef.current = "";
  }, []);

  const startRecording = useCallback(() => {
    const SR = getSpeechRecognition();
    if (!SR) return;

    // Cleanup previous
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (_) {
        /**/
      }
      recognitionRef.current = null;
    }

    const recognition = new SR();
    recognition.lang = "fr-FR";
    recognition.maxAlternatives = 1;

    // iOS Safari doesn't support continuous mode well
    if (isIOS()) {
      recognition.continuous = false;
      recognition.interimResults = false;
    } else {
      // Android Chrome: use continuous for better capture
      recognition.continuous = true;
      recognition.interimResults = true;
    }

    accumulatedRef.current = "";

    recognition.onstart = () => {
      setIsRecording(true);
      setStatusText("Écoute...");
    };

    recognition.onsoundstart = () => {
      setStatusText("Son détecté...");
    };

    recognition.onspeechstart = () => {
      setStatusText("Parole détectée...");
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        }
      }

      if (finalTranscript.trim()) {
        const base = valueRef.current;
        const separator = base.trim().length > 0 ? " " : "";
        const newValue = base + separator + finalTranscript.trim();
        onChange(newValue);
        valueRef.current = newValue;
        accumulatedRef.current += finalTranscript;
        setStatusText("Écoute...");
      }
    };

    recognition.onerror = (event) => {
      const err = (event as Event & { error?: string }).error;
      // Ignore "no-speech" — user just hasn't spoken yet
      if (err === "no-speech") {
        setStatusText("Écoute...");
        return;
      }
      // For aborted (manual stop), ignore
      if (err === "aborted") {
        return;
      }
      setIsRecording(false);
      setStatusText("");
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      // On iOS, recognition ends after each utterance — restart if still recording
      if (recognitionRef.current && isIOS()) {
        try {
          recognitionRef.current.start();
          setStatusText("Écoute...");
          return;
        } catch (_) {
          // Can't restart, just stop
        }
      }
      setIsRecording(false);
      setStatusText("");
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
      setIsRecording(true);
      setStatusText("Démarrage...");
    } catch (_) {
      setIsRecording(false);
      recognitionRef.current = null;
    }
  }, [onChange]);

  const toggle = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  if (!isSupported) return null;

  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      <button
        type="button"
        onClick={toggle}
        title={isRecording ? "Arrêter la dictée" : "Dicter en français"}
        className={`inline-flex items-center justify-center w-9 h-9 rounded-full border-2 transition-all duration-200 flex-shrink-0 ${
          isRecording
            ? "bg-red-500 border-red-600 text-white shadow-lg shadow-red-300 scale-110"
            : "bg-white border-gray-300 text-gray-500 hover:border-orange-400 hover:text-orange-500 hover:bg-orange-50"
        }`}
        data-ocid="voice.mic.button"
      >
        {isRecording ? (
          <Square className="w-4 h-4" />
        ) : (
          <Mic className="w-4 h-4" />
        )}
      </button>
      {isRecording && statusText && (
        <span className="text-xs text-red-500 animate-pulse font-medium">
          {statusText}
        </span>
      )}
    </div>
  );
}
