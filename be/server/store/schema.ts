// Drizzle schema mirroring data-model.md. Tables are created via DDL in
// store.ts initStore(); this schema is used for typed queries.
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const actions = sqliteTable("actions", {
  id: text("id").primaryKey(),
  description: text("description").notNull(),
  amount: real("amount").notNull(),
  counterparty: text("counterparty"),
  createdAt: integer("created_at").notNull(),
});

export const decisions = sqliteTable("decisions", {
  seq: integer("seq").primaryKey({ autoIncrement: true }),
  actionId: text("action_id")
    .notNull()
    .references(() => actions.id),
  outcome: text("outcome").notNull(), // "proceed" | "escalate"
  policy: text("policy").notNull(),
  decidedAt: integer("decided_at").notNull(),
});

// A held action awaiting a human decision (this slice).
export const approvals = sqliteTable("approvals", {
  id: text("id").primaryKey(),
  actionId: text("action_id")
    .notNull()
    .references(() => actions.id),
  status: text("status").notNull(), // "pending" | "approved" | "rejected"
  createdAt: integer("created_at").notNull(),
  resolvedAt: integer("resolved_at"),
  // The originating decision's seq — carried on the resolution feed event so the
  // console can update the matching held row.
  seq: integer("seq").notNull(),
});
