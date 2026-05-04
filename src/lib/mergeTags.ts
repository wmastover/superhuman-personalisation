import type { ColumnMap, ReviewRow } from './types';

/**
 * Instantly-style merge tag handling: `{{firstName}}`, `{{firstName | there}}`, custom
 * `{{ColumnHeader}}`, plus a few legacy aliases (`{{name}}`, `{{company}}`,
 * `{{personalised_line}}`) so older sessions/templates keep rendering.
 *
 * Spintax (`{{RANDOM | a | b}}`) is recognised so it isn't surfaced as an editable variable,
 * but spintax substitution itself is out of scope.
 */

export type MergeSlot =
  | 'firstName'
  | 'companyName'
  | 'jobTitle'
  | 'personalization'
  | 'linkedin'
  | 'custom';

export interface MergeField {
  /** The full original tag including braces, e.g. `{{firstName | there}}`. */
  raw: string;
  /** Variable name before the optional `|` fallback, trimmed. */
  core: string;
  /** Optional fallback text after the first `|`, trimmed. */
  fallback?: string;
  /** Logical slot this tag maps to, or `custom` for column-header-matched vars. */
  slot: MergeSlot;
  /** CSV header key that backs this tag on the current `ReviewRow`, if any. */
  rawKey?: string;
}

const TAG_REGEX = /\{\{([^{}]+)\}\}/g;

/** Sentinel inserted in place of the personalization tag during preview substitution. */
export const PERSONALIZATION_SENTINEL = '\u0000__PERSONALIZATION__\u0000';

/** Predefined Instantly tag names and the legacy aliases we still support. */
const SLOT_BY_TAG: Record<string, Exclude<MergeSlot, 'custom'>> = {
  firstName: 'firstName',
  name: 'firstName',
  companyName: 'companyName',
  company: 'companyName',
  jobTitle: 'jobTitle',
  Personalization: 'personalization',
  personalised_line: 'personalization',
  personalized_line: 'personalization',
  LinkedIn: 'linkedin',
  linkedinUrl: 'linkedin',
};

/** Splits the inner of a tag on its first `|` into `core` and optional `fallback`. */
export function parseMergeInner(inner: string): { core: string; fallback?: string } {
  const pipe = inner.indexOf('|');
  if (pipe === -1) return { core: inner.trim() };
  return {
    core: inner.slice(0, pipe).trim(),
    fallback: inner.slice(pipe + 1).trim(),
  };
}

function classify(core: string): Exclude<MergeSlot, 'custom'> | undefined {
  return SLOT_BY_TAG[core];
}

function rawKeyFor(slot: MergeSlot, core: string, row: ReviewRow, colMap: ColumnMap): string | undefined {
  switch (slot) {
    case 'firstName':
      return colMap.name;
    case 'companyName':
      return colMap.company;
    case 'jobTitle':
      return colMap.jobTitle;
    case 'personalization':
      return colMap.personalisedLine;
    case 'linkedin':
      return colMap.linkedinUrl;
    case 'custom':
      return Object.prototype.hasOwnProperty.call(row.raw, core) ? core : undefined;
  }
}

/**
 * Extracts unique, ordered merge fields from the template. Spintax (`{{RANDOM | …}}`) is
 * filtered out so it never appears in the editable variable list.
 */
export function extractMergeFields(template: string, row: ReviewRow, colMap: ColumnMap): MergeField[] {
  const seen = new Set<string>();
  const out: MergeField[] = [];
  TAG_REGEX.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TAG_REGEX.exec(template)) !== null) {
    const raw = m[0];
    if (seen.has(raw)) continue;
    seen.add(raw);
    const { core, fallback } = parseMergeInner(m[1]);
    if (!core || core.toUpperCase() === 'RANDOM') continue;
    const slot: MergeSlot = classify(core) ?? 'custom';
    out.push({ raw, core, fallback, slot, rawKey: rawKeyFor(slot, core, row, colMap) });
  }
  return out;
}

/** Returns the current resolved value for a field (without applying its fallback). */
export function resolveMergeValue(field: MergeField, row: ReviewRow): string {
  switch (field.slot) {
    case 'firstName':
      return row.name;
    case 'companyName':
      return row.company;
    case 'jobTitle':
      return row.jobTitle;
    case 'personalization':
      return row.personalisedLine;
    case 'linkedin':
      return row.linkedinUrl;
    case 'custom':
      return field.rawKey ? row.raw[field.rawKey] ?? '' : '';
  }
}

/** Resolved value with fallback applied (for preview rendering). */
export function resolveForPreview(field: MergeField, row: ReviewRow): string {
  const value = resolveMergeValue(field, row);
  if (value && value.trim() !== '') return value;
  return field.fallback ?? '';
}

/**
 * Substitutes all non-personalization tags in `template` with their resolved preview values
 * and replaces every personalization tag with `PERSONALIZATION_SENTINEL`, so callers can
 * split on the sentinel to render a custom editor in place of the line.
 */
export function substituteWithPersonalizationSentinel(
  template: string,
  row: ReviewRow,
  colMap: ColumnMap,
): string {
  return template.replace(TAG_REGEX, (match, inner: string) => {
    const { core, fallback } = parseMergeInner(inner);
    if (!core || core.toUpperCase() === 'RANDOM') return match;
    const slot: MergeSlot = classify(core) ?? 'custom';
    if (slot === 'personalization') return PERSONALIZATION_SENTINEL;
    const field: MergeField = {
      raw: match,
      core,
      fallback,
      slot,
      rawKey: rawKeyFor(slot, core, row, colMap),
    };
    return resolveForPreview(field, row);
  });
}

/**
 * Builds a `ReviewRow` patch for an edit to a merge field. Mapped slots (`firstName`,
 * `companyName`, …) write both the scalar and the underlying CSV column on `raw`; custom
 * tags write straight into `raw` for the matching header.
 */
export function buildMergeEditPatch(
  field: MergeField,
  newValue: string,
  row: ReviewRow,
): Partial<ReviewRow> {
  const patch: Partial<ReviewRow> = {};
  const writeRaw = (key: string | undefined) => {
    if (!key) return;
    patch.raw = { ...(patch.raw ?? row.raw), [key]: newValue };
  };

  switch (field.slot) {
    case 'firstName':
      patch.name = newValue;
      writeRaw(field.rawKey);
      break;
    case 'companyName':
      patch.company = newValue;
      writeRaw(field.rawKey);
      break;
    case 'jobTitle':
      patch.jobTitle = newValue;
      writeRaw(field.rawKey);
      break;
    case 'personalization':
      patch.personalisedLine = newValue;
      break;
    case 'linkedin':
      patch.linkedinUrl = newValue;
      writeRaw(field.rawKey);
      break;
    case 'custom':
      writeRaw(field.rawKey);
      break;
  }
  return patch;
}
