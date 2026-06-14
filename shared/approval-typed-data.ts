// The EIP-712 typed-data authorization for an approval. Built IDENTICALLY by the
// web console (to sign) and the backend (to verify) so the signature binds to the
// exact action — the backend rebuilds this from its own stored action, so the
// client cannot tamper with the signed values (anti-tamper / anti-replay).
//
// Off-chain only (Principle V): chainId merely feeds the domain separator; it is
// not a network we talk to. `amount` is encoded in minor units (cents) as an
// integer to avoid float ambiguity in the signed payload.
import type { Action } from "./types";

export interface ApprovalTypedData {
  domain: { name: string; version: string; chainId: number };
  types: { Approval: { name: string; type: string }[] };
  primaryType: "Approval";
  message: {
    approvalId: string;
    actionId: string;
    description: string;
    amount: bigint; // minor units (cents)
    counterparty: string;
    createdAt: bigint; // epoch ms
  };
}

/** Major units (e.g. dollars) -> integer minor units (cents). */
export function toMinorUnits(amount: number): bigint {
  return BigInt(Math.round(amount * 100));
}

export function buildApprovalTypedData(
  action: Action,
  approvalId: string,
  chainId: number,
): ApprovalTypedData {
  return {
    domain: { name: "Tollgate", version: "1", chainId },
    types: {
      Approval: [
        { name: "approvalId", type: "string" },
        { name: "actionId", type: "string" },
        { name: "description", type: "string" },
        { name: "amount", type: "uint256" },
        { name: "counterparty", type: "string" },
        { name: "createdAt", type: "uint256" },
      ],
    },
    primaryType: "Approval",
    message: {
      approvalId,
      actionId: action.id,
      description: action.description,
      amount: toMinorUnits(action.amount),
      counterparty: action.counterparty ?? "",
      createdAt: BigInt(action.createdAt),
    },
  };
}
