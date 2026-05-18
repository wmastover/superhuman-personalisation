import type { AppStep, ColumnMap, Reason, ReviewRow, RawRow } from './types';

export interface SavedSession {
  id: string;
  name: string;
  savedAt: number;
  step: AppStep;
  rawRows: RawRow[];
  headers: string[];
  colMap: ColumnMap | null;
  rows: ReviewRow[];
  template: string;
  cursor: number;
}

const SESSIONS_KEY = 'personalisation_sessions';
const INVALID_REASONS_KEY = 'personalisation_invalid_reasons';
const EDIT_REASONS_KEY = 'personalisation_edit_reasons';

export function listSessions(): SavedSession[] {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    return raw ? (JSON.parse(raw) as SavedSession[]) : [];
  } catch {
    return [];
  }
}

export function saveSession(session: SavedSession): void {
  const sessions = listSessions();
  const idx = sessions.findIndex(s => s.id === session.id);
  if (idx >= 0) {
    sessions[idx] = session;
  } else {
    sessions.unshift(session);
  }
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  } catch {
    // Storage quota exceeded — fail silently
  }
}

export function deleteSession(id: string): void {
  const sessions = listSessions().filter(s => s.id !== id);
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  } catch {
    // ignore
  }
}

function loadReasonsByKey(key: string): Reason[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Reason[]) : [];
  } catch {
    return [];
  }
}

function listReasonsByKey(key: string): Reason[] {
  return [...loadReasonsByKey(key)].sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.text.localeCompare(b.text);
  });
}

function incrementReasonCountByKey(key: string, text: string): void {
  const trimmed = text.trim();
  if (!trimmed) return;
  const reasons = loadReasonsByKey(key);
  const idx = reasons.findIndex(r => r.text.toLowerCase() === trimmed.toLowerCase());
  if (idx >= 0) {
    reasons[idx] = { ...reasons[idx], count: reasons[idx].count + 1 };
  } else {
    reasons.push({ text: trimmed, count: 1 });
  }
  try {
    localStorage.setItem(key, JSON.stringify(reasons));
  } catch {
    // ignore
  }
}

export function listInvalidReasons(): Reason[] {
  return listReasonsByKey(INVALID_REASONS_KEY);
}

export function incrementInvalidReasonCount(text: string): void {
  incrementReasonCountByKey(INVALID_REASONS_KEY, text);
}

export function listEditReasons(): Reason[] {
  return listReasonsByKey(EDIT_REASONS_KEY);
}

export function incrementEditReasonCount(text: string): void {
  incrementReasonCountByKey(EDIT_REASONS_KEY, text);
}
