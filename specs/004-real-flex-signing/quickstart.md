# Quickstart: Real Ledger Flex Signing

Validate real-device approval. Most of this is **manual, on the physical Flex** (the
device path can't be unit-tested). Builds on 003. Detail in
[contracts/ledger-signer.md](./contracts/ledger-signer.md) and the DMK skills.

## Prerequisites

- A physical **Ledger Flex**, unlocked, with the **Ethereum app** installed.
- A **Chromium** browser (Chrome/Edge/Brave) on **localhost** (WebHID needs a secure
  context + Chromium; Firefox/Safari won't work).
- `npm install` (adds the `@ledgerhq/*` packages + rxjs).

## One-time approver setup

1. Set `VITE_SIGNER=ledger` in `.env`.
2. Start the web console, click **Connect Ledger**, approve the browser's device
   picker, then use **Show device address**.
3. Copy that address into `.env` as `TOLLGATE_APPROVER_ADDRESS`, restart the backend.
   (If the approver ≠ the device address, approvals 401 — by design.)

## Run

```bash
npm run be:server   # reads .env (approver = device address, chainId)
npm run web         # restart Vite so it reloads .env; open in Chromium
npm run be:agent
```

## Validate against success criteria

| Check | How | Expected (criterion) |
|-------|-----|----------------------|
| Real signed release | Connect, plug in Flex, Approve a held action, confirm on device | Releases only after the on-device confirmation + backend verify; agent resumes ~secs (SC-001, SC-002) |
| Single-config swap | Set `VITE_SIGNER=simulator` then `=ledger`, restart web | Same flow both ways, no other change (SC-003) |
| On-device reject | Reject on the Flex | Action stays held, shown cancelled/neutral, retryable (SC-004) |
| Disconnect | Unplug mid-sign | Clear recoverable message; action held (SC-004) |
| Locked / wrong app | Start with device locked / on dashboard | Prompted to unlock / open Ethereum app (SC-006) |
| Simulator fallback | Device absent, `VITE_SIGNER=simulator` | Full approval flow works without the device (SC-005) |
| Sub-threshold / reject | Cheap actions; Reject button | No device interaction (FR-011) |
| DX notes | — | `DX-NOTES.md` captures the integration friction (SC-007) |

## Automated test (no hardware)

```bash
npm test   # includes sig.test.ts: assembleSignature({r,s,v}) round-trips through viem recover
```

The pure signature-assembly + `v`-normalization helper is unit-tested by recovering an
assembled signature back to the expected address — the one device-adjacent bit that
can be checked without a Flex.

## Out of scope (later)

Human-readable Clear Signing (ERC-7730 descriptor + `originToken`), the remaining rule
stack, the polished approvals inbox, anything on-chain. Capture any Clear-Signing or
`v`-byte snags in `DX-NOTES.md`.
