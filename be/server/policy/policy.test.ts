import { describe, it, expect } from "vitest";
import { evaluatePolicy } from "./index";
import type { Action } from "../../../shared/types";

const base: Action = {
  id: "a1",
  description: "call premium API",
  amount: 0.04,
  counterparty: null,
  createdAt: 1,
};
const state = { perActionThreshold: 5 };

describe("evaluatePolicy (per-action-cap)", () => {
  it("proceeds for an amount below the threshold", () => {
    expect(evaluatePolicy({ ...base, amount: 0.04 }, state)).toEqual({
      outcome: "proceed",
      policy: "per-action-cap",
    });
  });

  it("proceeds for an amount exactly at the threshold (only strictly-greater escalates)", () => {
    expect(evaluatePolicy({ ...base, amount: 5 }, state).outcome).toBe("proceed");
  });

  it("escalates for an amount above the threshold", () => {
    expect(evaluatePolicy({ ...base, amount: 12.5 }, state)).toEqual({
      outcome: "escalate",
      policy: "per-action-cap",
    });
  });

  it("is pure: same input -> same output, and does not mutate inputs", () => {
    const a: Action = { ...base, amount: 20 };
    const snapshot = { ...a };
    const r1 = evaluatePolicy(a, state);
    const r2 = evaluatePolicy(a, state);
    expect(r1).toEqual(r2);
    expect(a).toEqual(snapshot);
  });
});
