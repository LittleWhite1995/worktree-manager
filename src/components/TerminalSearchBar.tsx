import { useState, useRef, useEffect, useCallback, type FC } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronUp, ChevronDown, X, CaseSensitive, Regex } from 'lucide-react';
import type { SearchOptions } from '../terminal';

interface TerminalSearchBarProps {
  onFindNext: (query: string, options: SearchOptions) => boolean;
  onFindPrevious: (query: string, options: SearchOptions) => boolean;
  onClose: () => void;
}

export const TerminalSearchBar: FC<TerminalSearchBarProps> = ({
  onFindNext,
  onFindPrevious,
  onClose,
}) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [hasResults, setHasResults] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const options: SearchOptions = { caseSensitive, regex: useRegex };

  const doFindNext = useCallback((q: string, opts: SearchOptions) => {
    if (!q) {
      setHasResults(true);
      return;
    }
    const found = onFindNext(q, opts);
    setHasResults(found);
  }, [onFindNext]);

  const doFindPrevious = useCallback((q: string, opts: SearchOptions) => {
    if (!q) {
      setHasResults(true);
      return;
    }
    const found = onFindPrevious(q, opts);
    setHasResults(found);
  }, [onFindPrevious]);

  // Debounced search on query/options change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const delay = useRegex ? 300 : 150;
    debounceRef.current = setTimeout(() => {
      doFindNext(query, options);
    }, delay);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, caseSensitive, useRegex, doFindNext]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        doFindPrevious(query, options);
      } else {
        doFindNext(query, options);
      }
    }
  };

  return (
    <div
      className="absolute top-2 right-2 z-30 flex items-center gap-1 px-2 py-1.5 bg-[#141419] border border-[#1E1E26] rounded-lg shadow-lg"
      onKeyDown={handleKeyDown}
    >
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('terminal.searchPlaceholder')}
        className={`w-48 px-2 py-1 text-xs bg-[#0A0A0F] border rounded text-[#E8E8ED] placeholder-[#55556A] outline-none focus:border-[#6366F1] transition-colors ${
          query && !hasResults ? 'border-[#EF4444]' : 'border-[#1E1E26]'
        }`}
        aria-label={t('terminal.search')}
      />
      {query && !hasResults && (
        <span className="text-[10px] text-[#EF4444] whitespace-nowrap">{t('terminal.noResults')}</span>
      )}
      <button
        onClick={() => setCaseSensitive(!caseSensitive)}
        className={`p-1 rounded transition-colors ${
          caseSensitive ? 'text-[#6366F1] bg-[#6366F1]/20' : 'text-[#55556A] hover:text-[#8B8B9E] hover:bg-[#1A1A22]'
        }`}
        title={t('terminal.caseSensitive')}
        aria-label={t('terminal.caseSensitive')}
        aria-pressed={caseSensitive}
      >
        <CaseSensitive className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => setUseRegex(!useRegex)}
        className={`p-1 rounded transition-colors ${
          useRegex ? 'text-[#6366F1] bg-[#6366F1]/20' : 'text-[#55556A] hover:text-[#8B8B9E] hover:bg-[#1A1A22]'
        }`}
        title={t('terminal.useRegex')}
        aria-label={t('terminal.useRegex')}
        aria-pressed={useRegex}
      >
        <Regex className="w-3.5 h-3.5" />
      </button>
      <div className="w-px h-4 bg-[#1A1A22] mx-0.5" />
      <button
        onClick={() => doFindPrevious(query, options)}
        className="p-1 rounded text-[#55556A] hover:text-[#8B8B9E] hover:bg-[#1A1A22] transition-colors"
        title={t('terminal.prevResult')}
        aria-label={t('terminal.prevResult')}
      >
        <ChevronUp className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => doFindNext(query, options)}
        className="p-1 rounded text-[#55556A] hover:text-[#8B8B9E] hover:bg-[#1A1A22] transition-colors"
        title={t('terminal.nextResult')}
        aria-label={t('terminal.nextResult')}
      >
        <ChevronDown className="w-3.5 h-3.5" />
      </button>
      <div className="w-px h-4 bg-[#1A1A22] mx-0.5" />
      <button
        onClick={onClose}
        className="p-1 rounded text-[#55556A] hover:text-[#8B8B9E] hover:bg-[#1A1A22] transition-colors"
        title={t('terminal.closeSearch')}
        aria-label={t('terminal.closeSearch')}
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
