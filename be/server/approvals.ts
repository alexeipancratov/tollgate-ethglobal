// Resolution orchestration (the human-approval STUB). Resolving a pending approval
// updates its status, broadcasts a resolution feed event, and reports the outcome.
// This is the single seam the Ledger hardware signature replaces later (device-last):
// approve here is a plain authorization record, not a cryptographic signature.
import type { ResolveRequest } from "../../shared/messages";
import type {
  PendingApproval,
  ResolutionFeedEvent,
  ResolutionOutcome,
} from "../../shared/types";
import { resolveApproval } from "./store/store";
import { broadcast } from "./events";

export type ResolveOutcome =
  | { ok: true; approval: PendingApproval }
  | { ok: false; reason: "not_found" | "already_resolved" };

/** Resolve a pending approval (approve/reject). Idempotent (FR-011/FR-012). */
export function resolve(id: string, req: ResolveRequest): ResolveOutcome {
  const status: ResolutionOutcome = req.outcome === "approve" ? "approved" : "rejected";
  const res = resolveApproval(id, status);
  if (!res.ok) return res;

  const event: ResolutionFeedEvent = {
    type: "resolution",
    approvalId: res.approval.id,
    actionId: res.approval.actionId,
    outcome: status,
    seq: res.seq,
    resolvedAt: res.approval.resolvedAt ?? Date.now(),
  };
  broadcast(event);

  return { ok: true, approval: res.approval };
}
