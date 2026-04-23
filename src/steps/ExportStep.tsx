import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import type { ReviewRow } from '../lib/types';
import { exportCSV } from '../lib/csv';
import type { ColumnMap } from '../lib/types';

interface Props {
  rows: ReviewRow[];
  headers: string[];
  colMap: ColumnMap;
  onRestart: () => void;
  onBackToReview: () => void;
}

export function ExportStep({ rows, headers, colMap, onRestart, onBackToReview }: Props) {
  useEffect(() => {
    const end = Date.now() + 2000;
    const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

    const frame = () => {
      confetti({
        particleCount: 6,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors,
      });
      confetti({
        particleCount: 6,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors,
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, []);
  const approved = rows.filter(r => r.status === 'approved').length;
  const edited = rows.filter(r => r.status === 'edited').length;
  const skipped = rows.filter(r => r.status === 'skipped').length;
  const invalid = rows.filter(r => r.status === 'invalid').length;
  const pending = rows.filter(r => r.status === 'pending').length;
  const total = rows.length;
  const reviewed = approved + edited;

  const handleExport = () => {
    exportCSV(rows, colMap, headers);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 p-12">
      <div className="text-center">
        <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Review complete</h1>
        <p className="text-gray-500 text-sm">
          {reviewed} of {total} rows reviewed
        </p>
      </div>

      <div className="grid grid-cols-5 gap-3 w-full max-w-xl">
        <StatCard label="Approved" value={approved} color="green" />
        <StatCard label="Edited" value={edited} color="blue" />
        <StatCard label="Skipped" value={skipped} color="gray" />
        <StatCard label="Invalid" value={invalid} color="red" />
        <StatCard label="Pending" value={pending} color="yellow" />
      </div>

      <div className="w-full max-w-xl bg-white rounded-2xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">What's exported</h3>
        <ul className="space-y-2 text-sm text-gray-500">
          <li className="flex items-start gap-2">
            <span className="text-green-500 mt-0.5">✓</span>
            All original columns preserved unchanged
          </li>
          {colMap.personalisedLine && (
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <code className="bg-gray-100 px-1 rounded text-xs">{colMap.personalisedLine}</code> column preserved with original AI text
            </li>
          )}
          <li className="flex items-start gap-2">
            <span className="text-green-500 mt-0.5">✓</span>
            New <code className="bg-gray-100 px-1 rounded text-xs">accepted_personalised_line</code> column with your reviewed lines
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-500 mt-0.5">✓</span>
            New <code className="bg-gray-100 px-1 rounded text-xs">review_status</code> column (approved / edited / skipped / pending)
          </li>
        </ul>
      </div>

      <div className="flex gap-3 w-full max-w-xl">
        <button
          onClick={onRestart}
          className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Start over
        </button>
        <button
          onClick={onBackToReview}
          className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to review
        </button>
        <button
          onClick={handleExport}
          className="flex-[2] py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download CSV
        </button>
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  color: 'green' | 'blue' | 'gray' | 'yellow' | 'red';
}

const colorMap: Record<StatCardProps['color'], string> = {
  green: 'bg-green-50 border-green-100 text-green-700',
  blue: 'bg-blue-50 border-blue-100 text-blue-700',
  gray: 'bg-gray-50 border-gray-200 text-gray-600',
  yellow: 'bg-yellow-50 border-yellow-100 text-yellow-700',
  red: 'bg-red-50 border-red-100 text-red-600',
};

function StatCard({ label, value, color }: StatCardProps) {
  return (
    <div className={`rounded-xl border p-4 text-center ${colorMap[color]}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs font-medium mt-0.5 opacity-75">{label}</div>
    </div>
  );
}
