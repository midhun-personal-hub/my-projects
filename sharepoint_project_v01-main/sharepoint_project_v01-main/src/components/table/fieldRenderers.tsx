import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  ExternalLink,
  CheckCircle2,
  XCircle,
  FileText,
  Tag,
  Paperclip,
  ZoomIn,
  ArrowUpRight,
  User,
  Database,
  Calendar,
  Image as ImageIcon,
} from 'lucide-react';
import type {
  SharePointColumnDefinition,
  SharePointFieldType,
  SharePointPersonValue,
  SharePointHyperlinkValue,
  SharePointAttachmentValue,
  SharePointLookupValue,
  SharePointTaxonomyValue,
} from '../../types/sharepoint';

/**
 * Check if a column definition or value represents an image/photo
 */
export function isImageFieldOrUrl(column?: SharePointColumnDefinition, value?: any): boolean {
  if (column) {
    if (column.thumbnail !== undefined) return true;
    if (column.hyperlinkOrPicture?.isPicture) return true;

    const colName = (column.name || '').toLowerCase();
    const colDisplay = (column.displayName || '').toLowerCase();
    if (
      colName.includes('image') ||
      colName.includes('photo') ||
      colName.includes('picture') ||
      colName.includes('diagram') ||
      colName.includes('thumbnail') ||
      colDisplay.includes('image') ||
      colDisplay.includes('photo') ||
      colDisplay.includes('picture') ||
      colDisplay.includes('diagram') ||
      colDisplay.includes('thumbnail')
    ) {
      return true;
    }
  }

  // Check value itself
  const testUrl = typeof value === 'string' ? value : value?.url;
  if (typeof testUrl === 'string' && testUrl.trim()) {
    if (
      /\.(jpeg|jpg|gif|png|webp|svg|bmp)($|\?)/i.test(testUrl) ||
      testUrl.includes('images.unsplash.com') ||
      testUrl.startsWith('data:image/')
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Detect the SharePoint field type from a Microsoft Graph column definition.
 */
export function detectSharePointFieldType(column: SharePointColumnDefinition): SharePointFieldType {
  if (column.choice) {
    return column.choice.allowMultipleValues ? 'multichoice' : 'choice';
  }
  if (column.personOrGroup) {
    return column.personOrGroup.allowMultipleSelection ? 'multiperson' : 'person';
  }
  if (column.dateTime) {
    return 'datetime';
  }
  if (column.currency) {
    return 'currency';
  }
  if (column.number) {
    return 'number';
  }
  if (column.boolean !== undefined) {
    return 'boolean';
  }
  if (column.thumbnail !== undefined) {
    return 'image';
  }
  if (column.hyperlinkOrPicture) {
    return column.hyperlinkOrPicture.isPicture ? 'image' : 'hyperlink';
  }
  if (column.attachment !== undefined) {
    return 'attachment';
  }
  if (column.lookup) {
    return column.lookup.allowMultipleValues ? 'multilookup' : 'lookup';
  }
  if (column.taxonomy) {
    return 'taxonomy';
  }

  // Name-based heuristics for images
  const colName = (column.name || '').toLowerCase();
  const colDisplay = (column.displayName || '').toLowerCase();
  if (
    colName.includes('image') ||
    colName.includes('photo') ||
    colName.includes('picture') ||
    colName.includes('diagram') ||
    colName.includes('thumbnail') ||
    colDisplay.includes('image') ||
    colDisplay.includes('photo') ||
    colDisplay.includes('picture') ||
    colDisplay.includes('diagram') ||
    colDisplay.includes('thumbnail')
  ) {
    return 'image';
  }

  if (column.text) {
    return column.text.allowMultipleLines ? 'note' : 'text';
  }
  return 'unknown';
}

export interface SharePointFieldRendererProps {
  value: any;
  column: SharePointColumnDefinition;
  fieldType: SharePointFieldType;
  onPreviewImage?: (image: { url: string; title?: string }) => void;
  onExpandRichText?: (content: { title: string; html: string }) => void;
}

/**
 * Deterministic badge color generator for choices and tags
 */
const BADGE_COLOR_PALETTES = [
  'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/80 ring-blue-500/10',
  'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/80 ring-emerald-500/10',
  'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/80 ring-amber-500/10',
  'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/80 ring-indigo-500/10',
  'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/80 ring-purple-500/10',
  'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/80 ring-rose-500/10',
  'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800/80 ring-teal-500/10',
  'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800/80 ring-sky-500/10',
];

function getBadgeColor(text: string): string {
  if (!text) return 'bg-neutral-100 dark:bg-white/10 text-neutral-600 dark:text-slate-300 border-neutral-200 dark:border-white/10';
  const lower = text.toLowerCase();
  if (lower.includes('completed') || lower.includes('approved') || lower.includes('active') || lower.includes('high')) {
    return 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/80 ring-1 ring-emerald-600/10';
  }
  if (lower.includes('progress') || lower.includes('review') || lower.includes('pending') || lower.includes('medium')) {
    return 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/80 ring-1 ring-amber-600/10';
  }
  if (lower.includes('blocked') || lower.includes('rejected') || lower.includes('critical') || lower.includes('cancelled')) {
    return 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/80 ring-1 ring-rose-600/10';
  }
  if (lower.includes('hold') || lower.includes('draft') || lower.includes('low')) {
    return 'bg-neutral-100 dark:bg-white/10 text-neutral-700 dark:text-slate-300 border-neutral-200 dark:border-white/10 ring-1 ring-neutral-400/10';
  }
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % BADGE_COLOR_PALETTES.length;
  return BADGE_COLOR_PALETTES[index];
}

// 1. Single line text renderer
export function SingleLineTextRenderer(props: SharePointFieldRendererProps) {
  const { value, column, onPreviewImage } = props;
  if (value === null || value === undefined || value === '') {
    return <span className="text-neutral-300 dark:text-slate-600 font-mono select-none">—</span>;
  }
  const text = String(value);

  // If text is an image URL or image field, render the image thumbnail with hover popup!
  if (
    isImageFieldOrUrl(column, value) &&
    (text.startsWith('http') || text.startsWith('data:image/'))
  ) {
    return (
      <ImageThumbnailWithHoverPopup
        url={text}
        name={column.displayName || 'Image'}
        onPreviewImage={onPreviewImage}
      />
    );
  }

  return (
    <span className="truncate block font-normal text-neutral-800 dark:text-slate-200" title={text}>
      {text}
    </span>
  );
}

// 2. Multiple lines of text / Rich text renderer (truncated with expand option)
export function RichTextRenderer({ value, column, onExpandRichText }: SharePointFieldRendererProps) {
  const [isExpandedLocal, setIsExpandedLocal] = useState(false);

  if (value === null || value === undefined || value === '') {
    return <span className="text-neutral-300 dark:text-slate-600 font-mono select-none">—</span>;
  }

  const rawHtml = String(value);
  // Strip HTML for plain preview snippet
  const plainText = rawHtml.replace(/<[^>]+>/g, '').trim();
  const isLong = plainText.length > 70;

  return (
    <div className="flex flex-col gap-1 items-start max-w-sm">
      <div className="text-xs text-neutral-700 dark:text-slate-300 leading-relaxed overflow-hidden">
        {isExpandedLocal ? (
          <div
            className="prose prose-xs max-w-none text-neutral-800 dark:text-slate-200 bg-neutral-50 dark:bg-[#0f172a] p-2 rounded border border-neutral-200 dark:border-white/10"
            dangerouslySetInnerHTML={{ __html: rawHtml }}
          />
        ) : (
          <span className="line-clamp-2" title={plainText}>
            {plainText || <span className="italic text-neutral-400 dark:text-slate-500">Formatted content</span>}
          </span>
        )}
      </div>
      {isLong && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onExpandRichText) {
                onExpandRichText({
                  title: column.displayName || column.name,
                  html: rawHtml,
                });
              } else {
                setIsExpandedLocal(!isExpandedLocal);
              }
            }}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
          >
            <FileText className="w-3 h-3" />
            <span>{isExpandedLocal ? 'Collapse' : 'Expand full note'}</span>
          </button>
        </div>
      )}
    </div>
  );
}

// 3. Choice (single select) - styled badge/pill
export function ChoiceRenderer({ value }: SharePointFieldRendererProps) {
  if (value === null || value === undefined || value === '') {
    return <span className="text-neutral-300 dark:text-slate-600 font-mono select-none">—</span>;
  }
  const text = String(value);
  const colorClass = getBadgeColor(text);

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${colorClass}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-60" />
      {text}
    </span>
  );
}

// 4. Choice (multi-select) - multiple styled badges
export function MultiChoiceRenderer({ value }: SharePointFieldRendererProps) {
  if (!value || (Array.isArray(value) && value.length === 0)) {
    return <span className="text-neutral-300 dark:text-slate-600 font-mono select-none">—</span>;
  }
  const choices: string[] = Array.isArray(value) ? value : String(value).split(';#').filter(Boolean);

  return (
    <div className="flex flex-wrap gap-1 items-center">
      {choices.map((choice, i) => {
        const colorClass = getBadgeColor(choice);
        return (
          <span
            key={i}
            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium border whitespace-nowrap ${colorClass}`}
          >
            {choice}
          </span>
        );
      })}
    </div>
  );
}

// 5. Person/Group - avatar + display name
export function PersonRenderer({ value }: SharePointFieldRendererProps) {
  if (!value) {
    return <span className="text-neutral-300 dark:text-slate-600 font-mono select-none">—</span>;
  }

  // Handle single person or array
  const persons: SharePointPersonValue[] = Array.isArray(value) ? value : [value];

  if (persons.length === 0) {
    return <span className="text-neutral-300 dark:text-slate-600 font-mono select-none">—</span>;
  }

  if (persons.length === 1) {
    const person = persons[0];
    const name = person.displayName || person.email || 'Unknown';
    const initials =
      person.initials ||
      name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

    return (
      <div className="flex items-center gap-2 min-w-0" title={person.email || name}>
        {person.avatarUrl ? (
          <img
            src={person.avatarUrl}
            alt={name}
            referrerPolicy="no-referrer"
            className="w-6 h-6 rounded-full object-cover flex-shrink-0 border border-neutral-200 dark:border-white/15"
          />
        ) : (
          <div className="w-6 h-6 rounded-full bg-neutral-200 dark:bg-slate-700 text-neutral-700 dark:text-slate-200 flex items-center justify-center text-[10px] font-medium flex-shrink-0 border border-neutral-300 dark:border-slate-600">
            {initials || <User className="w-3 h-3" />}
          </div>
        )}
        <div className="truncate min-w-0">
          <span className="text-xs font-medium text-neutral-800 dark:text-slate-200 truncate block">{name}</span>
          {person.jobTitle && <span className="text-[10px] text-neutral-500 dark:text-slate-400 truncate block">{person.jobTitle}</span>}
        </div>
      </div>
    );
  }

  // Multiple persons
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex -space-x-1.5 overflow-hidden">
        {persons.slice(0, 3).map((p, idx) => {
          const initials =
            p.initials ||
            p.displayName
              ?.split(' ')
              .map((n) => n[0])
              .slice(0, 2)
              .join('')
              .toUpperCase() ||
            'U';
          return p.avatarUrl ? (
            <img
              key={idx}
              src={p.avatarUrl}
              alt={p.displayName}
              referrerPolicy="no-referrer"
              className="inline-block h-5 w-5 rounded-full ring-1 ring-white dark:ring-slate-900 object-cover"
              title={p.displayName}
            />
          ) : (
            <div
              key={idx}
              className="inline-flex h-5 w-5 rounded-full ring-1 ring-white dark:ring-slate-900 bg-neutral-300 dark:bg-slate-700 items-center justify-center text-[9px] font-semibold text-neutral-700 dark:text-slate-200"
              title={p.displayName}
            >
              {initials}
            </div>
          );
        })}
      </div>
      <span className="text-xs text-neutral-700 dark:text-slate-300">
        {persons.length} {persons.length === 1 ? 'person' : 'people'}
      </span>
    </div>
  );
}

// 6. Date/DateTime - formatted date
export function DateTimeRenderer({ value, column }: SharePointFieldRendererProps) {
  if (!value) {
    return <span className="text-neutral-300 dark:text-slate-600 font-mono select-none">—</span>;
  }
  const dateObj = new Date(value);
  if (isNaN(dateObj.getTime())) {
    return <span className="text-xs text-neutral-600 dark:text-slate-300">{String(value)}</span>;
  }

  const isDateTime = column.dateTime?.format === 'dateTime';
  const formattedDate = dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const formattedTime = dateObj.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <div className="inline-flex items-center gap-1.5 text-xs text-neutral-700 dark:text-slate-300">
      <Calendar className="w-3.5 h-3.5 text-neutral-400 dark:text-slate-500 flex-shrink-0" />
      <span className="whitespace-nowrap">{formattedDate}</span>
      {isDateTime && <span className="text-[11px] text-neutral-400 dark:text-slate-500 font-mono">{formattedTime}</span>}
    </div>
  );
}

// 7. Number/Currency - right-aligned, formatted
export function NumberCurrencyRenderer({ value, column, fieldType }: SharePointFieldRendererProps) {
  if (value === null || value === undefined || value === '') {
    return (
      <div className="text-right">
        <span className="text-neutral-300 dark:text-slate-600 font-mono select-none">—</span>
      </div>
    );
  }

  const num = Number(value);
  if (isNaN(num)) {
    return <div className="text-right text-xs text-neutral-700 dark:text-slate-300">{String(value)}</div>;
  }

  if (fieldType === 'currency' || column.currency) {
    const symbol = column.currency?.currencySymbol || '$';
    const formatted = num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return (
      <div className="text-right font-mono text-xs font-medium text-neutral-800 dark:text-slate-200">
        <span className="text-neutral-500 dark:text-slate-400 mr-0.5">{symbol}</span>
        {formatted}
      </div>
    );
  }

  // Display percentage if specified
  if (column.number?.displayAs === 'percentage') {
    const pct = num > 1 ? num : num * 100;
    return (
      <div className="text-right font-mono text-xs font-medium text-neutral-800 dark:text-slate-200">
        {pct.toFixed(column.number.decimalPlaces ? Number(column.number.decimalPlaces) : 0)}%
      </div>
    );
  }

  const decimals = column.number?.decimalPlaces ? Number(column.number.decimalPlaces) : undefined;
  const formatted = num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <div className="text-right font-mono text-xs font-medium text-neutral-800 dark:text-slate-200">
      {formatted}
    </div>
  );
}

// 8. Yes/No (boolean) - checkbox or icon
export function BooleanRenderer({ value }: SharePointFieldRendererProps) {
  if (value === null || value === undefined) {
    return <span className="text-neutral-300 dark:text-slate-600 font-mono select-none">—</span>;
  }
  const isChecked = Boolean(value);

  return (
    <div className="flex items-center gap-1.5">
      {isChecked ? (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80">
          <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
          Yes
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-neutral-50 dark:bg-white/5 text-neutral-500 dark:text-slate-400 border border-neutral-200 dark:border-white/10">
          <XCircle className="w-3 h-3 text-neutral-400 dark:text-slate-500" />
          No
        </span>
      )}
    </div>
  );
}

// Image Thumbnail with Hover Popup showing full size image
interface ImageThumbnailWithHoverPopupProps {
  url: string;
  name: string;
  onPreviewImage?: (image: { url: string; title?: string }) => void;
}

export function ImageThumbnailWithHoverPopup({
  url,
  name,
  onPreviewImage,
}: ImageThumbnailWithHoverPopupProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const handleMouseEnter = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const popupWidth = 380;
      const popupHeight = 340;

      // Position popup anchored to the thumbnail
      let left = rect.right + 12;
      // If overflowing right viewport edge, open to left
      if (left + popupWidth > window.innerWidth - 16) {
        left = Math.max(16, rect.left - popupWidth - 12);
      }

      // Vertical centering aligned with thumbnail
      let top = rect.top + rect.height / 2 - popupHeight / 2;
      if (top + popupHeight > window.innerHeight - 16) {
        top = window.innerHeight - popupHeight - 16;
      }
      if (top < 16) {
        top = 16;
      }

      setCoords({ top, left });
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  return (
    <div className="inline-flex items-center gap-2">
      <button
        ref={buttonRef}
        type="button"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={(e) => {
          e.stopPropagation();
          if (onPreviewImage) {
            onPreviewImage({ url, title: name });
          }
        }}
        className="group relative flex items-center gap-2 px-1.5 py-1 rounded-lg border border-neutral-200/90 dark:border-white/15 bg-white dark:bg-[#1a2436] hover:border-blue-400 dark:hover:border-blue-500 hover:ring-2 hover:ring-blue-500/20 transition-all cursor-pointer shadow-2xs text-left"
        title="Hover to view full size image, click for full lightbox"
      >
        <div className="relative w-12 h-9 rounded-md overflow-hidden bg-neutral-100 dark:bg-slate-800 border border-neutral-200 dark:border-white/10 flex-shrink-0 flex items-center justify-center">
          <img
            src={url}
            alt={name}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          />
          <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <ZoomIn className="w-3.5 h-3.5 text-white drop-shadow" />
          </div>
        </div>

        <div className="flex flex-col min-w-0 max-w-[130px]">
          <span className="text-[11px] font-medium text-neutral-800 dark:text-slate-200 truncate" title={name}>
            {name}
          </span>
          <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium group-hover:underline flex items-center gap-0.5">
            Full view
          </span>
        </div>
      </button>

      {/* Full-Size Image Preview Portal on Hover */}
      {isHovered && coords && createPortal(
        <div
          role="tooltip"
          style={{ top: `${coords.top}px`, left: `${coords.left}px` }}
          className="fixed z-[99999] pointer-events-none w-[380px] max-w-[94vw] bg-white dark:bg-[#131d2e] rounded-xl shadow-2xl border border-neutral-200/90 dark:border-white/15 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between px-3.5 py-2.5 bg-neutral-50 dark:bg-[#0f172a] border-b border-neutral-200/80 dark:border-white/10">
            <div className="flex items-center gap-2 min-w-0">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                <ImageIcon className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                Image
              </span>
              <span className="text-xs font-semibold text-neutral-800 dark:text-slate-200 truncate" title={name}>
                {name}
              </span>
            </div>
            <span className="text-[10px] font-semibold text-neutral-500 dark:text-slate-400 bg-neutral-200/60 dark:bg-white/10 px-1.5 py-0.5 rounded">
              Full Size View
            </span>
          </div>

          {/* Full-Size Image Display Canvas */}
          <div className="relative bg-neutral-950 p-2 flex items-center justify-center min-h-[220px] max-h-[380px] overflow-hidden">
            <img
              src={url}
              alt={name}
              referrerPolicy="no-referrer"
              className="max-h-[360px] w-auto max-w-full object-contain rounded-md shadow-lg"
            />
          </div>

          {/* Footer Bar */}
          <div className="px-3.5 py-2 bg-neutral-50/70 dark:bg-[#0f172a]/80 flex items-center justify-between text-[10px] text-neutral-500 dark:text-slate-400 border-t border-neutral-100 dark:border-white/10">
            <span className="font-mono text-[9px] text-neutral-400 dark:text-slate-500 truncate max-w-[220px]">
              {url.replace(/^https?:\/\//i, '').slice(0, 36)}...
            </span>
            <span className="font-medium text-blue-600 dark:text-blue-400">
              Click thumbnail for modal
            </span>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// 9. Hyperlink - render as clickable link with separate display text if present
export function HyperlinkRenderer(props: SharePointFieldRendererProps) {
  const { value, column, onPreviewImage } = props;
  if (!value) {
    return <span className="text-neutral-300 dark:text-slate-600 font-mono select-none">—</span>;
  }

  let url = '';
  let description = '';

  if (typeof value === 'string') {
    url = value;
    description = value;
  } else if (typeof value === 'object') {
    const linkVal = value as SharePointHyperlinkValue;
    url = linkVal.url || '';
    description = linkVal.description || linkVal.url || '';
  }

  if (!url) {
    return <span className="text-neutral-300 dark:text-slate-600 font-mono select-none">—</span>;
  }

  // If this column or URL is an image, display the image thumbnail with hover popup instead of link!
  if (
    isImageFieldOrUrl(column, value) ||
    /\.(jpeg|jpg|gif|png|webp|svg|bmp)($|\?)/i.test(url) ||
    url.includes('images.unsplash.com') ||
    url.startsWith('data:image/')
  ) {
    return (
      <ImageThumbnailWithHoverPopup
        url={url}
        name={description || column.displayName || 'Image'}
        onPreviewImage={onPreviewImage}
      />
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline max-w-xs truncate"
      title={`${description} (${url})`}
    >
      <span className="truncate">{description}</span>
      <ExternalLink className="w-3 h-3 flex-shrink-0 text-blue-400 dark:text-blue-500" />
    </a>
  );
}

// 10. Image/Attachment - render as image thumbnail with hover full size popup, click to preview
export function ImageAttachmentRenderer({ value, column, onPreviewImage }: SharePointFieldRendererProps) {
  if (!value) {
    return <span className="text-neutral-300 dark:text-slate-600 font-mono select-none">—</span>;
  }

  // Value can be a string URL, an object { url, name }, or an array of attachments
  const items: (SharePointAttachmentValue | { url: string; name?: string; description?: string })[] = Array.isArray(value)
    ? value
    : typeof value === 'object'
      ? [value]
      : [{ url: String(value), name: column.displayName || 'Image' }];

  if (items.length === 0) {
    return <span className="text-neutral-300 dark:text-slate-600 font-mono select-none">—</span>;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map((item, idx) => {
        const url = item.url || (item as any).thumbnailUrl || '';
        const name = (item as any).name || (item as any).description || column.displayName || 'Image';
        const isImg =
          (item as SharePointAttachmentValue).isImage ??
          (/\.(jpeg|jpg|gif|png|webp|svg|bmp)($|\?)/i.test(url) ||
            url.includes('images.unsplash.com') ||
            url.startsWith('data:image/') ||
            isImageFieldOrUrl(column, item));

        if (isImg && url) {
          return (
            <ImageThumbnailWithHoverPopup
              key={idx}
              url={url}
              name={name}
              onPreviewImage={onPreviewImage}
            />
          );
        }

        return (
          <a
            key={idx}
            href={url || '#'}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              if (!url || url === '#') e.preventDefault();
            }}
            className="inline-flex items-center gap-1 px-2 py-1 bg-neutral-100 dark:bg-white/10 hover:bg-neutral-200 dark:hover:bg-white/15 border border-neutral-200 dark:border-white/10 rounded text-xs text-neutral-700 dark:text-slate-300 transition-colors"
            title={name}
          >
            <Paperclip className="w-3 h-3 text-neutral-500 dark:text-slate-400 flex-shrink-0" />
            <span className="truncate max-w-[100px]">{name}</span>
          </a>
        );
      })}
    </div>
  );
}

// 11. Lookup - render the looked-up display value
export function LookupRenderer({ value }: SharePointFieldRendererProps) {
  if (!value) {
    return <span className="text-neutral-300 dark:text-slate-600 font-mono select-none">—</span>;
  }

  const lookups: (SharePointLookupValue | string)[] = Array.isArray(value) ? value : [value];

  return (
    <div className="flex flex-wrap gap-1 items-center">
      {lookups.map((item, idx) => {
        const text = typeof item === 'object' && item !== null ? item.lookupValue : String(item);
        return (
          <span
            key={idx}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-white/10"
            title={`Lookup: ${text}`}
          >
            <Database className="w-3 h-3 text-slate-500 dark:text-slate-400" />
            <span className="truncate max-w-[140px]">{text}</span>
          </span>
        );
      })}
    </div>
  );
}

// 12. Managed metadata/Taxonomy - render as tag/badge
export function TaxonomyRenderer({ value }: SharePointFieldRendererProps) {
  if (!value) {
    return <span className="text-neutral-300 dark:text-slate-600 font-mono select-none">—</span>;
  }

  const terms: (SharePointTaxonomyValue | string)[] = Array.isArray(value) ? value : [value];

  return (
    <div className="flex flex-wrap gap-1 items-center">
      {terms.map((term, idx) => {
        const label = typeof term === 'object' && term !== null ? term.label : String(term);
        const path = typeof term === 'object' && term !== null ? term.path : undefined;

        return (
          <span
            key={idx}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800/80"
            title={path ? `Taxonomy: ${path}` : `Taxonomy: ${label}`}
          >
            <Tag className="w-2.5 h-2.5 text-violet-500 dark:text-violet-400" />
            <span className="truncate max-w-[130px]">{label}</span>
          </span>
        );
      })}
    </div>
  );
}

// Fallback unknown renderer
export function DefaultFallbackRenderer({ value }: SharePointFieldRendererProps) {
  if (value === null || value === undefined || value === '') {
    return <span className="text-neutral-300 dark:text-slate-600 font-mono select-none">—</span>;
  }
  if (typeof value === 'object') {
    return (
      <span className="text-xs text-neutral-600 dark:text-slate-400 font-mono truncate block max-w-xs" title={JSON.stringify(value)}>
        {JSON.stringify(value)}
      </span>
    );
  }
  return <span className="text-xs text-neutral-800 dark:text-slate-200 truncate block">{String(value)}</span>;
}

/**
 * Extensible Column-type-to-renderer mapping registry
 */
export const FIELD_RENDERER_REGISTRY: Record<SharePointFieldType, React.ComponentType<SharePointFieldRendererProps>> = {
  text: SingleLineTextRenderer,
  note: RichTextRenderer,
  choice: ChoiceRenderer,
  multichoice: MultiChoiceRenderer,
  person: PersonRenderer,
  multiperson: PersonRenderer,
  datetime: DateTimeRenderer,
  number: NumberCurrencyRenderer,
  currency: NumberCurrencyRenderer,
  boolean: BooleanRenderer,
  hyperlink: HyperlinkRenderer,
  image: ImageAttachmentRenderer,
  attachment: ImageAttachmentRenderer,
  lookup: LookupRenderer,
  multilookup: LookupRenderer,
  taxonomy: TaxonomyRenderer,
  unknown: DefaultFallbackRenderer,
};

/**
 * Helper to allow consumers to register custom field renderers
 */
export function registerFieldRenderer(
  fieldType: SharePointFieldType,
  renderer: React.ComponentType<SharePointFieldRendererProps>
) {
  FIELD_RENDERER_REGISTRY[fieldType] = renderer;
}

/**
 * Main adaptive cell dispatcher component
 */
export function SharePointFieldCell(props: SharePointFieldRendererProps) {
  const Renderer = FIELD_RENDERER_REGISTRY[props.fieldType] || DefaultFallbackRenderer;
  return <Renderer {...props} />;
}
