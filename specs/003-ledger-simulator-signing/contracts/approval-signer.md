# Contract: ApprovalSigner interface (browser-side, NEW)

The swappable seam (constitution Principle IV). `web/src/ledger/`. One interface,
two implementations chosen by `import.meta.env.VITE_SIGNER` (default `"simulator"`).
Slice 004 swaps the implementation, not this contract.

```typescript
export interface ApprovalSigner {
  /** Establish a device session (user-gesture triggered). Idempotent. */
  connect(): Promise<void>;
  /** The address that will sign (the authorized approver). */
  getApproverAddress(): Promise<string>;
  /** Sign the approval typed-data; returns a 0x signature. Throws on refusal/cancel. */
  signApproval(typedData: ApprovalTypedData): Promise<{ signature: `0x${string}` }>;
  /** Whether a session is established. */
  isConnected(): boolean;
}
```

- **SimulatedSigner** (default this slice): `connect()` resolves immediately;
  `signApproval()` shows a confirm dialog mimicking the device, then signs with the
  dev key via `privateKeyToAccount(VITE_SIM_APPROVER_PK).signTypedData(...)`. A
  declined dialog throws a `SigningCancelled` error.
- **LedgerSigner** (stub this slice → slice 004): `connect()` does the DMK
  `startDiscovering` → `connect` (WebHID); `signApproval()` runs
  `SignerEthBuilder({dmk, sessionId}).build().signTypedData(path, typedData)` and
  assembles `{r,s,v}` → hex. A device refusal (`isDeviceRejection`) throws
  `SigningCancelled`. **Stubbed now**: throws `"LedgerSigner: implemented in slice 004"`.

### Caller behavior (App/Feed)

- A **Connect** control calls `signer.connect()` (the required user gesture).
- **Approve** on a held row: build `buildApprovalTypedData(action, approvalId)` →
  `signer.signApproval(...)`. On success → `POST /approvals/:id/approve-signed
  { signature }`. On `SigningCancelled` → show cancelled, leave held, optionally
  `POST /approvals/:id/signing-cancelled`.
- Each approval calls `signApproval` afresh (a session is not an authorization).
- **Reject** does not touch the signer (002 path).
