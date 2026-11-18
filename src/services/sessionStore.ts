/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Task 5 / Milestone 4 - Local session store.
 *
 * Keeps a browser-side copy of every finished negotiation so analytics keep
 * working when the PostgreSQL API is not running (e.g. plain `npm run dev`).
 * The dashboard merges these with sessions loaded from the API.
 */

import type { SessionRecord } from './analyticsEngine.ts';

const STORAGE_KEY = 'negotiateai.sessions.v1';
const MAX_LOCAL_SESSIONS = 200;

const hasStorage = () => {
  try {
    return typeof localStorage !== 'undefined';
  } catch {
    return false;
  }
};

export function newSessionId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function loadLocalSessions(): SessionRecord[] {
  if (!hasStorage()) return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? (parsed as SessionRecord[]) : [];
  } catch {
    return [];
  }
}

export function saveLocalSession(record: SessionRecord): void {
  if (!hasStorage()) return;
  try {
    const all = [record, ...loadLocalSessions().filter((s) => s.id !== record.id)].slice(0, MAX_LOCAL_SESSIONS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    /* storage full or blocked: analytics simply fall back to the API */
  }
}

export function saveLocalSessions(records: SessionRecord[]): void {
  records.forEach(saveLocalSession);
}

export function clearLocalSessions(): void {
  if (!hasStorage()) return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Merge several session lists, removing duplicate ids. Earlier lists win. */
export function mergeSessions(...lists: SessionRecord[][]): SessionRecord[] {
  const seen = new Map<string, SessionRecord>();
  for (const list of lists) for (const s of list) if (!seen.has(s.id)) seen.set(s.id, s);
  return [...seen.values()];
}
