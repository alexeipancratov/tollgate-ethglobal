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

// Widened in later slices. This slice adds "escalate" (the per-action-cap rule).
export type DecisionOutcome = "proceed" | "escalate";
export type PolicyId = "per-action-cap";
export type ResolutionOutcome = "approved" | "rejected";

/** The gate's decision for an action. */
export interface ClearanceDecision {
  actionId: string;
  outcome: DecisionOutcome;
  policy: PolicyId;
  decidedAt: number; // epoch ms
}

/** A held action awaiting a human decision. */
export interface PendingApproval {
  id: string;
  actionId: string;
  status: "pending" | "approved" | "rejected";
  createdAt: number;
  resolvedAt: number | null;
  action: Action; // embedded for display / discoverability
}

/** Feed event: a decision (proceed/escalate) streamed for display. */
export interface DecisionFeedEvent {
  type: "decision";
  action: Action;
  decision: ClearanceDecision;
  seq: number;
  approvalId?: string; // present when outcome is "escalate" (held), for the console controls
}

/** Feed event: a held action's resolution (approved/rejected). */
export interface ResolutionFeedEvent {
  type: "resolution";
  approvalId: string;
  actionId: string;
  outcome: ResolutionOutcome;
  seq: number;
  resolvedAt: number;
}

/** What is streamed to consoles, ordered by `seq`. */
export type FeedEvent = DecisionFeedEvent | ResolutionFeedEvent;
