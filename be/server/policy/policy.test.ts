import { describe, it, expect } from "vitest";
import { passThroughPolicy } from "./index";
import type { Action } from "../../../shared/types";

const action: Action = {
  id: "a1",
  description: "call premium API",
  amount: 0.04,
  counterparty: null,
  createdAt: 1,
};

describe("passThroughPolicy", () => {
  it("returns proceed via the pass-through policy", () => {
    expect(passThroughPolicy(action, {})).toEqual({
      outcome: "proceed",
      policy: "pass-through",
    });
  });

  it("approves a large action too (no caps in this slice)", () => {
    expect(passThroughPolicy({ ...action, amount: 9999 }, {}).outcome).toBe("proceed");
  });

  it("is pure: same input -> same output, and does not mutate inputs", () => {
    const a: Action = { ...action };
    const snapshot = { ...action };
    const r1 = passThroughPolicy(a, {});
    const r2 = passThroughPolicy(a, {});
    expect(r1).toEqual(r2);
    expect(a).toEqual(snapshot); // input untouched
  });
});
