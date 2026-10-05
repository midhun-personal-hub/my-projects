import { Sun, Moon } from 'lucide-react';
import { useThemeStore } from '../../state/themeStore';

interface ThemeToggleProps {
  compact?: boolean;
  className?: string;
}

export function ThemeToggle({ compact = false, className = '' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useThemeStore();
  const isDark = theme === 'dark';

  return (
    <button
      id="theme-toggle-btn"
      type="button"
      onClick={toggleTheme}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer select-none ${
        isDark
          ? 'bg-slate-800/90 hover:bg-slate-700 text-amber-400 border-slate-700/80 shadow-xs'
          : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border-neutral-200 shadow-xs'
      } ${className}`}
      title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
      aria-label={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
    >
      {isDark ? (
        <>
          <Sun className="w-3.5 h-3.5 text-amber-400" />
          {!compact && <span className="text-slate-200 font-medium">Dark</span>}
        </>
      ) : (
        <>
          <Moon className="w-3.5 h-3.5 text-slate-600" />
          {!compact && <span className="text-neutral-700 font-medium">Light</span>}
        </>
      )}
    </button>
  );
}
