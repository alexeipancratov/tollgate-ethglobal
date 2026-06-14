// Resolution orchestration (the human-approval STUB). Resolving a pending approval
// updates its status, broadcasts a resolution feed event, and reports the outcome.
// This is the single seam the Ledger hardware signature replaces later (device-last):
// approve here is a plain authorization record, not a cryptographic signature.
import { createHash } from "node:crypto";
import type { ResolveRequest } from "../../shared/messages";
import type {
  PendingApproval,
  ResolutionFeedEvent,
  ResolutionOutcome,
} from "../../shared/types";
import { buildApprovalTypedData } from "../../shared/approval-typed-data";
import { resolveApproval, recordSignedApproval, recordApprovalEvent } from "./store/store";
import { getApproval } from "./store/store";
import { verifyApprovalSignature, chainId } from "./verify";
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

export type VerifyApproveOutcome =
  | { ok: true; approval: PendingApproval }
  | { ok: false; reason: "not_found" | "already_resolved" | "signature_invalid" };

/**
 * Release a held action with a verified signed approval (slice 003). Rebuilds the
 * typed data from the STORED action (anti-tamper), recovers the signer, and only
 * releases if it matches the configured approver. The client supplies just the
 * signature.
 */
export async function verifyAndApprove(
  id: string,
  signature: `0x${string}`,
): Promise<VerifyApproveOutcome> {
  const approval = getApproval(id);
  if (!approval) return { ok: false, reason: "not_found" };
  if (approval.status !== "pending") return { ok: false, reason: "already_resolved" };

  const typedData = buildApprovalTypedData(approval.action, approval.id, chainId());
  const verified = await verifyApprovalSignature(typedData, signature);
  if (!verified.ok) {
    recordApprovalEvent(id, "verification_failed");
    return { ok: false, reason: "signature_invalid" };
  }

  const res = recordSignedApproval(id, signature, verified.signer);
  if (!res.ok) return res; // lost a race — not_found / already_resolved

  const signatureHash = createHash("sha256").update(signature).digest("hex");
  recordApprovalEvent(id, "signed_approved", { signatureHash, signer: verified.signer });

  const event: ResolutionFeedEvent = {
    type: "resolution",
    approvalId: res.approval.id,
    actionId: res.approval.actionId,
    outcome: "approved",
    seq: res.seq,
    resolvedAt: res.approval.resolvedAt ?? Date.now(),
  };
  broadcast(event);

  return { ok: true, approval: res.approval };
}

/** Record that signing was cancelled/declined (audit only; no state change). */
export function recordSigningCancelled(id: string): boolean {
  if (!getApproval(id)) return false;
  recordApprovalEvent(id, "signing_cancelled");
  return true;
}
