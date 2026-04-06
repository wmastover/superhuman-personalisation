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
    const original = raw[colMap.personalisedLine] ?? '';
    return {
      index,
      raw,
      personalisedLine: original,
      originalPersonalisedLine: original,
      domain: normaliseDomain(raw[colMap.domain] ?? ''),
      name: colMap.name ? (raw[colMap.name] ?? '') : '',
      company: colMap.company ? (raw[colMap.company] ?? '') : '',
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

export function exportCSV(
  rows: ReviewRow[],
  colMap: ColumnMap,
  originalHeaders: string[]
): void {
  const outputRows = rows.map((row) => {
    const out: RawRow = { ...row.raw };
    // Preserve the original AI-generated text in the source column
    out[colMap.personalisedLine] = row.originalPersonalisedLine ?? row.personalisedLine;
    // Write the human-reviewed/accepted version to a separate column
    out['accepted_personalised_line'] = row.personalisedLine;
    out['review_status'] = row.status;
    return out;
  });

  let headers = [...originalHeaders];
  if (!headers.includes('accepted_personalised_line')) {
    headers.push('accepted_personalised_line');
  }
  if (!headers.includes('review_status')) {
    headers.push('review_status');
  }

  const csv = Papa.unparse(outputRows, { columns: headers });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'personalised_reviewed.csv';
  link.click();
  URL.revokeObjectURL(url);
}
