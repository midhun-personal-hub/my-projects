import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  Loader2,
  AlertTriangle,
  ImageIcon,
  Maximize2,
} from 'lucide-react';

export interface ImagePreviewItem {
  url: string;
  title?: string;
}

export interface ImagePreviewModalProps {
  /** Controls modal overlay visibility */
  isOpen: boolean;
  /** Callback fired to close lightbox overlay */
  onClose: () => void;
  /** Array of full-resolution image items to view in gallery */
  images: ImagePreviewItem[];
  /** Zero-based starting index when modal opens */
  initialIndex?: number;
}

/**
 * Enterprise ImagePreviewModal Component
 *
 * Lightweight, zero-dependency full-screen lightbox modal for SharePoint image galleries.
 * Features:
 * - Progressive network image loading with spinner state
 * - Native CSS scale transforms with smooth zoom controls (0.5x to 3.0x) & mouse wheel zoom
 * - Keyboard shortcuts (Escape, ArrowLeft, ArrowRight)
 * - Touch swipe navigation for mobile
 * - Multi-image gallery mode with thumbnail strip
 * - Safe image downloading & graceful fallback error state
 */
export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  isOpen,
  onClose,
  images,
  initialIndex = 0,
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(initialIndex);
  const [zoom, setZoom] = useState<number>(1.0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);

  // Mobile Touch Swipe Coordinates
  const touchStartXRef = useRef<number | null>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Sync index when modal opens or initialIndex changes
  useEffect(() => {
    if (isOpen) {
      const validIndex = Math.max(0, Math.min(initialIndex, images.length - 1));
      setCurrentIndex(validIndex);
      setZoom(1.0);
      setIsLoading(true);
      setHasError(false);
    }
  }, [isOpen, initialIndex, images.length]);

  // Reset zoom & load states when index changes
  useEffect(() => {
    if (isOpen) {
      setZoom(1.0);
      setIsLoading(true);
      setHasError(false);
    }
  }, [currentIndex, isOpen]);

  const currentImage = images[currentIndex] || null;

  // Zoom Handler Helpers
  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(3.0, Number((prev + 0.25).toFixed(2))));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(0.5, Number((prev - 0.25).toFixed(2))));
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoom(1.0);
  }, []);

  // Gallery Navigation Handlers
  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  const handleNext = useCallback(() => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentIndex, images.length]);

  // Keyboard Event Listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-') {
        handleZoomOut();
      } else if (e.key === '0') {
        handleZoomReset();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handlePrev, handleNext, handleZoomIn, handleZoomOut, handleZoomReset]);

  // Mouse Wheel Zoom Handler
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setZoom((prev) => Math.min(3.0, Number((prev + 0.15).toFixed(2))));
    } else if (e.deltaY > 0) {
      setZoom((prev) => Math.max(0.5, Number((prev - 0.15).toFixed(2))));
    }
  }, []);

  // Touch Swipe Handlers for Mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const deltaX = touchEndX - touchStartXRef.current;

    // Minimum swipe threshold of 50px
    if (deltaX > 50) {
      handlePrev();
    } else if (deltaX < -50) {
      handleNext();
    }

    touchStartXRef.current = null;
  };

  // Safe Image Download Handler
  const handleDownload = async () => {
    if (!currentImage?.url) return;
    try {
      const response = await fetch(currentImage.url, { mode: 'cors' });
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      const fileName = currentImage.title
        ? `${currentImage.title.replace(/[^a-z0-9]/gi, '_')}.png`
        : `sharepoint-image-${currentIndex + 1}.png`;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      // Direct window open fallback for strict CORS origin limitations
      window.open(currentImage.url, '_blank', 'noopener,noreferrer');
    }
  };

  // Progressive DOM Loading: Only mount when active
  if (!isOpen || !currentImage || images.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur-md select-none animate-fade-in transition-all">
      {/* Lightbox Top Control Toolbar Header */}
      <div className="px-6 py-4 flex items-center justify-between border-b border-slate-800/80 bg-slate-900/60 shrink-0 z-20">
        {/* Title & Metadata */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 rounded-xl bg-slate-800 text-brand-400 border border-slate-700/60 shrink-0">
            <ImageIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-100 truncate max-w-md">
              {currentImage.title || `Image Preview ${currentIndex + 1}`}
            </h3>
            {images.length > 1 && (
              <p className="text-xs text-slate-400 font-medium">
                Image {currentIndex + 1} of {images.length}
              </p>
            )}
          </div>
        </div>

        {/* Center Control Actions (Zoom & Reset) */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-slate-800/80 border border-slate-700/60">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={zoom <= 0.5}
            className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-700/60 disabled:opacity-40 transition-colors"
            title="Zoom Out (-)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <span className="px-2.5 text-xs font-mono font-bold text-slate-200 min-w-[50px] text-center">
            {Math.round(zoom * 100)}%
          </span>

          <button
            type="button"
            onClick={handleZoomIn}
            disabled={zoom >= 3.0}
            className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-700/60 disabled:opacity-40 transition-colors"
            title="Zoom In (+)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <div className="w-px h-4 bg-slate-700 my-auto mx-1" />

          <button
            type="button"
            onClick={handleZoomReset}
            className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-700/60 transition-colors"
            title="Reset Zoom (0)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownload}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700/60 text-xs font-semibold transition-all flex items-center gap-1.5"
            title="Download full-resolution image"
          >
            <Download className="w-4 h-4" />
            <span className="hidden md:inline">Download</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-colors"
            title="Close Lightbox (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Viewport Container */}
      <div
        ref={imageContainerRef}
        className="relative flex-1 flex items-center justify-center overflow-hidden p-4 sm:p-8 cursor-grab active:cursor-grabbing"
        onClick={onClose}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Dynamic Loading Spinner */}
        {isLoading && !hasError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/40 z-10">
            <Loader2 className="w-10 h-10 animate-spin text-brand-500" />
            <p className="text-xs text-slate-300 font-medium">Fetching high-resolution image...</p>
          </div>
        )}

        {/* Fallback Error State */}
        {hasError ? (
          <div
            onClick={(e) => e.stopPropagation()}
            className="p-8 rounded-3xl bg-slate-900 border border-slate-800 max-w-md text-center space-y-4 shadow-2xl z-20"
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-950/80 text-rose-400 border border-rose-800/80 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-100">Unable to Load Image</h4>
              <p className="text-xs text-slate-400 mt-1">
                The high-resolution target image could not be fetched from SharePoint. Please check network connectivity or access permissions.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setHasError(false);
                setIsLoading(true);
              }}
              className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold transition-all"
            >
              Retry Loading
            </button>
          </div>
        ) : (
          /* High-Resolution Image Element with Scale Transform */
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative transition-transform duration-200 ease-out max-w-full max-h-full flex items-center justify-center"
            style={{
              transform: `scale(${zoom})`,
            }}
          >
            <img
              src={currentImage.url}
              alt={currentImage.title || 'Full Preview'}
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setIsLoading(false);
                setHasError(true);
              }}
              className={`max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl select-none transition-opacity duration-300 ${
                isLoading ? 'opacity-0' : 'opacity-100'
              }`}
              draggable={false}
            />
          </div>
        )}

        {/* Multi-Image Previous Arrow Navigation */}
        {images.length > 1 && currentIndex > 0 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 p-3 rounded-2xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/60 shadow-xl transition-all z-20"
            title="Previous Image (Left Arrow)"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Multi-Image Next Arrow Navigation */}
        {images.length > 1 && currentIndex < images.length - 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 p-3 rounded-2xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/60 shadow-xl transition-all z-20"
            title="Next Image (Right Arrow)"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Gallery Bottom Thumbnail Bar */}
      {images.length > 1 && (
        <div className="px-6 py-3 border-t border-slate-800/80 bg-slate-900/80 shrink-0 z-20 overflow-x-auto custom-scrollbar flex items-center justify-center gap-2">
          {images.map((img, idx) => {
            const isActive = idx === currentIndex;
            return (
              <button
                key={`${img.url}-${idx}`}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={`relative w-12 h-12 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                  isActive
                    ? 'border-brand-500 scale-105 ring-2 ring-brand-500/30'
                    : 'border-slate-700 opacity-60 hover:opacity-100 hover:border-slate-500'
                }`}
                title={img.title || `Jump to image ${idx + 1}`}
              >
                <img
                  src={img.url}
                  alt={img.title || `Thumb ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
