// Real-device implementation of the ApprovalSigner seam. DMK + WebHID + the Ethereum
// signer. Selected by VITE_SIGNER=ledger. Produces a genuine secure-element EIP-712
// signature; the backend verifies it through the unchanged approve-signed path.
import { firstValueFrom } from "rxjs";
import { DeviceActionStatus } from "@ledgerhq/device-management-kit";
import { webHidIdentifier } from "@ledgerhq/device-transport-kit-web-hid";
import { SignerEthBuilder, type SignerEth } from "@ledgerhq/device-signer-kit-ethereum";
import type { ApprovalSigner } from "./ApprovalSigner";
import { SigningCancelled } from "./ApprovalSigner";
import type { ApprovalTypedData } from "../../../shared/approval-typed-data";
import { getDmk } from "./dmk";
import { assembleSignature, toDmkTypedData } from "./sig";
import { isDeviceRejection, classifyDeviceError } from "./errors";

// Ledger-standard Ethereum account path (developer constant; never user input).
const PATH = (import.meta.env.VITE_LEDGER_PATH ?? "44'/60'/0'/0/0") as string;

export class LedgerSigner implements ApprovalSigner {
  private sessionId: string | null = null;
  private signer: SignerEth | null = null;

  async connect(): Promise<void> {
    const dmk = getDmk();
    try {
      const device = await firstValueFrom(dmk.startDiscovering({ transport: webHidIdentifier }));
      this.sessionId = await dmk.connect({ device });
      this.signer = new SignerEthBuilder({ dmk, sessionId: this.sessionId }).build();
    } catch (err) {
      throw new Error(classifyDeviceError(err));
    }
  }

  isConnected(): boolean {
    return this.signer !== null;
  }

  async getApproverAddress(): Promise<string> {
    if (!this.signer) await this.connect();
    const { observable } = this.signer!.getAddress(PATH, { checkOnDevice: false });
    const output = await this.awaitAction<{ address: string }>(observable);
    return output.address;
  }

  async signApproval(typedData: ApprovalTypedData): Promise<{ signature: `0x${string}` }> {
    if (!this.signer) await this.connect();
    const { observable } = this.signer!.signTypedData(PATH, toDmkTypedData(typedData));
    const output = await this.awaitAction<{ r: string; s: string; v: number }>(observable);
    return { signature: assembleSignature(output) };
  }

  // Resolve a DMK device-action observable to its output, mapping rejection ->
  // SigningCancelled and other failures -> a classified, recoverable error.
  // deno-lint-ignore no-explicit-any
  private awaitAction<T>(observable: {
    subscribe: (o: {
      next: (s: any) => void;
      error: (e: unknown) => void;
    }) => { unsubscribe: () => void };
  }): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const sub = observable.subscribe({
        next: (state: any) => {
          switch (state.status) {
            case DeviceActionStatus.Completed:
              sub.unsubscribe();
              resolve(state.output as T);
              break;
            case DeviceActionStatus.Error:
              sub.unsubscribe();
              reject(
                isDeviceRejection(state.error)
                  ? new SigningCancelled()
                  : new Error(classifyDeviceError(state.error)),
              );
              break;
            case DeviceActionStatus.Stopped:
              sub.unsubscribe();
              reject(new SigningCancelled());
              break;
            default:
              break; // NotStarted / Pending — keep waiting
          }
        },
        error: (err: unknown) => reject(new Error(classifyDeviceError(err))),
      });
    });
  }
}
