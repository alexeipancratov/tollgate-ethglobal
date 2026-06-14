// Real-device implementation of the ApprovalSigner seam. DMK + WebHID + the Ethereum
// signer. Selected by VITE_SIGNER=ledger. Produces a genuine secure-element EIP-712
// signature; the backend verifies it through the unchanged approve-signed path.
import { firstValueFrom } from "rxjs";
import {
  DeviceActionStatus,
  OpenAppDeviceAction,
  UserInteractionRequired,
} from "@ledgerhq/device-management-kit";
import { webHidIdentifier } from "@ledgerhq/device-transport-kit-web-hid";
import { SignerEthBuilder, type SignerEth } from "@ledgerhq/device-signer-kit-ethereum";
import type { ApprovalSigner, DevicePromptHandler } from "./ApprovalSigner";
import { SigningCancelled } from "./ApprovalSigner";
import type { ApprovalTypedData } from "../../../shared/approval-typed-data";
import { getDmk } from "./dmk";
import { assembleSignature, toDmkTypedData } from "./sig";
import { isDeviceRejection, classifyDeviceError } from "./errors";

// Ledger-standard Ethereum account path (developer constant; never user input).
const PATH = (import.meta.env.VITE_LEDGER_PATH ?? "44'/60'/0'/0/0") as string;
const APP_NAME = "Ethereum";

const DEVICE_PROMPTS: Record<string, string> = {
  [UserInteractionRequired.UnlockDevice]: "Unlock your Ledger and enter your PIN.",
  [UserInteractionRequired.ConfirmOpenApp]: "Confirm opening the Ethereum app on your Ledger.",
  [UserInteractionRequired.VerifyAddress]: "Verify the address on your Ledger screen.",
  [UserInteractionRequired.SignTypedData]: "Review and confirm the approval on your Ledger.",
  [UserInteractionRequired.None]: "Preparing your Ledger…",
};

export class LedgerSigner implements ApprovalSigner {
  private sessionId: string | null = null;
  private signer: SignerEth | null = null;
  private approverAddress: string | null = null;

  async connect(onPrompt?: DevicePromptHandler): Promise<void> {
    const dmk = getDmk();
    try {
      if (!this.sessionId || !this.signer) {
        const device = await firstValueFrom(dmk.startDiscovering({ transport: webHidIdentifier }));
        this.sessionId = await dmk.connect({ device });
        this.signer = new SignerEthBuilder({ dmk, sessionId: this.sessionId }).build();
      }

      const action = dmk.executeDeviceAction({
        sessionId: this.sessionId,
        deviceAction: new OpenAppDeviceAction({ input: { appName: APP_NAME } }),
      });
      await this.awaitAction<void>(action.observable, onPrompt);

      // A WebHID session or already-open app can otherwise complete with no visible
      // device activity. Verify the signing address on-device so "Connect Ledger"
      // proves that the selected device is ready to authorize approvals.
      const addressAction = this.signer.getAddress(PATH, { checkOnDevice: true });
      const { address } = await this.awaitAction<{ address: string }>(
        addressAction.observable,
        onPrompt,
      );
      this.approverAddress = address;
    } catch (err) {
      throw new Error(classifyDeviceError(err));
    }
  }

  isConnected(): boolean {
    return this.signer !== null;
  }

  async getApproverAddress(onPrompt?: DevicePromptHandler): Promise<string> {
    if (!this.signer) await this.connect(onPrompt);
    if (this.approverAddress) return this.approverAddress;
    const { observable } = this.signer!.getAddress(PATH, { checkOnDevice: false });
    const output = await this.awaitAction<{ address: string }>(observable, onPrompt);
    this.approverAddress = output.address;
    return this.approverAddress;
  }

  async signApproval(
    typedData: ApprovalTypedData,
    onPrompt?: DevicePromptHandler,
  ): Promise<{ signature: `0x${string}` }> {
    if (!this.signer) await this.connect(onPrompt);
    const { observable } = this.signer!.signTypedData(PATH, toDmkTypedData(typedData));
    const output = await this.awaitAction<{ r: string; s: string; v: number }>(observable, onPrompt);
    return { signature: assembleSignature(output) };
  }

  // Resolve a DMK device-action observable to its output, mapping rejection ->
  // SigningCancelled and other failures -> a classified, recoverable error.
  // deno-lint-ignore no-explicit-any
  private awaitAction<T>(
    observable: {
      subscribe: (o: {
        next: (s: any) => void;
        error: (e: unknown) => void;
      }) => { unsubscribe: () => void };
    },
    onPrompt?: DevicePromptHandler,
  ): Promise<T> {
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
            case DeviceActionStatus.Pending: {
              const interaction = state.intermediateValue?.requiredUserInteraction as string;
              onPrompt?.(DEVICE_PROMPTS[interaction] ?? "Check your Ledger.");
              break;
            }
            default:
              break; // NotStarted — keep waiting
          }
        },
        error: (err: unknown) => {
          sub.unsubscribe();
          reject(new Error(classifyDeviceError(err)));
        },
      });
    });
  }
}
