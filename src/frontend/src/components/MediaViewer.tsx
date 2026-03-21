import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export interface MediaItem {
  type: "photo" | "video";
  url: string;
}

interface MediaViewerProps {
  media: MediaItem[];
  initialIndex: number;
  onClose: () => void;
}

export default function MediaViewer({
  media,
  initialIndex,
  onClose,
}: MediaViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const touchStartX = useRef<number | null>(null);
  const touchStartDist = useRef<number | null>(null);
  const scaleRef = useRef(1);

  const current = media[currentIndex];

  const goNext = useCallback(() => {
    setCurrentIndex((i) => (i + 1) % media.length);
    setScale(1);
    scaleRef.current = 1;
  }, [media.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => (i - 1 + media.length) % media.length);
    setScale(1);
    scaleRef.current = 1;
  }, [media.length]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, goNext, goPrev]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartX.current = e.touches[0].clientX;
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchStartDist.current = Math.sqrt(dx * dx + dy * dy);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current !== null && e.changedTouches.length === 1) {
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      if (Math.abs(dx) > 60) {
        if (dx < 0) goNext();
        else goPrev();
      }
    }
    touchStartX.current = null;
    touchStartDist.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStartDist.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const newScale = Math.min(
        4,
        Math.max(1, scaleRef.current * (dist / touchStartDist.current)),
      );
      setScale(newScale);
    }
  };

  const handleDoubleClick = () => {
    if (scale > 1) {
      setScale(1);
      scaleRef.current = 1;
    } else {
      setScale(2.5);
      scaleRef.current = 2.5;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      aria-modal="true"
      tabIndex={-1}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
      data-ocid="media_viewer.modal"
    >
      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
        data-ocid="media_viewer.close_button"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Counter */}
      {media.length > 1 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 px-3 py-1 rounded-full bg-black/60 text-white text-sm">
          {currentIndex + 1} / {media.length}
        </div>
      )}

      {/* Zoom controls for photos */}
      {current?.type === "photo" && (
        <div className="absolute bottom-20 right-4 z-10 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              const s = Math.min(4, scale + 0.5);
              setScale(s);
              scaleRef.current = s;
            }}
            className="p-2 rounded-full bg-black/60 text-white hover:bg-black/80"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => {
              const s = Math.max(1, scale - 0.5);
              setScale(s);
              scaleRef.current = s;
            }}
            className="p-2 rounded-full bg-black/60 text-white hover:bg-black/80"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Navigation prev */}
      {media.length > 1 && (
        <button
          type="button"
          onClick={goPrev}
          className="absolute left-2 z-10 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
          data-ocid="media_viewer.pagination_prev"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {/* Media content */}
      <div className="flex items-center justify-center w-full h-full p-12">
        {current?.type === "photo" ? (
          <img
            src={current.url}
            alt="Media"
            style={{
              transform: `scale(${scale})`,
              transition: "transform 0.2s",
            }}
            className="max-w-full max-h-full object-contain select-none cursor-zoom-in"
            onDoubleClick={handleDoubleClick}
            draggable={false}
          />
        ) : current?.type === "video" ? (
          <video
            src={current.url}
            controls
            autoPlay
            className="max-w-full max-h-full rounded"
            style={{ maxHeight: "80vh" }}
          >
            <track kind="captions" />
          </video>
        ) : null}
      </div>

      {/* Navigation next */}
      {media.length > 1 && (
        <button
          type="button"
          onClick={goNext}
          className="absolute right-12 z-10 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
          data-ocid="media_viewer.pagination_next"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      {/* Thumbnail strip */}
      {media.length > 1 && (
        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 px-4 overflow-x-auto">
          {media.map((m, i) => {
            const itemKey = `${m.url}-${i}`;
            return (
              <button
                key={itemKey}
                type="button"
                onClick={() => {
                  setCurrentIndex(i);
                  setScale(1);
                  scaleRef.current = 1;
                }}
                className={`flex-shrink-0 w-12 h-12 rounded overflow-hidden border-2 transition-colors ${
                  i === currentIndex
                    ? "border-white"
                    : "border-transparent opacity-60"
                }`}
              >
                {m.type === "photo" ? (
                  <img
                    src={m.url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                    <span className="text-white text-xs">▶</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
