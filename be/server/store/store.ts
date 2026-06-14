// Persistence (SQLite via Drizzle + better-sqlite3). Records actions, decisions,
// and approvals so history survives restart (audit) and serves the late-joiner
// snapshot. The decision `seq` (autoincrement) is the canonical feed ordering.
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq, desc, asc, ne } from "drizzle-orm";
import { actions, decisions, approvals } from "./schema";
import type {
  Action,
  ClearanceDecision,
  FeedEvent,
  PendingApproval,
  ResolutionOutcome,
} from "../../../shared/types";

let db: ReturnType<typeof drizzle> | null = null;

export function initStore(path: string): void {
  if (path !== ":memory:") {
    mkdirSync(dirname(path), { recursive: true });
  }
  const sqlite = new Database(path);
  sqlite.pragma("journal_mode = WAL");
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS actions (
      id TEXT PRIMARY KEY,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      counterparty TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS decisions (
      seq INTEGER PRIMARY KEY AUTOINCREMENT,
      action_id TEXT NOT NULL REFERENCES actions(id),
      outcome TEXT NOT NULL,
      policy TEXT NOT NULL,
      decided_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS approvals (
      id TEXT PRIMARY KEY,
      action_id TEXT NOT NULL REFERENCES actions(id),
      status TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      resolved_at INTEGER,
      seq INTEGER NOT NULL
    );
  `);
  db = drizzle(sqlite);
}

function requireDb(): NonNullable<typeof db> {
  if (!db) throw new Error("store not initialized — call initStore() first");
  return db;
}

/** Persist an action + its decision; returns the assigned monotonic seq. */
export function recordDecision(action: Action, decision: ClearanceDecision): number {
  const d = requireDb();
  d.insert(actions)
    .values({
      id: action.id,
      description: action.description,
      amount: action.amount,
      counterparty: action.counterparty,
      createdAt: action.createdAt,
    })
    .run();
  const info = d
    .insert(decisions)
    .values({
      actionId: decision.actionId,
      outcome: decision.outcome,
      policy: decision.policy,
      decidedAt: decision.decidedAt,
    })
    .run();
  return Number(info.lastInsertRowid);
}

/** Create a pending approval for a held action; returns the approval id. */
export function createApproval(actionId: string, seq: number): string {
  const d = requireDb();
  const id = randomUUID();
  d.insert(approvals)
    .values({ id, actionId, status: "pending", createdAt: Date.now(), resolvedAt: null, seq })
    .run();
  return id;
}

function rowToApproval(a: typeof approvals.$inferSelect, action: Action): PendingApproval {
  return {
    id: a.id,
    actionId: a.actionId,
    status: a.status as PendingApproval["status"],
    createdAt: a.createdAt,
    resolvedAt: a.resolvedAt,
    action,
  };
}

export function getApproval(id: string): PendingApproval | null {
  const d = requireDb();
  const rows = d
    .select()
    .from(approvals)
    .innerJoin(actions, eq(approvals.actionId, actions.id))
    .where(eq(approvals.id, id))
    .all();
  const r = rows[0];
  if (!r) return null;
  return rowToApproval(r.approvals, r.actions);
}

/** Pending approvals (discoverability, FR-008), oldest first. */
export function listPending(): PendingApproval[] {
  const d = requireDb();
  return d
    .select()
    .from(approvals)
    .innerJoin(actions, eq(approvals.actionId, actions.id))
    .where(eq(approvals.status, "pending"))
    .orderBy(asc(approvals.createdAt))
    .all()
    .map((r) => rowToApproval(r.approvals, r.actions));
}

export type ResolveResult =
  | { ok: true; approval: PendingApproval; seq: number }
  | { ok: false; reason: "not_found" | "already_resolved" };

/** Resolve a pending approval exactly once (FR-011/FR-012). */
export function resolveApproval(id: string, status: ResolutionOutcome): ResolveResult {
  const d = requireDb();
  const existing = getApproval(id);
  if (!existing) return { ok: false, reason: "not_found" };
  if (existing.status !== "pending") return { ok: false, reason: "already_resolved" };

  const resolvedAt = Date.now();
  d.update(approvals).set({ status, resolvedAt }).where(eq(approvals.id, id)).run();

  const seqRow = d.select({ seq: approvals.seq }).from(approvals).where(eq(approvals.id, id)).all();
  return { ok: true, approval: { ...existing, status, resolvedAt }, seq: seqRow[0]!.seq };
}

/** Merged ordered feed history for the snapshot: decisions, then resolutions. */
export function recentHistory(limit: number): FeedEvent[] {
  const d = requireDb();

  const decisionRows = d
    .select()
    .from(decisions)
    .innerJoin(actions, eq(decisions.actionId, actions.id))
    .orderBy(desc(decisions.seq))
    .limit(limit)
    .all();

  const decisionEvents: FeedEvent[] = decisionRows
    .map((r): FeedEvent => ({
      type: "decision",
      action: {
        id: r.actions.id,
        description: r.actions.description,
        amount: r.actions.amount,
        counterparty: r.actions.counterparty,
        createdAt: r.actions.createdAt,
      },
      decision: {
        actionId: r.decisions.actionId,
        outcome: r.decisions.outcome as ClearanceDecision["outcome"],
        policy: r.decisions.policy as ClearanceDecision["policy"],
        decidedAt: r.decisions.decidedAt,
      },
      seq: r.decisions.seq,
    }))
    .reverse();

  const resolutionRows = d
    .select()
    .from(approvals)
    .where(ne(approvals.status, "pending"))
    .orderBy(asc(approvals.resolvedAt))
    .all();

  const resolutionEvents: FeedEvent[] = resolutionRows.map((a): FeedEvent => ({
    type: "resolution",
    approvalId: a.id,
    actionId: a.actionId,
    outcome: a.status as ResolutionOutcome,
    seq: a.seq,
    resolvedAt: a.resolvedAt ?? a.createdAt,
  }));

  return [...decisionEvents, ...resolutionEvents];
}
