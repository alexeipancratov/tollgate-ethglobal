import { describe, it, expect } from "vitest";
import { privateKeyToAccount } from "viem/accounts";
import { recoverTypedDataAddress } from "viem";
import { buildApprovalTypedData } from "../../../shared/approval-typed-data";
import { assembleSignature } from "./sig";
import type { Action } from "../../../shared/types";

// Well-known Anvil test key #1 — TEST ONLY.
const account = privateKeyToAccount(
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
);
const action: Action = {
  id: "a1",
  description: "purchase dataset license",
  amount: 12.5,
  counterparty: null,
  createdAt: 1000,
};
const td = buildApprovalTypedData(action, "ap1", 1);

function recover(signature: `0x${string}`) {
  return recoverTypedDataAddress({
    domain: td.domain,
    types: td.types,
    primaryType: td.primaryType,
    message: td.message,
    signature,
  });
}

// Produce a reference signature with viem, then split into Ledger-style {r,s,v}.
async function refRSV() {
  const full = await account.signTypedData({
    domain: td.domain,
    types: td.types,
    primaryType: td.primaryType,
    message: td.message,
  });
  return {
    r: ("0x" + full.slice(2, 66)) as `0x${string}`,
    s: ("0x" + full.slice(66, 130)) as `0x${string}`,
    v: parseInt(full.slice(130, 132), 16), // 27 or 28
  };
}

describe("assembleSignature", () => {
  it("assembles {r,s,v} into a signature that recovers to the signer", async () => {
    const { r, s, v } = await refRSV();
    const recovered = await recover(assembleSignature({ r, s, v }));
    expect(recovered.toLowerCase()).toBe(account.address.toLowerCase());
  });

  it("normalizes v=0/1 (as some Ledger firmware returns) to 27/28", async () => {
    const { r, s, v } = await refRSV();
    const recovered = await recover(assembleSignature({ r, s, v: v - 27 }));
    expect(recovered.toLowerCase()).toBe(account.address.toLowerCase());
  });
});
