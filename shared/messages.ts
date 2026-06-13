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
  outcome: z.literal("proceed"),
  policy: z.literal("pass-through"),
  decidedAt: z.number(),
});

export const feedEventSchema = z.object({
  type: z.literal("decision"),
  action: actionSchema,
  decision: decisionSchema,
  seq: z.number(),
});

// agent -> backend
export const clearanceRequestSchema = z.object({ action: actionSchema });
export const clearanceResponseSchema = z.object({ decision: decisionSchema });

// backend -> console
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
export type ServerMessage = z.infer<typeof serverMessageSchema>;
