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

// A held action awaiting a human decision.
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
  // Set when released via a verified signed approval (slice 003).
  signature: text("signature"),
  signer: text("signer"),
});

// Audit trail of approval signing attempts (slice 003).
export const approvalEvents = sqliteTable("approval_events", {
  seq: integer("seq").primaryKey({ autoIncrement: true }),
  approvalId: text("approval_id").notNull(),
  kind: text("kind").notNull(), // "signed_approved" | "verification_failed" | "signing_cancelled"
  signatureHash: text("signature_hash"),
  signer: text("signer"),
  at: integer("at").notNull(),
});
