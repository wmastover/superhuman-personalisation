import { useRef, useState, useCallback, useEffect } from 'react';
import type { RawRow } from '../lib/types';
import { parseCSV } from '../lib/csv';
import { listSessions } from '../lib/storage';
import type { SavedSession } from '../lib/storage';

interface Props {
  onParsed: (rows: RawRow[], headers: string[], filename: string) => void;
  onLoadSession: (session: SavedSession) => void;
  onDeleteSession: (id: string) => void;
}

const STEP_LABELS: Record<string, string> = {
  upload: 'Upload',
  mapping: 'Mapping',
  review: 'Reviewing',
  export: 'Export',
};

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function UploadStep({ onParsed, onLoadSession, onDeleteSession }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState<SavedSession[]>([]);

  useEffect(() => {
    setSessions(listSessions());
  }, []);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setError('Please upload a CSV file.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const rows = await parseCSV(file);
      if (rows.length === 0) {
        setError('The CSV appears to be empty.');
        return;
      }
      const headers = Object.keys(rows[0]);
      onParsed(rows, headers, file.name);
    } catch {
      setError('Failed to parse the CSV. Please check the file format.');
    } finally {
      setLoading(false);
    }
  }, [onParsed]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDelete = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    onDeleteSession(id);
    setSessions(prev => prev.filter(s => s.id !== id));
  }, [onDeleteSession]);

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-12 overflow-y-auto">
      <div className="text-center">
        <h1 className="text-3xl font-semibold text-gray-900 mb-2">
          Personalisation Reviewer
        </h1>
        <p className="text-gray-500 text-base">
          Upload your CSV to start reviewing personalised email lines
        </p>
      </div>

      <div
        className={`w-full max-w-lg border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-colors ${
          dragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={onInputChange}
        />

        {loading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500">Parsing CSV...</p>
          </div>
        ) : (
          <>
            <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-gray-700 font-medium mb-1">
              {dragging ? 'Drop your CSV here' : 'Drag & drop your CSV here'}
            </p>
            <p className="text-gray-400 text-sm">or click to browse</p>
          </>
        )}
      </div>

      {error && (
        <div className="w-full max-w-lg bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {sessions.length > 0 && (
        <div className="w-full max-w-lg">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
            Continue where you left off
          </p>
          <div className="bg-white border border-gray-200 rounded-2xl divide-y divide-gray-100 overflow-hidden">
            {sessions.map((session) => {
              const reviewedCount = session.rows.filter(r => r.status !== 'pending').length;
              const total = session.rows.length;
              const pct = total > 0 ? Math.round((reviewedCount / total) * 100) : 0;

              return (
                <div
                  key={session.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer group transition-colors"
                  onClick={() => onLoadSession(session)}
                >
                  <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                    <svg className="w-4.5 h-4.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{session.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-400">
                        {STEP_LABELS[session.step] ?? session.step}
                      </span>
                      {total > 0 && (
                        <>
                          <span className="text-gray-200">·</span>
                          <span className="text-xs text-gray-400">
                            {reviewedCount}/{total} reviewed ({pct}%)
                          </span>
                        </>
                      )}
                      <span className="text-gray-200">·</span>
                      <span className="text-xs text-gray-400">{timeAgo(session.savedAt)}</span>
                    </div>
                    {total > 0 && (
                      <div className="mt-1.5 h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-400 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-xs text-blue-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity mr-1">
                      Resume →
                    </span>
                    <button
                      onClick={(e) => handleDelete(e, session.id)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete session"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="text-gray-400 text-xs text-center max-w-sm">
        Expected columns: name, company, domain, personalised line — you'll map them in the next step
      </div>
    </div>
  );
}
