// Signature verification (slice 003). Recovers the signer of an approval typed-data
// payload and checks it against the configured authorized approver. viem only — no
// chain access; this is an off-chain authorization check.
import { recoverTypedDataAddress } from "viem";
import type { ApprovalTypedData } from "../../shared/approval-typed-data";

// Read config at call time (not module load) so it works regardless of import
// order relative to dotenv.
export function chainId(): number {
  return Number(process.env.TOLLGATE_CHAIN_ID ?? 1);
}

export function approverAddress(): string {
  return (process.env.TOLLGATE_APPROVER_ADDRESS ?? "").toLowerCase();
}

/**
 * Recover the signer of `typedData` from `signature` and check it equals the
 * configured approver. Returns the recovered signer on success, or null on any
 * failure (mismatch, malformed signature, recovery error).
 */
export async function verifyApprovalSignature(
  typedData: ApprovalTypedData,
  signature: `0x${string}`,
): Promise<{ ok: true; signer: string } | { ok: false }> {
  const approver = approverAddress();
  if (!approver) throw new Error("TOLLGATE_APPROVER_ADDRESS is not configured");
  try {
    const signer = await recoverTypedDataAddress({
      domain: typedData.domain,
      types: typedData.types,
      primaryType: typedData.primaryType,
      message: typedData.message,
      signature,
    });
    if (signer.toLowerCase() !== approver) return { ok: false };
    return { ok: true, signer };
  } catch {
    return { ok: false };
  }
}
