import { useEffect, useRef, useState } from 'react';
import type { ReviewRow } from '../lib/types';

interface Props {
  row: ReviewRow;
  template: string;
  onLineChange: (val: string) => void;
  onViewAllFields: () => void;
}

function fieldValue(text: string) {
  return text.trim() === '' ? <span className="text-gray-300">—</span> : text;
}

function AutoTextarea({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  // Auto-resize on value change
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={1}
      spellCheck
      className="
        w-full
        text-gray-900 font-semibold
        bg-transparent border-0 border-b-2 border-blue-300
        focus:border-blue-500 focus:outline-none
        resize-none overflow-hidden
        leading-relaxed p-0
        font-[inherit] text-[inherit]
      "
    />
  );
}

export function EmailPreview({ row, template, onLineChange, onViewAllFields }: Props) {
  const [lineValue, setLineValue] = useState(row.personalisedLine);

  useEffect(() => {
    setLineValue(row.personalisedLine);
  }, [row.index, row.personalisedLine]);

  const handleChange = (val: string) => {
    setLineValue(val);
    onLineChange(val);
  };

  const filled = template
    .replace(/\{\{name\}\}/gi, row.name || 'there')
    .replace(/\{\{company\}\}/gi, row.company || 'your company');

  const parts = filled.split(/(\{\{personalised_line\}\})/gi);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-start justify-between gap-4 px-5 py-3 border-b border-gray-100 shrink-0">
        <div className="min-w-0 flex flex-col gap-0.5 text-xs">
          <span className="text-gray-900 font-semibold truncate">{fieldValue(row.name)}</span>
          <span className="text-gray-700 truncate">{fieldValue(row.jobTitle)}</span>
          <span className="text-gray-700 truncate">{fieldValue(row.company)}</span>
        </div>
        <button
          type="button"
          onClick={onViewAllFields}
          className="shrink-0 text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          View all fields
        </button>
      </div>

      <div className="flex-1 overflow-y-auto bg-gray-100 flex justify-center py-6 px-4">
        {/* Mobile email frame */}
        <div className="w-full max-w-[375px] bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col">
          {/* Fake email client header */}
          <div className="px-4 pt-4 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                W
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-gray-800 truncate">Will</div>
                <div className="text-xs text-gray-400 truncate">to {row.name || 'recipient'}</div>
              </div>
              <div className="text-xs text-gray-400 shrink-0">now</div>
            </div>
          </div>

          {/* Email body */}
          <div className="px-4 py-4 font-sans text-sm leading-6 flex-1">
            {parts.map((part, i) => {
              if (/\{\{personalised_line\}\}/i.test(part)) {
                return (
                  <AutoTextarea
                    key={i}
                    value={lineValue}
                    onChange={handleChange}
                  />
                );
              }
              return (
                <span key={i} className="text-gray-400 whitespace-pre-wrap">
                  {part}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {row.linkedinUrl && (
        <div className="px-5 py-2.5 border-t border-gray-100 text-xs text-gray-400 shrink-0">
          <a
            href={row.linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            LinkedIn profile ↗
          </a>
        </div>
      )}
    </div>
  );
}
