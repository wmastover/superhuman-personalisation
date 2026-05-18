import JSZip from 'jszip';
import Papa from 'papaparse';
import type { RawRow, ColumnMap, ReviewRow, ReviewStatus } from './types';

export function parseCSV(file: File): Promise<RawRow[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<RawRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => resolve(results.data),
      error: (err) => reject(err),
    });
  });
}

export function buildReviewRows(rawRows: RawRow[], colMap: ColumnMap): ReviewRow[] {
  return rawRows.map((raw, index) => {
    const original = colMap.personalisedLine ? (raw[colMap.personalisedLine] ?? '') : '';
    return {
      index,
      raw,
      personalisedLine: original,
      originalPersonalisedLine: original,
      domain: normaliseDomain(raw[colMap.domain] ?? ''),
      name: colMap.name ? (raw[colMap.name] ?? '') : '',
      company: colMap.company ? (raw[colMap.company] ?? '') : '',
      jobTitle: colMap.jobTitle ? (raw[colMap.jobTitle] ?? '') : '',
      linkedinUrl: colMap.linkedinUrl ? (raw[colMap.linkedinUrl] ?? '') : '',
      status: 'pending' as ReviewStatus,
    };
  });
}

function normaliseDomain(domain: string): string {
  const trimmed = domain.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  return `https://${trimmed}`;
}

function hostFromDomain(domain: string): string {
  const trimmed = domain.trim();
  if (!trimmed) return '';
  try {
    const u = new URL(
      trimmed.startsWith('http://') || trimmed.startsWith('https://') ? trimmed : `https://${trimmed}`
    );
    return u.hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return '';
  }
}

export function companyKeyForStaging(row: ReviewRow): string {
  const c = row.company.trim();
  if (c) return c.toLowerCase();
  const host = hostFromDomain(row.domain);
  if (host) return host;
  return `__row_${row.index}`;
}

/** Rows eligible for `stage-*.csv` (pending held back until reviewed). */
export function isRowIncludedInStagedExport(row: ReviewRow): boolean {
  return row.status !== 'pending';
}

/**
 * Splits leads into stages so the same company appears at most once per stage (round-robin).
 */
export function stageLeadsByCompany(rows: ReviewRow[]): ReviewRow[][] {
  if (rows.length === 0) return [];
  const order: string[] = [];
  const byCompany = new Map<string, ReviewRow[]>();
  for (const row of rows) {
    const k = companyKeyForStaging(row);
    if (!byCompany.has(k)) {
      byCompany.set(k, []);
      order.push(k);
    }
    byCompany.get(k)!.push(row);
  }
  const maxLen = order.reduce((m, k) => Math.max(m, byCompany.get(k)!.length), 0);
  const stages: ReviewRow[][] = [];
  for (let i = 0; i < maxLen; i++) {
    const stage: ReviewRow[] = [];
    for (const k of order) {
      const g = byCompany.get(k)!;
      if (g[i] !== undefined) stage.push(g[i]);
    }
    stages.push(stage);
  }
  return stages;
}

function buildExportOutput(
  rows: ReviewRow[],
  colMap: ColumnMap,
  originalHeaders: string[]
): { outputRows: RawRow[]; headers: string[] } {
  const outputRows = rows.map((row) => {
    const out: RawRow = { ...row.raw };
    if (colMap.personalisedLine) {
      // Preserve the original AI-generated text in the source column
      out[colMap.personalisedLine] = row.originalPersonalisedLine ?? row.personalisedLine;
    }
    out['accepted_personalised_line'] = row.personalisedLine;
    out['review_status'] = row.status;
    out['invalid_reason'] = row.status === 'invalid' ? (row.invalidReason ?? '') : '';
    out['edit_reason'] = row.status === 'edited' ? (row.editReason ?? '') : '';
    return out;
  });

  const headers = [...originalHeaders];
  if (!headers.includes('accepted_personalised_line')) {
    headers.push('accepted_personalised_line');
  }
  if (!headers.includes('review_status')) {
    headers.push('review_status');
  }
  if (!headers.includes('invalid_reason')) {
    headers.push('invalid_reason');
  }
  if (!headers.includes('edit_reason')) {
    headers.push('edit_reason');
  }

  return { outputRows, headers };
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportCSV(
  rows: ReviewRow[],
  colMap: ColumnMap,
  originalHeaders: string[]
): void {
  const { outputRows, headers } = buildExportOutput(rows, colMap, originalHeaders);
  const csv = Papa.unparse(outputRows, { columns: headers });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  triggerBlobDownload(blob, 'personalised_reviewed.csv');
}

/**
 * Zip of stage-01.csv … stage-NN.csv: non-pending rows only, split so the same company never
 * appears twice in one file. No download if there is nothing to stage (0 rows, or all pending).
 */
export async function exportStagedZip(
  rows: ReviewRow[],
  colMap: ColumnMap,
  originalHeaders: string[]
): Promise<void> {
  if (rows.length === 0) return;
  const forStages = rows.filter(isRowIncludedInStagedExport);
  if (forStages.length === 0) return;
  const stages = stageLeadsByCompany(forStages);
  if (stages.length === 0) return;

  const zip = new JSZip();
  const padW = Math.max(2, String(stages.length).length);
  for (let s = 0; s < stages.length; s++) {
    const { outputRows, headers } = buildExportOutput(stages[s], colMap, originalHeaders);
    const csv = Papa.unparse(outputRows, { columns: headers });
    const num = String(s + 1).padStart(padW, '0');
    zip.file(`stage-${num}.csv`, csv);
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  triggerBlobDownload(blob, 'personalised_staged.zip');
}
