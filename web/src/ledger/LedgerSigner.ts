// Real-device implementation of the ApprovalSigner seam. STUB this slice — the
// real DMK + WebHID + Ethereum signer (signTypedData -> {r,s,v} -> hex) lands in
// slice 004 by setting VITE_SIGNER=ledger. Nothing else changes (the seam is the
// contract). See the Ledger DMK skills in .agents/skills/.
import type { ApprovalSigner } from "./ApprovalSigner";
import type { ApprovalTypedData } from "../../../shared/approval-typed-data";

const NOT_IMPL = "LedgerSigner: implemented in slice 004 (DMK + WebHID)";

export class LedgerSigner implements ApprovalSigner {
  async connect(): Promise<void> {
    throw new Error(NOT_IMPL);
  }
  async getApproverAddress(): Promise<string> {
    throw new Error(NOT_IMPL);
  }
  async signApproval(_typedData: ApprovalTypedData): Promise<{ signature: `0x${string}` }> {
    throw new Error(NOT_IMPL);
  }
  isConnected(): boolean {
    return false;
  }
}
