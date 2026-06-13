import { describe, it, expect, beforeAll } from "vitest";
import { initStore } from "./store/store";
import { handleClearance } from "./gate";

beforeAll(() => initStore(":memory:"));

describe("handleClearance", () => {
  it("returns proceed for a valid request", () => {
    const res = handleClearance({
      action: {
        id: "t1",
        description: "call premium API",
        amount: 0.04,
        counterparty: null,
        createdAt: Date.now(),
      },
    });
    expect(res.decision.outcome).toBe("proceed");
    expect(res.decision.policy).toBe("pass-through");
    expect(res.decision.actionId).toBe("t1");
  });

  it("throws on an invalid body (missing amount)", () => {
    expect(() =>
      handleClearance({
        action: { id: "t2", description: "x", counterparty: null, createdAt: 1 },
      }),
    ).toThrow();
  });
});
