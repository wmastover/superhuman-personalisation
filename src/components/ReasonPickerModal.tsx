import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Reason } from '../lib/types';

export type ReasonPickerAccent = 'red' | 'blue';

interface Props {
  title: string;
  description?: ReactNode;
  placeholder?: string;
  reasons: Reason[];
  accent?: ReasonPickerAccent;
  onSubmit: (reason: string) => void;
  onCancel: () => void;
}

const accentStyles: Record<ReasonPickerAccent, {
  inputRing: string;
  highlightBg: string;
  highlightText: string;
  shortcutBorder: string;
  shortcutText: string;
}> = {
  red: {
    inputRing: 'focus:ring-red-500',
    highlightBg: 'bg-red-50',
    highlightText: 'text-red-700',
    shortcutBorder: 'border-red-200',
    shortcutText: 'text-red-600',
  },
  blue: {
    inputRing: 'focus:ring-blue-500',
    highlightBg: 'bg-blue-50',
    highlightText: 'text-blue-700',
    shortcutBorder: 'border-blue-200',
    shortcutText: 'text-blue-600',
  },
};

export function ReasonPickerModal({
  title,
  description,
  placeholder = 'Search or add a new reason…',
  reasons,
  accent = 'red',
  onSubmit,
  onCancel,
}: Props) {
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const a = accentStyles[accent];

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const trimmedQuery = query.trim();
  const filtered = useMemo(() => {
    if (!trimmedQuery) return reasons;
    const q = trimmedQuery.toLowerCase();
    return reasons.filter(r => r.text.toLowerCase().includes(q));
  }, [reasons, trimmedQuery]);

  const exactMatch = useMemo(
    () => filtered.find(r => r.text.toLowerCase() === trimmedQuery.toLowerCase()) ?? null,
    [filtered, trimmedQuery]
  );
  const showCreateOption = trimmedQuery.length > 0 && !exactMatch;
  const totalOptions = filtered.length + (showCreateOption ? 1 : 0);
  const createIndex = showCreateOption ? filtered.length : -1;

  useEffect(() => {
    setHighlight(0);
  }, [trimmedQuery]);

  useEffect(() => {
    if (highlight >= totalOptions) {
      setHighlight(Math.max(0, totalOptions - 1));
    }
  }, [highlight, totalOptions]);

  const submit = (reason: string) => {
    const trimmed = reason.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  };

  const submitByIndex = (idx: number) => {
    if (idx < 0 || idx >= totalOptions) return;
    if (idx === createIndex) {
      submit(trimmedQuery);
      return;
    }
    const reason = filtered[idx];
    if (reason) submit(reason.text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (totalOptions === 0) {
        if (trimmedQuery) submit(trimmedQuery);
        return;
      }
      submitByIndex(highlight);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight(h => (totalOptions === 0 ? 0 : (h + 1) % totalOptions));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight(h => (totalOptions === 0 ? 0 : (h - 1 + totalOptions) % totalOptions));
      return;
    }
    // Number-key shortcuts 1-9 pick from the visible filtered reasons list
    if (/^[1-9]$/.test(e.key) && !e.metaKey && !e.ctrlKey && !e.altKey) {
      const idx = parseInt(e.key, 10) - 1;
      if (idx < filtered.length) {
        e.preventDefault();
        submit(filtered[idx].text);
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm pt-24"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[70vh]">
        <div className="px-5 pt-5 pb-3 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          {description && (
            <p className="text-xs text-gray-400 mt-0.5">{description}</p>
          )}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={`mt-3 w-full text-sm text-gray-800 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 ${a.inputRing}`}
            spellCheck={false}
          />
        </div>

        <div ref={listRef} className="flex-1 overflow-y-auto py-1">
          {filtered.length === 0 && !showCreateOption && (
            <div className="px-5 py-8 text-center text-sm text-gray-400">
              No reasons yet. Type one to add it.
            </div>
          )}

          {filtered.map((reason, i) => {
            const isHighlighted = i === highlight;
            const shortcut = i < 9 ? String(i + 1) : null;
            return (
              <button
                key={reason.text}
                type="button"
                onMouseEnter={() => setHighlight(i)}
                onClick={() => submit(reason.text)}
                className={`w-full flex items-center gap-3 px-5 py-2 text-left text-sm transition-colors ${
                  isHighlighted ? `${a.highlightBg} ${a.highlightText}` : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <kbd
                  className={`font-mono text-xs px-1.5 py-0.5 rounded border ${
                    isHighlighted
                      ? `bg-white ${a.shortcutBorder} ${a.shortcutText}`
                      : 'bg-gray-100 border-gray-200 text-gray-500'
                  } ${shortcut ? '' : 'opacity-0'}`}
                >
                  {shortcut ?? '0'}
                </kbd>
                <span className="flex-1 truncate">{reason.text}</span>
                <span className="text-xs text-gray-400">{reason.count}</span>
              </button>
            );
          })}

          {showCreateOption && (
            <button
              type="button"
              onMouseEnter={() => setHighlight(createIndex)}
              onClick={() => submit(trimmedQuery)}
              className={`w-full flex items-center gap-3 px-5 py-2 text-left text-sm transition-colors ${
                highlight === createIndex ? `${a.highlightBg} ${a.highlightText}` : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <kbd
                className={`font-mono text-xs px-1.5 py-0.5 rounded border ${
                  highlight === createIndex
                    ? `bg-white ${a.shortcutBorder} ${a.shortcutText}`
                    : 'bg-gray-100 border-gray-200 text-gray-500'
                }`}
              >
                ↵
              </kbd>
              <span className="flex-1 truncate">
                Add new reason: <span className="font-medium">{trimmedQuery}</span>
              </span>
            </button>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-gray-100 text-xs text-gray-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="font-mono bg-gray-100 border border-gray-200 px-1 rounded">↑↓</kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="font-mono bg-gray-100 border border-gray-200 px-1 rounded">Esc</kbd>
              cancel
            </span>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
