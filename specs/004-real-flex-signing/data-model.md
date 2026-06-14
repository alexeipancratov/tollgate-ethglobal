# Data Model: Real Ledger Flex Signing

This slice adds **no new persisted entities** — it reuses 003's `approvals` /
`approval_events` and the same EIP-712 approval payload. The "model" here is the
device-side data the `LedgerSigner` works with (in-memory, browser).

## Reused unchanged (from 003)

- **Approval payload** (`shared/approval-typed-data.ts`) — the EIP-712 typed data.
  The real device signs the SAME structure; the backend rebuilds and verifies it
  identically. No change.
- **Approval signature / authorized approver / approval_events** — unchanged. The
  signature is now produced by the secure element; `signer` recorded is the device
  address.

## Device-side (in-memory, web)

- **DMK instance** (`web/src/ledger/dmk.ts`): one per app, lazy. Built with
  `webHidTransportFactory`.
- **Device session**: `sessionId` from `dmk.connect`. Transport handle, not an
  authorization — every signature still requires a fresh on-device confirmation.
- **Device address**: `signerEth.getAddress(path).output.address` — the Ethereum
  address derived on the device; configured as `TOLLGATE_APPROVER_ADDRESS`.

## Signature assembly (pure; `web/src/ledger/sig.ts`)

- Input: device output `{ r: string, s: string, v: number }`.
- Output: `0x{r-hex}{s-hex}{v-hex}` — a 65-byte hex signature viem can recover.
- **`v` normalization**: if `v < 27`, use `v + 27` (Ledger may return `0/1`). The
  unit test round-trips an assembled signature through viem `recoverTypedDataAddress`
  to confirm it recovers the expected address.
- `withEip712Domain(typedData)`: returns the 003 typed data plus an `EIP712Domain`
  entry in `types` (`name`/`version`/`chainId`) as the DMK ETH signer requires.

## Configuration (developer/operator constants)

- `VITE_SIGNER=ledger` selects this implementation and is the default;
  `VITE_SIGNER=simulator` remains an explicit fallback.
- Derivation path: Ledger-standard Ethereum account (e.g. `44'/60'/0'/0/0`), a constant.
- `TOLLGATE_APPROVER_ADDRESS` = the device's address (read once via the console).
- `VITE_CHAIN_ID` / `TOLLGATE_CHAIN_ID` must match (unchanged from 003).

## States (device flow, per DMK)

`disconnected → discovering → connected → (locked → unlock) → (app: open Ethereum) →
signing (Pending: SignTypedData) → Completed | Stopped | Error`. The console maps
`Pending.requiredUserInteraction` to prompts; `Error` is classified into rejection
(neutral cancel) vs. recoverable.
