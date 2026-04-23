import { useState } from 'react';
import type { ColumnMap, RawRow } from '../lib/types';

interface FieldSpec {
  key: keyof ColumnMap;
  label: string;
  required: boolean;
  description: string;
}

const FIELDS: FieldSpec[] = [
  { key: 'personalisedLine', label: 'Personalised Line', required: false, description: 'The AI-generated opening line — leave unmapped to write lines from scratch' },
  { key: 'domain', label: 'Company Website / Domain', required: true, description: 'Used to load the website on the right panel' },
  { key: 'name', label: 'First Name', required: false, description: 'Used in the email greeting' },
  { key: 'company', label: 'Company Name', required: false, description: 'For reference while reviewing' },
  { key: 'jobTitle', label: 'Job Title', required: false, description: 'For reference while reviewing' },
  { key: 'linkedinUrl', label: 'LinkedIn URL', required: false, description: 'For reference while reviewing' },
];

const NONE = '__none__';

interface Props {
  rows: RawRow[];
  headers: string[];
  onConfirm: (colMap: ColumnMap) => void;
  onBack: () => void;
}

export function MappingStep({ rows, headers, onConfirm, onBack }: Props) {
  const [mapping, setMapping] = useState<Partial<ColumnMap>>(() => {
    const auto: Partial<ColumnMap> = {};
    const lower = headers.map(h => ({ h, l: h.toLowerCase().replace(/[\s_-]/g, '') }));
    const match = (candidates: string[]) =>
      lower.find(({ l }) => candidates.some(c => l.includes(c)))?.h;

    auto.personalisedLine = match(['personalised', 'personalized', 'opening', 'line', 'intro']);
    auto.domain = match(['domain', 'website', 'url', 'site']);
    auto.name = match(['firstname', 'name', 'first']);
    auto.company = match(['company', 'org', 'organization', 'organisation']);
    auto.jobTitle = match(['jobtitle', 'title', 'role', 'position']);
    auto.linkedinUrl = match(['linkedin']);
    return auto;
  });

  const setValue = (key: keyof ColumnMap, value: string) => {
    setMapping(prev => ({ ...prev, [key]: value === NONE ? undefined : value }));
  };

  const canConfirm = !!mapping.domain;

  const handleConfirm = () => {
    if (!mapping.domain) return;
    onConfirm(mapping as ColumnMap);
  };

  const preview = rows[0];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Fixed header */}
      <div className="text-center px-8 pt-8 pb-4 shrink-0">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Map Your Columns</h1>
        <p className="text-gray-500 text-sm">
          {rows.length} rows detected · {headers.length} columns
        </p>
      </div>

      {/* Scrollable field list */}
      <div className="flex-1 overflow-y-auto px-8 py-2">
        <div className="w-full max-w-xl mx-auto bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
          {FIELDS.map((field) => {
            const val = mapping[field.key] ?? NONE;
            const previewVal = val !== NONE && preview ? preview[val] : null;

            return (
              <div key={field.key} className="px-4 py-3 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-800">{field.label}</span>
                  {field.required && (
                    <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium">
                      required
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400">{field.description}</p>
                <select
                  value={val}
                  onChange={(e) => setValue(field.key, e.target.value)}
                  className={`mt-0.5 w-full text-sm border rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    field.required && val === NONE
                      ? 'border-red-300'
                      : 'border-gray-200'
                  }`}
                >
                  {!field.required && <option value={NONE}>— not mapped —</option>}
                  {field.required && val === NONE && (
                    <option value={NONE} disabled>Select a column…</option>
                  )}
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
                {previewVal && (
                  <p className="text-xs text-gray-400 truncate">
                    Preview: <span className="text-gray-600 italic">"{previewVal}"</span>
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Fixed footer buttons */}
      <div className="shrink-0 px-8 py-4 border-t border-gray-100 bg-white">
        <div className="flex gap-3 w-full max-w-xl mx-auto">
          <button
            onClick={onBack}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            ← Back
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className={`flex-[2] py-2.5 rounded-xl text-sm font-medium transition-colors ${
              canConfirm
                ? 'bg-gray-900 text-white hover:bg-gray-700'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            Start Reviewing →
          </button>
        </div>
      </div>
    </div>
  );
}
