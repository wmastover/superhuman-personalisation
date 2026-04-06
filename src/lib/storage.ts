import type { AppStep, ColumnMap, ReviewRow, RawRow } from './types';

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
