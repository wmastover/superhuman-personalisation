import { useCallback, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import type { ReviewRow } from '../lib/types';
import { EmailPreview } from '../components/EmailPreview';
import { WebsitePanel } from '../components/WebsitePanel';
import { TemplateEditor } from '../components/TemplateEditor';
import { useKeyboardNav } from '../hooks/useKeyboardNav';

interface Props {
  rows: ReviewRow[];
  cursor: number;
  onCursorChange: (cursor: number) => void;
  template: string;
  onTemplateChange: (template: string) => void;
  onUpdate: (index: number, updates: Partial<ReviewRow>) => void;
  onFinish: () => void;
}

export function ReviewStep({ rows, cursor, onCursorChange, template, onTemplateChange, onUpdate, onFinish }: Props) {
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);

  // Resizable split
  const [leftPct, setLeftPct] = useState(33);
  const splitContainerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const onDividerMouseDown = useCallback((e: ReactMouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (ev: globalThis.MouseEvent) => {
      if (!isDragging.current || !splitContainerRef.current) return;
      const rect = splitContainerRef.current.getBoundingClientRect();
      const pct = ((ev.clientX - rect.left) / rect.width) * 100;
      setLeftPct(Math.min(80, Math.max(20, pct)));
    };

    const onMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, []);


  const row = rows[cursor];
  const total = rows.length;
  const done = rows.filter(r => r.status !== 'pending').length;

  const advance = useCallback((status: ReviewRow['status']) => {
    onUpdate(cursor, { status });
    if (cursor < total - 1) {
      onCursorChange(cursor + 1);
    } else {
      onFinish();
    }
  }, [cursor, total, onUpdate, onFinish, onCursorChange]);

  const confirm = useCallback(() => {
    const current = rows[cursor];
    const wasEdited = current.personalisedLine !== (current.originalPersonalisedLine ?? current.personalisedLine);
    advance(wasEdited ? 'edited' : 'approved');
  }, [rows, cursor, advance]);

  const prev = useCallback(() => {
    if (cursor > 0) onCursorChange(cursor - 1);
  }, [cursor, onCursorChange]);

  const handleLineChange = useCallback((val: string) => {
    onUpdate(cursor, { personalisedLine: val });
  }, [cursor, onUpdate]);

  const skipRow = useCallback(() => {
    advance('skipped');
  }, [advance]);

  const markInvalid = useCallback(() => {
    advance('invalid');
  }, [advance]);

  const openTab = useCallback(() => {
    if (row.domain) window.open(row.domain, '_blank', 'noopener,noreferrer');
  }, [row.domain]);

  useKeyboardNav({
    onConfirm: confirm,
    onPrev: prev,
    onInvalid: markInvalid,
    onOpenTab: openTab,
    enabled: !showTemplateEditor,
  });

  if (!row) return null;

  const progressPct = (done / total) * 100;

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold text-gray-900">
            {cursor + 1} <span className="font-normal text-gray-400">/ {total}</span>
          </span>
          <div className="flex items-center gap-2">
            {rows.filter(r => r.status === 'approved').length > 0 && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                {rows.filter(r => r.status === 'approved').length} approved
              </span>
            )}
            {rows.filter(r => r.status === 'edited').length > 0 && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                {rows.filter(r => r.status === 'edited').length} edited
              </span>
            )}
            {rows.filter(r => r.status === 'skipped').length > 0 && (
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                {rows.filter(r => r.status === 'skipped').length} skipped
              </span>
            )}
            {rows.filter(r => r.status === 'invalid').length > 0 && (
              <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">
                {rows.filter(r => r.status === 'invalid').length} invalid
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={markInvalid}
            className="text-xs text-gray-400 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-1"
          >
            <kbd className="font-mono bg-gray-100 px-1 rounded">⌘I</kbd>
            Invalid
          </button>
          <button
            onClick={skipRow}
            className="text-xs text-gray-400 hover:text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Skip
          </button>
          <button
            onClick={() => setShowTemplateEditor(true)}
            className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit template
          </button>
          <button
            onClick={onFinish}
            className="text-xs text-white bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg transition-colors"
          >
            Finish & export
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-100 shrink-0">
        <div
          className="h-full bg-green-500 transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Main split pane */}
      <div ref={splitContainerRef} className="flex flex-1 overflow-hidden">
        {/* Left: email preview */}
        <div className="flex flex-col overflow-hidden bg-white shrink-0" style={{ width: `${leftPct}%` }}>
          <EmailPreview
            row={row}
            template={template}
            onLineChange={handleLineChange}
          />

          {/* Confirm button */}
          <div className="border-t border-gray-200 shrink-0">
            <button
              onClick={confirm}
              className="w-full flex items-center justify-center gap-2 py-3.5 text-sm font-medium text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors"
            >
              Confirm
              <kbd className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded leading-none">⌘↵</kbd>
            </button>
          </div>
        </div>

        {/* Drag handle */}
        <div
          onMouseDown={onDividerMouseDown}
          className="w-1 shrink-0 bg-gray-200 hover:bg-blue-400 active:bg-blue-500 cursor-col-resize transition-colors relative group"
        >
          <div className="absolute inset-y-0 -left-1.5 -right-1.5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex flex-col gap-1">
              <span className="w-1 h-1 rounded-full bg-blue-400" />
              <span className="w-1 h-1 rounded-full bg-blue-400" />
              <span className="w-1 h-1 rounded-full bg-blue-400" />
            </div>
          </div>
        </div>

        {/* Right: website */}
        <div className="flex flex-col overflow-hidden flex-1">
          <WebsitePanel url={row.domain} company={row.company} />
        </div>
      </div>

      {/* Keyboard hint bar */}
      <div className="flex items-center justify-center gap-6 py-2 bg-gray-50 border-t border-gray-100 shrink-0">
        <span className="text-xs text-gray-400 flex items-center gap-1.5">
          <kbd className="bg-white border border-gray-200 rounded px-1.5 py-0.5 font-mono shadow-sm">⌘↵</kbd>
          confirm
        </span>
        <span className="text-xs text-gray-400 flex items-center gap-1.5">
          <kbd className="bg-white border border-gray-200 rounded px-1.5 py-0.5 font-mono shadow-sm">⌘I</kbd>
          invalid
        </span>
        <span className="text-xs text-gray-400 flex items-center gap-1.5">
          <kbd className="bg-white border border-gray-200 rounded px-1.5 py-0.5 font-mono shadow-sm">⌘↑</kbd>
          go back
        </span>
        <span className="text-xs text-gray-400 flex items-center gap-1.5">
          <kbd className="bg-white border border-gray-200 rounded px-1.5 py-0.5 font-mono shadow-sm">⌘O</kbd>
          open tab
        </span>
      </div>

      {showTemplateEditor && (
        <TemplateEditor
          template={template}
          onSave={onTemplateChange}
          onClose={() => setShowTemplateEditor(false)}
        />
      )}
    </div>
  );
}
