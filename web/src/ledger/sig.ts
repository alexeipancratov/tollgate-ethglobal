// Pure helpers for the real-device path. Kept separate from device I/O so they are
// unit-testable without hardware.
import type { ApprovalTypedData } from "../../../shared/approval-typed-data";

/**
 * Assemble a Ledger `{r,s,v}` into a 65-byte hex signature viem can recover.
 * Normalizes `v`: Ledger may return 0/1; viem expects 27/28.
 */
export function assembleSignature(sig: { r: string; s: string; v: number }): `0x${string}` {
  const v = sig.v < 27 ? sig.v + 27 : sig.v;
  const r = sig.r.replace(/^0x/, "");
  const s = sig.s.replace(/^0x/, "");
  return `0x${r}${s}${v.toString(16).padStart(2, "0")}`;
}

/**
 * Convert the shared EIP-712 payload into the shape the DMK Ethereum signer wants:
 * `EIP712Domain` must be declared in `types` (in the canonical field order viem
 * also uses), and uint256 values are passed as decimal strings (cross-encoder safe;
 * the resulting EIP-712 hash is identical to viem's, so the backend verifies it).
 */
export function toDmkTypedData(td: ApprovalTypedData) {
  return {
    domain: td.domain,
    primaryType: td.primaryType,
    types: {
      EIP712Domain: [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
      ],
      ...td.types,
    },
    message: {
      approvalId: td.message.approvalId,
      actionId: td.message.actionId,
      description: td.message.description,
      amount: td.message.amount.toString(),
      counterparty: td.message.counterparty,
      createdAt: td.message.createdAt.toString(),
    },
  };
}
