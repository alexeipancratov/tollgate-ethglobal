// Core domain types shared by the agent, the backend gate, and the web console.
// The only surface the three sides share. See data-model.md.

/** A single mocked unit of sensitive work the agent wants to perform. */
export interface Action {
  id: string;
  description: string;
  amount: number;
  counterparty: string | null;
  createdAt: number; // epoch ms
}

// Widened in later slices (e.g. "escalate"). Kept narrow for the scaffold.
export type DecisionOutcome = "proceed";
export type PolicyId = "pass-through";

/** The gate's decision for an action. */
export interface ClearanceDecision {
  actionId: string;
  outcome: DecisionOutcome;
  policy: PolicyId;
  decidedAt: number; // epoch ms
}

/** What is streamed to consoles for display: an action + its decision. */
export interface FeedEvent {
  type: "decision";
  action: Action;
  decision: ClearanceDecision;
  seq: number; // monotonic server-assigned ordering
}
