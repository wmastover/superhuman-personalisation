import { useCallback, useEffect, useRef, useState } from 'react';
import type { AppStep, ColumnMap, ReviewRow, RawRow } from './lib/types';
import { DEFAULT_TEMPLATE } from './lib/types';
import { buildReviewRows } from './lib/csv';
import { saveSession, deleteSession } from './lib/storage';
import type { SavedSession } from './lib/storage';
import { UploadStep } from './steps/UploadStep';
import { MappingStep } from './steps/MappingStep';
import { ReviewStep } from './steps/ReviewStep';
import { ExportStep } from './steps/ExportStep';

export default function App() {
  const [step, setStep] = useState<AppStep>('upload');
  const [rawRows, setRawRows] = useState<RawRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [colMap, setColMap] = useState<ColumnMap | null>(null);
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [cursor, setCursor] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionName, setSessionName] = useState('');

  // Persist on every meaningful state change
  const saveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!sessionId) return;
    if (saveRef.current) clearTimeout(saveRef.current);
    saveRef.current = setTimeout(() => {
      saveSession({
        id: sessionId,
        name: sessionName,
        savedAt: Date.now(),
        step,
        rawRows,
        headers,
        colMap,
        rows,
        template,
        cursor,
      });
    }, 300);
    return () => {
      if (saveRef.current) clearTimeout(saveRef.current);
    };
  }, [step, rawRows, headers, colMap, rows, template, cursor, sessionId, sessionName]);

  const handleParsed = useCallback((parsed: RawRow[], hdrs: string[], filename: string) => {
    const id = crypto.randomUUID();
    setSessionId(id);
    setSessionName(filename);
    setRawRows(parsed);
    setHeaders(hdrs);
    setCursor(0);
    setStep('mapping');
  }, []);

  const handleMappingConfirm = useCallback((map: ColumnMap) => {
    setColMap(map);
    setRows(buildReviewRows(rawRows, map));
    setCursor(0);
    setStep('review');
  }, [rawRows]);

  const handleRowUpdate = useCallback((index: number, updates: Partial<ReviewRow>) => {
    setRows((prev) => {
      const updatedRow = { ...prev[index], ...updates };
      if (updates.status === 'edited' || updates.status === 'approved') {
        const lineChanged = updatedRow.personalisedLine !== updatedRow.originalPersonalisedLine;
        if (lineChanged) {
          return prev.map((r, i) => {
            if (i === index) return updatedRow;
            if (r.status === 'pending' && r.domain === updatedRow.domain) {
              return { ...r, personalisedLine: updatedRow.personalisedLine };
            }
            return r;
          });
        }
      }
      return prev.map((r, i) => (i === index ? updatedRow : r));
    });
  }, []);

  const handleFinish = useCallback(() => {
    setStep('export');
  }, []);

  const handleRestart = useCallback(() => {
    setSessionId(null);
    setSessionName('');
    setRawRows([]);
    setHeaders([]);
    setColMap(null);
    setRows([]);
    setTemplate(DEFAULT_TEMPLATE);
    setCursor(0);
    setStep('upload');
  }, [sessionId]);

  const handleLoadSession = useCallback((session: SavedSession) => {
    setSessionId(session.id);
    setSessionName(session.name);
    setRawRows(session.rawRows);
    setHeaders(session.headers);
    setColMap(session.colMap);
    setRows(session.rows.map((r) => ({ ...r, jobTitle: r.jobTitle ?? '' })));
    setTemplate(session.template);
    setCursor(session.cursor);
    // Archived (export-step) sessions reopen directly into review
    setStep(session.step === 'export' ? 'review' : session.step);
  }, []);

  const handleDeleteSession = useCallback((id: string) => {
    deleteSession(id);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {step === 'upload' && (
        <UploadStep
          onParsed={handleParsed}
          onLoadSession={handleLoadSession}
          onDeleteSession={handleDeleteSession}
        />
      )}

      {step === 'mapping' && (
        <MappingStep
          rows={rawRows}
          headers={headers}
          onConfirm={handleMappingConfirm}
          onBack={() => setStep('upload')}
        />
      )}

      {step === 'review' && (
        <ReviewStep
          rows={rows}
          cursor={cursor}
          onCursorChange={setCursor}
          template={template}
          onTemplateChange={setTemplate}
          onUpdate={handleRowUpdate}
          onFinish={handleFinish}
        />
      )}

      {step === 'export' && colMap && (
        <ExportStep
          rows={rows}
          headers={headers}
          colMap={colMap}
          onRestart={handleRestart}
          onBackToReview={() => setStep('review')}
        />
      )}
    </div>
  );
}
