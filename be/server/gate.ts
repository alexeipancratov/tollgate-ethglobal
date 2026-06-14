// The gate: the one path that turns a clearance request into a decision. Enforces
// the trust boundary (Principle II). It evaluates the pure policy, records the
// decision, publishes the event, and — when the decision is `escalate` — creates a
// pending approval and HOLDS the action (returns an approvalId, not a release).
import { clearanceRequestSchema } from "../../shared/messages";
import type { ClearanceResponse } from "../../shared/messages";
import type { Action, ClearanceDecision, DecisionFeedEvent } from "../../shared/types";
import { evaluatePolicy } from "./policy/index";
import { recordDecision, createApproval } from "./store/store";
import { broadcast } from "./events";

/** Handle one clearance request. Throws if the body is invalid (caller -> 400). */
export function handleClearance(body: unknown, perActionThreshold: number): ClearanceResponse {
  const { action } = clearanceRequestSchema.parse(body);
  const a: Action = action;

  const result = evaluatePolicy(a, { perActionThreshold });
  const decision: ClearanceDecision = {
    actionId: a.id,
    outcome: result.outcome,
    policy: result.policy,
    decidedAt: Date.now(),
  };

  const seq = recordDecision(a, decision); // persist before publishing

  if (decision.outcome === "escalate") {
    const approvalId = createApproval(a.id, seq); // hold; not released until resolved
    const event: DecisionFeedEvent = { type: "decision", action: a, decision, seq, approvalId };
    broadcast(event);
    return { decision, approvalId };
  }

  const event: DecisionFeedEvent = { type: "decision", action: a, decision, seq };
  broadcast(event);
  return { decision };
}
