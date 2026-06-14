import { describe, it, expect, beforeAll } from "vitest";
import { initStore, getApproval } from "./store/store";
import { handleClearance } from "./gate";
import { resolve } from "./approvals";
import type { Action } from "../../shared/types";

beforeAll(() => initStore(":memory:"));

const THRESHOLD = 5;
function action(id: string, amount: number): Action {
  return { id, description: "x", amount, counterparty: null, createdAt: Date.now() };
}

describe("gate escalate + resolution", () => {
  it("proceeds for a sub-threshold action (no approval created)", () => {
    const res = handleClearance({ action: action("a-small", 0.04) }, THRESHOLD);
    expect(res.decision.outcome).toBe("proceed");
    expect(res.approvalId).toBeUndefined();
  });

  it("escalates an over-threshold action and creates a pending approval", () => {
    const res = handleClearance({ action: action("a-big", 12.5) }, THRESHOLD);
    expect(res.decision.outcome).toBe("escalate");
    expect(typeof res.approvalId).toBe("string");
    expect(getApproval(res.approvalId!)?.status).toBe("pending");
  });

  it("resolves a pending approval exactly once (idempotent)", () => {
    const res = handleClearance({ action: action("a-2", 50) }, THRESHOLD);
    const id = res.approvalId!;
    const r1 = resolve(id, { outcome: "approve" });
    expect(r1.ok).toBe(true);
    const r2 = resolve(id, { outcome: "reject" });
    expect(r2.ok).toBe(false);
    if (!r2.ok) expect(r2.reason).toBe("already_resolved");
    expect(getApproval(id)?.status).toBe("approved"); // first outcome stands
  });

  it("reject leaves the action unperformed and marks the approval rejected", () => {
    const res = handleClearance({ action: action("a-3", 30) }, THRESHOLD);
    const r = resolve(res.approvalId!, { outcome: "reject" });
    expect(r.ok).toBe(true);
    expect(getApproval(res.approvalId!)?.status).toBe("rejected");
  });

  it("fails safely when resolving an unknown approval", () => {
    const r = resolve("does-not-exist", { outcome: "approve" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("not_found");
  });
});
