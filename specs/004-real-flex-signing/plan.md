# Implementation Plan: Real Ledger Flex Signing

**Branch**: `004-real-flex-signing` (spec dir) | **Date**: 2026-06-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/004-real-flex-signing/spec.md`

## Summary

Implement the real-device side of the `ApprovalSigner` seam built in slice 003.
`LedgerSigner` (today a stub) becomes a DMK + WebHID + Ethereum-signer
implementation: `connect()` discovers and connects the Flex (user gesture);
`signApproval(typedData)` runs `signerEth.signTypedData(path, …)` and assembles the
device's `{r,s,v}` into a hex signature; `getApproverAddress()` reads the device's
address via `getAddress`. Flip `VITE_SIGNER=ledger` and the **entire rest of the
flow is unchanged** — same EIP-712 payload, same `approve-signed` endpoint, same
backend verification (viem `recoverTypedDataAddress`). The operator configures
`TOLLGATE_APPROVER_ADDRESS` to the device's address (read it once from the console).
Raw-hex (blind) signing — no `originToken`; Clear Signing (ERC-7730) deferred. The
simulator remains the fallback (flip the env back). DX friction captured in
`DX-NOTES.md` (Principle VII). This slice is almost entirely `web/`; backend and
agent are untouched.

## Technical Context

**Language/Version**: TypeScript 5.x (strict); browser (Chromium) for the device call.

**Primary Dependencies (new, web only)**: `@ledgerhq/device-management-kit` + `rxjs`,
`@ledgerhq/device-transport-kit-web-hid`, `@ledgerhq/device-signer-kit-ethereum`,
`@ledgerhq/context-module` (mandatory peer dep of the ETH signer — install even
though we omit `originToken`). Possibly `vite-plugin-node-polyfills` if the bundle
needs `buffer`/`process` shims. No new backend deps.

**Storage**: none new (reuses 003's `approvals`/`approval_events`).

**Testing**: the device path is validated manually on the Flex (quickstart). One
pure unit test for the `{r,s,v}` → hex signature assembly + EIP712Domain types
augmentation (verifiable without hardware by round-tripping through viem recover).

**Target Platform**: Chromium browser on localhost (secure context); physical Ledger
Flex with the Ethereum app.

**Project Type**: Web app (this slice touches `web/` almost exclusively).

**Performance Goals**: action releases and agent resumes within a few seconds of the
on-device confirmation (SC-002).

**Constraints**: `startDiscovering()`/`connect()` MUST be called from a user gesture
(WebHID silent-fails otherwise). Exactly ONE DMK instance (held by the singleton
`LedgerSigner`) — avoid the two-instance pitfall. Approver = the device's address;
mismatch → backend 401 (surface as misconfiguration). Backend verification and the
EIP-712 payload are UNCHANGED — a real-device signature must pass the same path.

**Scale/Scope**: one operator, one device, demo scale.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Applies? | Compliance |
|-----------|----------|------------|
| I. Ledger Is the Point | YES (delivers it) | ✅ A real secure-element signature in the demo — the headline |
| II. The Gate Is Inviolable | YES | ✅ Release still gated by backend verification; no new bypass |
| III. Policy Engine Pure & Smart | unchanged | ✅ Untouched |
| IV. Ledger Browser-Side & Swappable | YES (core) | ✅ Implements the real side of the one seam; WebHID browser-side; one-env-var swap |
| V. No Custom Smart Contracts | YES | ✅ Off-chain EIP-712; no contract/chain |
| VI. Demo-able, Sim-before-Device | YES | ✅ Simulator (003) is the complete fallback; the real device comes after it (softened device-last satisfied) |
| VII. DX Feedback Is a Deliverable | YES (begins here) | ✅ `DX-NOTES.md` produced this slice |

**Tech-stack constraints**: TypeScript strict ✅ · Vite+React + DMK/WebHID (the
constitution's named Ledger stack) ✅ · device call browser-side ✅ · single backend
untouched ✅ · dependency direction preserved ✅ · no workspace tooling ✅.

**Result**: PASS — no violations. Complexity Tracking not required.

## Project Structure

### Documentation (this feature)

```text
specs/004-real-flex-signing/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
└── tasks.md   # (/speckit-tasks — not created here)
```

### Source Code (changes; almost all in web/)

```text
web/src/ledger/
├── LedgerSigner.ts          # CHANGE: stub -> real DMK + WebHID + SignerEth implementation
├── dmk.ts                   # NEW: single DMK instance (builder + webHidTransportFactory), lazy
├── sig.ts                   # NEW: pure helpers — assembleSignature({r,s,v}) and withEip712Domain(typedData)
├── sig.test.ts              # NEW: unit test for the assembly (round-trips through viem recover)
└── errors.ts                # NEW: isDeviceRejection() + classifyDeviceError() (per dmk-code-patterns)

web/src/
└── App.tsx                  # CHANGE: device-readiness prompts (unlock / open app), a "show device address"
                             #         affordance for approver config, richer error/cancel surfacing

web/vite.config.ts           # CHANGE (if needed): node polyfills / optimizeDeps for the @ledgerhq ESM packages
package.json                 # CHANGE: add the @ledgerhq packages + rxjs (+ vite-plugin-node-polyfills if needed)
.env / .env.example          # CHANGE: VITE_SIGNER=ledger note; approver = device address

DX-NOTES.md                  # NEW (repo root): Ledger integration friction, with screenshots (Principle VII)
```

**Structure Decision**: Everything lands behind the existing `ApprovalSigner`
interface in `web/src/ledger/`. `dmk.ts` holds the single DMK instance; `LedgerSigner`
uses it. Pure, testable bits (signature assembly, domain augmentation, error
classification) are split into `sig.ts`/`errors.ts` so the un-testable device I/O is
thin. Backend, agent, shared payload, and the `approve-signed` contract are
untouched — this is the cleanest proof that the 003 seam was the right abstraction.

## Complexity Tracking

> No constitution violations — section intentionally empty.
