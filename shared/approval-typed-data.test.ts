import { describe, it, expect } from "vitest";
import { buildApprovalTypedData, toMinorUnits } from "./approval-typed-data";
import type { Action } from "./types";

const action: Action = {
  id: "a1",
  description: "call premium API",
  amount: 12.5,
  counterparty: null,
  createdAt: 1000,
};

describe("buildApprovalTypedData", () => {
  it("is deterministic for the same action + approvalId + chainId", () => {
    expect(buildApprovalTypedData(action, "ap1", 1)).toEqual(
      buildApprovalTypedData(action, "ap1", 1),
    );
  });

  it("encodes amount as integer minor units (cents)", () => {
    expect(toMinorUnits(12.5)).toBe(1250n);
    expect(buildApprovalTypedData(action, "ap1", 1).message.amount).toBe(1250n);
  });

  it("binds approvalId and actionId into the signed message", () => {
    const td = buildApprovalTypedData(action, "apX", 1);
    expect(td.message.approvalId).toBe("apX");
    expect(td.message.actionId).toBe("a1");
  });

  it("maps a null counterparty to an empty string", () => {
    expect(buildApprovalTypedData(action, "ap1", 1).message.counterparty).toBe("");
  });
});
