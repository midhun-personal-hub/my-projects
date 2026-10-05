import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDebounce } from '../../hooks/useDebounce';
import { graphService } from '../../services/graphService';
import { PersonUser } from '../../types';
import {
  User,
  Search,
  X,
  Check,
  Loader2,
  AlertCircle,
  Users,
  RefreshCw,
} from 'lucide-react';

export type { PersonUser };

export interface PeoplePickerProps {
  /** Selected SharePoint Person structure (single object or array for multi) */
  value: any;
  /** Callback fired when selection changes with strict SharePoint Person OData payload */
  onChange: (value: any) => void;
  /** Input placeholder string */
  placeholder?: string;
  /** Override flag to disable picker */
  disabled?: boolean;
  /** Error message to render */
  error?: string;
  /** Enables multi-user selection array mode */
  isMulti?: boolean;
}

/**
 * Helper to normalize incoming value prop into a clean array of PersonUser
 */
function normalizeSelectedUsers(rawVal: any): PersonUser[] {
  if (!rawVal) return [];
  const list = Array.isArray(rawVal) ? rawVal : [rawVal];
  return list
    .filter(Boolean)
    .map((item) => {
      if (typeof item === 'string') {
        const cleanStr = item.trim();
        const isEmail = cleanStr.includes('@');
        return {
          id: cleanStr,
          displayName: cleanStr,
          email: isEmail ? cleanStr : '',
          userPrincipalName: isEmail ? cleanStr : '',
          Claims: isEmail ? `i:0#.f|membership|${cleanStr.toLowerCase()}` : undefined,
        };
      }
      const email = item.email || item.userPrincipalName || item.mail || '';
      return {
        id: item.id || item.objectId || email || item.displayName || 'unknown-id',
        displayName: item.displayName || item.title || email || item.id || 'Unknown User',
        email: email,
        userPrincipalName: item.userPrincipalName || email,
        Claims: item.Claims || (email ? `i:0#.f|membership|${email.toLowerCase()}` : undefined),
      };
    });
}

/**
 * Formats a user into the strict SharePoint OData Person payload structure
 */
export function formatPersonPayload(user: PersonUser) {
  const email = user.email || user.userPrincipalName || '';
  return {
    id: user.id,
    displayName: user.displayName,
    email: email,
    userPrincipalName: user.userPrincipalName || email,
    Claims: user.Claims || (email ? `i:0#.f|membership|${email.toLowerCase()}` : undefined),
  };
}

/**
 * Enterprise PeoplePicker Component
 *
 * Auto-completes Microsoft Entra ID users using Microsoft Graph API (`/v1.0/users`).
 * Features a 350ms debounce buffer, strict error handling with retry option,
 * small result set limits ($top=10), no mock/fake users, and returns formatted SharePoint OData structures.
 */
export const PeoplePicker: React.FC<PeoplePickerProps> = ({
  value,
  onChange,
  placeholder = 'Type at least 2 characters to search users...',
  disabled = false,
  error,
  isMulti = false,
}) => {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 350);

  const [results, setResults] = useState<PersonUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Normalize selected users from initial / current value prop
  const selectedUsers = normalizeSelectedUsers(value);

  // Search Entra ID users via Microsoft Graph API
  const searchUsers = useCallback(async (searchTerm: string) => {
    const trimmed = searchTerm.trim();
    if (!trimmed || trimmed.length < 2) {
      setResults([]);
      setIsLoading(false);
      setSearchError(null);
      return;
    }

    setIsLoading(true);
    setSearchError(null);

    try {
      const users = await graphService.searchUsers(trimmed);
      setResults(users);
    } catch (err: any) {
      console.warn('PeoplePicker Graph API search error:', err);
      setSearchError(err.message || 'Failed to search Microsoft Entra ID users.');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Trigger search on debounced query change
  useEffect(() => {
    if (isOpen) {
      searchUsers(debouncedQuery);
    }
  }, [debouncedQuery, isOpen, searchUsers]);

  // Handle click outside popover
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle user item selection
  const handleSelectUser = (user: PersonUser) => {
    const formatted = formatPersonPayload(user);

    if (isMulti) {
      const exists = selectedUsers.some((u) => u.id === user.id || (u.email && u.email === user.email));
      let updated: any[];
      if (exists) {
        updated = selectedUsers.filter((u) => u.id !== user.id && (!u.email || u.email !== user.email));
      } else {
        updated = [...selectedUsers.map(formatPersonPayload), formatted];
      }
      onChange(updated);
    } else {
      onChange(formatted);
      setIsOpen(false);
      setQuery('');
    }
  };

  // Remove single user from selection
  const handleRemoveUser = (userId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (disabled) return;

    if (isMulti) {
      const updated = selectedUsers
        .filter((u) => u.id !== userId)
        .map(formatPersonPayload);
      onChange(updated);
    } else {
      onChange(null);
    }
  };

  // Helper for generating avatar initials
  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div ref={containerRef} className="relative w-full space-y-1.5">
      {/* Search Input Box & Selected Chips Container */}
      <div
        onClick={() => !disabled && setIsOpen(true)}
        className={`min-h-[42px] px-3 py-2 rounded-xl border transition-all cursor-text flex flex-wrap items-center gap-2 ${
          error || searchError
            ? 'border-rose-500 bg-rose-50/30 dark:bg-rose-950/20'
            : isOpen
            ? 'border-brand-500 ring-2 ring-brand-500/30 bg-white dark:bg-slate-950'
            : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:border-slate-300'
        } ${disabled ? 'opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-900' : ''}`}
      >
        <User className="w-4 h-4 text-slate-400 shrink-0" />

        {/* Selected User Chips */}
        {selectedUsers.map((user) => (
          <span
            key={user.id}
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300 border border-brand-200 dark:border-brand-800 shrink-0"
          >
            <div className="w-4 h-4 rounded-full bg-brand-200 dark:bg-brand-800 text-brand-800 dark:text-brand-200 flex items-center justify-center text-[9px] font-bold">
              {getInitials(user.displayName)}
            </div>
            <span className="truncate max-w-[130px]">{user.displayName}</span>
            {!disabled && (
              <button
                type="button"
                onClick={(e) => handleRemoveUser(user.id, e)}
                className="p-0.5 rounded-full hover:bg-brand-200/60 dark:hover:bg-brand-800 text-brand-500 transition-colors"
                title="Remove user"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </span>
        ))}

        {/* Input element (hidden if single user already selected and popover is closed) */}
        {(!selectedUsers.length || isMulti || isOpen) && (
          <input
            type="text"
            value={query}
            disabled={disabled}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder={selectedUsers.length === 0 ? placeholder : 'Add another user...'}
            className="flex-1 min-w-[120px] bg-transparent text-xs text-slate-900 dark:text-slate-100 focus:outline-none placeholder-slate-400"
          />
        )}

        {/* Loading Spinner / Search Indicator */}
        <div className="ml-auto flex items-center gap-1 shrink-0">
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 text-brand-600 animate-spin" />
          ) : query ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setQuery('');
                setResults([]);
                setSearchError(null);
              }}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <Search className="w-3.5 h-3.5 text-slate-400" />
          )}
        </div>
      </div>

      {/* Popover Dropdown Results Menu */}
      {isOpen && !disabled && (
        <div className="absolute left-0 right-0 mt-1 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-2 z-50 text-xs animate-fade-in max-h-60 overflow-y-auto custom-scrollbar space-y-1">
          <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-slate-400 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" /> Entra ID Directory Results
            </span>
            <span>{results.length} found</span>
          </div>

          {/* 1. Loading State */}
          {isLoading && (
            <div className="py-6 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-5 h-5 text-brand-600 animate-spin" />
              <span className="text-xs">Searching Entra ID directory...</span>
            </div>
          )}

          {/* 2. Error State + Retry */}
          {!isLoading && searchError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-900 space-y-2">
              <div className="flex items-start gap-2 text-rose-700 dark:text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="flex-1 font-medium">{searchError}</span>
              </div>
              <button
                type="button"
                onClick={() => searchUsers(debouncedQuery)}
                className="w-full py-1.5 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Retry Search
              </button>
            </div>
          )}

          {/* 3. Empty State (<2 chars typed) */}
          {!isLoading && !searchError && debouncedQuery.trim().length < 2 && (
            <div className="py-6 text-center text-slate-400 text-xs">
              Type at least 2 characters to search Entra ID directory...
            </div>
          )}

          {/* 4. Empty State (No matching results) */}
          {!isLoading && !searchError && debouncedQuery.trim().length >= 2 && results.length === 0 && (
            <div className="py-6 text-center text-slate-400 text-xs">
              No matching Entra ID users found for "{debouncedQuery}".
            </div>
          )}

          {/* 5. Results List */}
          {!isLoading && !searchError && results.length > 0 && (
            results.map((u) => {
              const isSelected = selectedUsers.some(
                (sel) => sel.id === u.id || (sel.email && sel.email === u.email)
              );

              return (
                <div
                  key={u.id}
                  onClick={() => handleSelectUser(u)}
                  className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-brand-50/80 dark:bg-brand-950/60 text-brand-900 dark:text-brand-100'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold flex items-center justify-center text-xs shrink-0">
                      {getInitials(u.displayName)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-xs truncate">{u.displayName}</p>
                      {u.email && <p className="text-[10px] text-slate-400 truncate">{u.email}</p>}
                    </div>
                  </div>

                  {isSelected && (
                    <Check className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Field Level Error Message */}
      {error && (
        <div className="flex items-center gap-1 text-rose-600 dark:text-rose-400 text-[11px] pt-0.5">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
