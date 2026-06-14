// Software simulator of the approval device (default this slice). Signs the
// approval typed-data with a TEST dev key (viem), behind a confirm dialog that
// mimics the on-device confirmation moment. NOT the DMK/Speculos transport
// (Speculos is Node/TCP) — this is the browser-side simulator implementation of
// the ApprovalSigner seam. The real Flex (slice 004) is the other implementation.
import { privateKeyToAccount } from "viem/accounts";
import type { PrivateKeyAccount } from "viem";
import type { ApprovalSigner } from "./ApprovalSigner";
import { SigningCancelled } from "./ApprovalSigner";
import type { ApprovalTypedData } from "../../../shared/approval-typed-data";

const PK = (import.meta.env.VITE_SIM_APPROVER_PK ?? "") as `0x${string}`;

export class SimulatedSigner implements ApprovalSigner {
  private account: PrivateKeyAccount | null = null;

  async connect(): Promise<void> {
    if (!PK || PK.length !== 66) {
      throw new Error("VITE_SIM_APPROVER_PK is not set to a valid 0x test private key");
    }
    this.account = privateKeyToAccount(PK);
  }

  isConnected(): boolean {
    return this.account !== null;
  }

  async getApproverAddress(): Promise<string> {
    if (!this.account) await this.connect();
    return this.account!.address;
  }

  async signApproval(typedData: ApprovalTypedData): Promise<{ signature: `0x${string}` }> {
    if (!this.account) await this.connect();
    const m = typedData.message;
    const confirmed = window.confirm(
      `Simulated Ledger — approve on device?\n\n` +
        `${m.description}\n` +
        `Amount: $${(Number(m.amount) / 100).toFixed(2)}\n` +
        `Action: ${m.actionId}`,
    );
    if (!confirmed) throw new SigningCancelled();

    const signature = await this.account!.signTypedData({
      domain: typedData.domain,
      types: typedData.types,
      primaryType: typedData.primaryType,
      message: typedData.message,
    });
    return { signature };
  }
}
