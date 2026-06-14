// The policy engine (constitution Principle III). PURE: (action, state) -> result.
// No I/O, no SDK calls, no DB access. This slice implements the FIRST rule of the
// rule stack — a per-action spending cap. The remaining rules (budget window,
// velocity, per-counterparty) extend this in a later slice without changing the
// signature. The threshold is injected via `state`, so the policy reads no config.
import type { Action, DecisionOutcome, PolicyId } from "../../../shared/types";

/** Rolling state the rule stack reads. This slice uses the per-action threshold. */
export interface PolicyState {
  perActionThreshold: number;
  // future: spentInWindow, recentCount, perCounterparty, ...
}

export interface PolicyResult {
  outcome: DecisionOutcome;
  policy: PolicyId;
}

/**
 * Decide an action against policy. Pure and deterministic. An amount strictly
 * above the per-action threshold escalates; at or below proceeds. The gate stamps
 * actionId/decidedAt around this result.
 */
export function evaluatePolicy(action: Action, state: PolicyState): PolicyResult {
  const outcome: DecisionOutcome =
    action.amount > state.perActionThreshold ? "escalate" : "proceed";
  return { outcome, policy: "per-action-cap" };
}
