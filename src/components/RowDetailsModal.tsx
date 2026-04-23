import { useEffect, type ReactNode } from 'react';
import type { RawRow } from '../lib/types';

interface Props {
  raw: RawRow;
  onClose: () => void;
}

const LINK_RE = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+)/gi;

function linkifyValue(text: string): ReactNode {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  const re = new RegExp(LINK_RE.source, 'gi');
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > lastIndex) {
      nodes.push(text.slice(lastIndex, m.index));
    }
    const rawUrl = m[0];
    const href = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;
    nodes.push(
      <a
        key={`${m.index}-${rawUrl.slice(0, 48)}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:text-blue-800 hover:underline break-all"
      >
        {rawUrl}
      </a>,
    );
    lastIndex = m.index + rawUrl.length;
  }
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }
  return nodes.length > 0 ? nodes : text;
}

export function RowDetailsModal({ raw, onClose }: Props) {
  const entries = Object.entries(raw);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="row-details-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-2xl max-h-[80vh] bg-white rounded-2xl shadow-xl flex flex-col overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 shrink-0 bg-gray-50/80">
          <h2 id="row-details-title" className="text-sm font-semibold text-gray-900">
            All fields for this row
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto p-4">
          {entries.length === 0 ? (
            <p className="text-sm text-gray-500">No columns in this row.</p>
          ) : (
            <div className="rounded-lg border border-gray-200 overflow-hidden bg-white shadow-sm">
              <table className="w-full text-sm border-collapse table-fixed">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-200">
                    <th
                      scope="col"
                      className="text-left font-semibold text-gray-600 text-xs uppercase tracking-wide px-3 py-2.5 w-[38%] border-r border-gray-200"
                    >
                      Field
                    </th>
                    <th
                      scope="col"
                      className="text-left font-semibold text-gray-600 text-xs uppercase tracking-wide px-3 py-2.5"
                    >
                      Value
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {entries.map(([key, value], i) => (
                    <tr
                      key={key}
                      className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/70'}
                    >
                      <td className="align-top px-3 py-2.5 font-medium text-gray-800 border-r border-gray-200 break-words">
                        {key}
                      </td>
                      <td className="align-top px-3 py-2.5 text-gray-600 break-words">
                        {value === '' || value == null ? (
                          <span className="text-gray-300">—</span>
                        ) : (
                          linkifyValue(String(value))
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
