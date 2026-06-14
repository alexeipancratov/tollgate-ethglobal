// Factory: pick the approval signer implementation from VITE_SIGNER (default
// "simulator"). One instance per session.
import type { ApprovalSigner } from "./ApprovalSigner";
import { SimulatedSigner } from "./SimulatedSigner";
import { LedgerSigner } from "./LedgerSigner";

let instance: ApprovalSigner | null = null;

export function getSigner(): ApprovalSigner {
  if (instance) return instance;
  const which = (import.meta.env.VITE_SIGNER ?? "simulator") as string;
  instance = which === "ledger" ? new LedgerSigner() : new SimulatedSigner();
  return instance;
}

export { SigningCancelled } from "./ApprovalSigner";
export type { ApprovalSigner } from "./ApprovalSigner";
