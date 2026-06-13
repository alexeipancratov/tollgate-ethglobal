// Persistence (SQLite via Drizzle + better-sqlite3). Records every action and its
// decision so history survives a restart (FR-007) and serves the late-joiner
// snapshot (US3). The decision `seq` (autoincrement) is the canonical ordering.
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq, desc } from "drizzle-orm";
import { actions, decisions } from "./schema";
import type { Action, ClearanceDecision, FeedEvent } from "../../../shared/types";

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
  `);
  db = drizzle(sqlite);
}

function requireDb(): NonNullable<typeof db> {
  if (!db) throw new Error("store not initialized — call initStore() first");
  return db;
}

/** Persist an action + its decision; returns the assigned monotonic seq. */
export function record(action: Action, decision: ClearanceDecision): number {
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

/** Most recent `limit` events, oldest -> newest (snapshot order for US3). */
export function recentHistory(limit: number): FeedEvent[] {
  const d = requireDb();
  const rows = d
    .select()
    .from(decisions)
    .innerJoin(actions, eq(decisions.actionId, actions.id))
    .orderBy(desc(decisions.seq))
    .limit(limit)
    .all();

  return rows
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
}
