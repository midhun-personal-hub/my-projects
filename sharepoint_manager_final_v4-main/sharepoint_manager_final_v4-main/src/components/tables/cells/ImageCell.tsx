import React from 'react';
import { Image as ImageIcon, ZoomIn } from 'lucide-react';

export interface ImageItem {
  url: string;
  title?: string;
}

export interface ImageCellProps {
  /** Single URL, array of URLs, or array of ImageItem objects */
  value: string | string[] | ImageItem | ImageItem[] | null | undefined;
  /** Alt text / title for fallback */
  altText?: string;
  /** Optional click handler to open lightbox with images and starting index */
  onImageClick?: (images: ImageItem[], initialIndex: number) => void;
  /** Custom CSS className for container */
  className?: string;
}

/**
 * Normalizes diverse image inputs into a clean array of ImageItem objects.
 */
export function normalizeImages(
  value: string | string[] | ImageItem | ImageItem[] | null | undefined,
  fallbackTitle?: string
): ImageItem[] {
  if (!value) return [];

  // Single string
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        return normalizeImages(parsed, fallbackTitle);
      } catch {
        // Fallback to plain string parsing
      }
    }
    if (trimmed.includes(',') && !trimmed.startsWith('data:image/')) {
      return trimmed
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .map((url, idx) => ({
          url,
          title: fallbackTitle ? `${fallbackTitle} (${idx + 1})` : `Image ${idx + 1}`,
        }));
    }
    return [{ url: trimmed, title: fallbackTitle || 'Image' }];
  }

  // Single object
  if (!Array.isArray(value) && typeof value === 'object' && value.url) {
    return [{ url: value.url, title: value.title || fallbackTitle || 'Image' }];
  }

  // Array of items
  if (Array.isArray(value)) {
    const result: ImageItem[] = [];
    value.forEach((item, idx) => {
      if (typeof item === 'string' && item.trim()) {
        result.push({
          url: item.trim(),
          title: fallbackTitle ? `${fallbackTitle} (${idx + 1})` : `Image ${idx + 1}`,
        });
      } else if (item && typeof item === 'object' && item.url) {
        result.push({
          url: item.url,
          title: item.title || (fallbackTitle ? `${fallbackTitle} (${idx + 1})` : `Image ${idx + 1}`),
        });
      }
    });
    return result;
  }

  return [];
}

/**
 * Enterprise ImageCell Component
 *
 * Column-level cell renderer for image columns.
 * Displays clean thumbnail bubbles (max-height 32px), overlapping stacks for multiple images,
 * "+N" overflow badge, and hover zoom overlay trigger.
 */
export const ImageCell: React.FC<ImageCellProps> = ({
  value,
  altText,
  onImageClick,
  className = '',
}) => {
  const images = normalizeImages(value, altText);

  // Empty State Fallback
  if (images.length === 0) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-slate-400 text-xs font-normal ${className}`}
        title="No image available"
      >
        <ImageIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span className="italic text-[11px]">No image</span>
      </div>
    );
  }

  const maxVisible = 3;
  const visibleImages = images.slice(0, maxVisible);
  const overflowCount = images.length - maxVisible;

  const handleClick = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    if (onImageClick) {
      onImageClick(images, index);
    }
  };

  return (
    <div
      className={`inline-flex items-center ${
        images.length > 1 ? '-space-x-2 hover:space-x-0.5 transition-all duration-200' : ''
      } ${className}`}
    >
      {visibleImages.map((img, idx) => (
        <div
          key={`${img.url}-${idx}`}
          onClick={(e) => handleClick(e, idx)}
          className="relative group/thumb cursor-pointer shrink-0 transition-all duration-200 hover:z-20 hover:scale-110"
          title={img.title || `View image ${idx + 1}`}
        >
          <div className="w-8 h-8 rounded-lg overflow-hidden border-2 border-white dark:border-slate-900 shadow-xs bg-slate-100 dark:bg-slate-800 relative">
            <img
              src={img.url}
              alt={img.title || altText || 'Thumbnail'}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
                const parent = (e.currentTarget as HTMLElement).parentElement;
                if (parent) {
                  parent.classList.add('flex', 'items-center', 'justify-center');
                }
              }}
            />
            {/* Hover overlay indicator */}
            <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center">
              <ZoomIn className="w-3.5 h-3.5 text-white" />
            </div>
          </div>
        </div>
      ))}

      {/* Overflow Badge for >3 images */}
      {overflowCount > 0 && (
        <div
          onClick={(e) => handleClick(e, maxVisible)}
          className="relative cursor-pointer shrink-0 z-10 transition-transform duration-200 hover:scale-110"
          title={`+${overflowCount} more image(s)`}
        >
          <div className="w-8 h-8 rounded-lg border-2 border-white dark:border-slate-900 shadow-xs bg-brand-600 dark:bg-brand-500 text-white flex items-center justify-center text-[10px] font-bold">
            +{overflowCount}
          </div>
        </div>
      )}
    </div>
  );
};
