import { useEffect, useRef, useState } from 'react';
import { DEFAULT_TEMPLATE } from '../lib/types';

interface Props {
  template: string;
  onSave: (template: string) => void;
  onClose: () => void;
}

export function TemplateEditor({ template, onSave, onClose }: Props) {
  const [value, setValue] = useState(template);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const hasPersonalisedLine = value.includes('{{personalised_line}}');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Edit Email Template</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Use <code className="bg-gray-100 px-1 rounded">{'{{personalised_line}}'}</code>,{' '}
              <code className="bg-gray-100 px-1 rounded">{'{{name}}'}</code>,{' '}
              <code className="bg-gray-100 px-1 rounded">{'{{company}}'}</code> as placeholders
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-hidden p-4">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full h-72 font-mono text-sm text-gray-800 border border-gray-200 rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            spellCheck={false}
          />

          {!hasPersonalisedLine && (
            <div className="mt-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              ⚠ Template is missing <code>{'{{personalised_line}}'}</code> — this is where the reviewed line will appear.
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={() => setValue(DEFAULT_TEMPLATE)}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Reset to default
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => { onSave(value); onClose(); }}
              className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 transition-colors"
            >
              Save template
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
