// The policy engine (constitution Principle III). PURE: (action, state) -> result.
// No I/O, no SDK calls, no DB access. In this scaffold it is a pass-through stub;
// the rule stack (per-action cap, budget window, velocity, per-counterparty) is a
// later slice that extends this signature without changing it.
import type { Action, DecisionOutcome, PolicyId } from "../../../shared/types";

/** Rolling state the rule stack will read. Unused by the pass-through stub. */
export interface PolicyState {
  // future: spentInWindow, recentCount, perCounterparty, ...
}

export interface PolicyResult {
  outcome: DecisionOutcome;
  policy: PolicyId;
}

/**
 * Decide an action against policy. Pure and deterministic: same input -> same
 * output, no side effects. The gate stamps actionId/decidedAt around this result.
 */
export function passThroughPolicy(_action: Action, _state: PolicyState): PolicyResult {
  return { outcome: "proceed", policy: "pass-through" };
}
