# Contract: LedgerSigner (real device implementation of ApprovalSigner)

`LedgerSigner` fills the SAME `ApprovalSigner` interface from slice 003
(`web/src/ledger/ApprovalSigner.ts`). No interface change — that's the point. This
documents the DMK behavior it must satisfy behind each method. Authoritative
integration detail: the Ledger DMK skills in `.agents/skills/`.

## connect(): Promise<void>

- Build/reuse the single DMK (`dmk.ts`, `webHidTransportFactory`).
- `firstValueFrom(dmk.startDiscovering({ transport: webHidIdentifier }))` →
  `dmk.connect({ device })`; store `sessionId`. MUST be called from a user gesture
  (the Connect button).
- Build `new SignerEthBuilder({ dmk, sessionId }).build()` (no `originToken` — raw hex).
- Throws a classified, recoverable error on connect failure (no device / denied).

## getApproverAddress(): Promise<string>

- `signerEth.getAddress(path, { checkOnDevice: false })`, take `Completed.output.address`.
- Surfaced in the console so the operator sets `TOLLGATE_APPROVER_ADDRESS` to it.

## signApproval(typedData): Promise<{ signature }>

- `withEip712Domain(typedData)` then `signerEth.signTypedData(path, …)`.
- Subscribe to the observable:
  - `Pending` → map `requiredUserInteraction` to a prompt (unlock / open app /
    review-and-sign).
  - `Completed` → `assembleSignature(output.{r,s,v})` → `{ signature }`.
  - `Error` → if `isDeviceRejection` → throw `SigningCancelled` (neutral, action
    stays held); else throw a classified recoverable error.
  - `Stopped` (cancelled) → throw `SigningCancelled`.
- Each call requires a fresh on-device confirmation (session ≠ authorization).

## isConnected(): boolean

- True once a `sessionId` exists.

## Unchanged downstream (NOT part of this slice)

- The signature flows to `POST /approvals/:id/approve-signed { signature }` exactly as
  in 003; the backend rebuilds the typed data and verifies via viem. A real-device
  signature MUST pass that path (with correct `v` normalization). No backend change.

## Swap contract

`VITE_SIGNER=ledger` selects `LedgerSigner`; `simulator` (default) selects
`SimulatedSigner`. The factory (`web/src/ledger/index.ts`) and every caller are
unchanged — the swap is one env var (FR-002 / SC-003).
