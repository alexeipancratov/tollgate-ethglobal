// The gate: the one path that turns a clearance request into a decision. Enforces
// the trust boundary (Principle II) — it evaluates the pure policy, records the
// decision (so history is the source of truth, SC-004), then publishes the event.
import { clearanceRequestSchema } from "../../shared/messages";
import type { ClearanceResponse } from "../../shared/messages";
import type { Action, ClearanceDecision, FeedEvent } from "../../shared/types";
import { passThroughPolicy } from "./policy/index";
import { record } from "./store/store";
import { broadcast } from "./events";

/** Handle one clearance request. Throws if the body is invalid (caller -> 400). */
export function handleClearance(body: unknown): ClearanceResponse {
  const { action } = clearanceRequestSchema.parse(body);
  const a: Action = action;

  const result = passThroughPolicy(a, {});
  const decision: ClearanceDecision = {
    actionId: a.id,
    outcome: result.outcome,
    policy: result.policy,
    decidedAt: Date.now(),
  };

  const seq = record(a, decision); // persist before publishing
  const event: FeedEvent = { type: "decision", action: a, decision, seq };
  broadcast(event);

  return { decision };
}
