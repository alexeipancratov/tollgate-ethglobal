// The swappable approval-signer seam (constitution Principle IV). One interface,
// two implementations (SimulatedSigner default; LedgerSigner in slice 004) chosen
// by VITE_SIGNER. Slice 004 swaps the implementation, not this contract.
import type { ApprovalTypedData } from "../../../shared/approval-typed-data";

/** Thrown when the human declines on the device / signing is interrupted. */
export class SigningCancelled extends Error {
  constructor(message = "signing cancelled") {
    super(message);
    this.name = "SigningCancelled";
  }
}

export interface ApprovalSigner {
  /** Establish a device session (user-gesture triggered). Idempotent. */
  connect(): Promise<void>;
  /** The address that signs (the authorized approver). */
  getApproverAddress(): Promise<string>;
  /** Sign the approval typed-data; returns a 0x signature. Throws SigningCancelled on refusal. */
  signApproval(typedData: ApprovalTypedData): Promise<{ signature: `0x${string}` }>;
  /** Whether a session is established. */
  isConnected(): boolean;
}
