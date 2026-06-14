// Factory: pick the approval signer implementation from VITE_SIGNER. Real Ledger
// is the default; simulator remains an explicit fallback. One instance per session.
import type { ApprovalSigner } from "./ApprovalSigner";
import { SimulatedSigner } from "./SimulatedSigner";
import { LedgerSigner } from "./LedgerSigner";

let instance: ApprovalSigner | null = null;

export function getSigner(): ApprovalSigner {
  if (instance) return instance;
  const which = (import.meta.env.VITE_SIGNER ?? "ledger") as string;
  instance = which === "simulator" ? new SimulatedSigner() : new LedgerSigner();
  return instance;
}

export { SigningCancelled } from "./ApprovalSigner";
export type { ApprovalSigner } from "./ApprovalSigner";
