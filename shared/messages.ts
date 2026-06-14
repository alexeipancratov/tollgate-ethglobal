// Wire-contract schemas (Zod) validated on both ends. See contracts/.
// Types are derived from the schemas so the wire format has one source of truth.
import { z } from "zod";

export const actionSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  amount: z.number().nonnegative(),
  counterparty: z.string().nullable(),
  createdAt: z.number(),
});

export const decisionSchema = z.object({
  actionId: z.string().min(1),
  outcome: z.enum(["proceed", "escalate"]),
  policy: z.literal("per-action-cap"),
  decidedAt: z.number(),
});

export const pendingApprovalSchema = z.object({
  id: z.string().min(1),
  actionId: z.string().min(1),
  status: z.enum(["pending", "approved", "rejected"]),
  createdAt: z.number(),
  resolvedAt: z.number().nullable(),
  action: actionSchema,
});

// --- Feed events (decision | resolution) ---
export const decisionFeedEventSchema = z.object({
  type: z.literal("decision"),
  action: actionSchema,
  decision: decisionSchema,
  seq: z.number(),
  approvalId: z.string().min(1).optional(),
});
export const resolutionFeedEventSchema = z.object({
  type: z.literal("resolution"),
  approvalId: z.string().min(1),
  actionId: z.string().min(1),
  outcome: z.enum(["approved", "rejected"]),
  seq: z.number(),
  resolvedAt: z.number(),
});
export const feedEventSchema = z.discriminatedUnion("type", [
  decisionFeedEventSchema,
  resolutionFeedEventSchema,
]);

// --- agent -> backend ---
export const clearanceRequestSchema = z.object({ action: actionSchema });
export const clearanceResponseSchema = z.object({
  decision: decisionSchema,
  approvalId: z.string().min(1).optional(), // present only when outcome is "escalate"
});

// --- human -> backend (stub resolution) ---
export const resolveRequestSchema = z.object({
  outcome: z.enum(["approve", "reject"]),
});

// approval status / resolve responses
export const approvalResponseSchema = z.object({ approval: pendingApprovalSchema });
export const approvalsListResponseSchema = z.object({
  approvals: z.array(pendingApprovalSchema),
});

// signed approval (slice 003): client sends only the signature; backend rebuilds
// and verifies the typed data.
export const approveSignedRequestSchema = z.object({
  signature: z.string().regex(/^0x[0-9a-fA-F]+$/),
});
export const signingCancelledRequestSchema = z.object({
  reason: z.enum(["declined", "disconnected"]).optional(),
});

export type ApproveSignedRequest = z.infer<typeof approveSignedRequestSchema>;
export type SigningCancelledRequest = z.infer<typeof signingCancelledRequestSchema>;

// --- backend -> console ---
export const snapshotMessageSchema = z.object({
  type: z.literal("snapshot"),
  events: z.array(feedEventSchema),
});
export const eventMessageSchema = z.object({
  type: z.literal("event"),
  event: feedEventSchema,
});
export const serverMessageSchema = z.discriminatedUnion("type", [
  snapshotMessageSchema,
  eventMessageSchema,
]);

export type ClearanceRequest = z.infer<typeof clearanceRequestSchema>;
export type ClearanceResponse = z.infer<typeof clearanceResponseSchema>;
export type ResolveRequest = z.infer<typeof resolveRequestSchema>;
export type ServerMessage = z.infer<typeof serverMessageSchema>;
