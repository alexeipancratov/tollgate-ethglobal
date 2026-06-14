# Implementation Plan: Ledger Simulator Signing Path

**Branch**: `003-ledger-simulator-signing` (spec dir) | **Date**: 2026-06-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/003-ledger-simulator-signing/spec.md`

## Summary

Replace the stub Approve with a real EIP-712 **signed approval**. Introduce ONE
browser-side `ApprovalSigner` interface (constitution Principle IV) with two
implementations selected by an env var: a **SimulatedSigner** (default this
slice — signs the approval payload with a dev key via viem, behind a confirm
dialog that mimics the device) and a **LedgerSigner** (stub this slice; the real
DMK + WebHID + Ethereum signer lands in slice 004 by flipping the env var). The
human clicks **Connect**, then **Approve** on a held row; the signer produces a
signature over a typed-data payload bound to that action. The web app posts just
the **signature**; the **backend rebuilds the identical typed data from its own
stored action and verifies** the signer recovers to the configured authorized
approver — only then is the action released. Reject is unchanged; device refusal
leaves the action held. Signatures and attempts are recorded in the audit trail.

**Why a software simulator, not Speculos**: the DMK-native Speculos transport is
a TCP/Node transport — it cannot drive a browser-hosted signing flow. The
constitution's "swappable transport" is *our* `ApprovalSigner` seam; the
simulator is a software implementation of it, and the real Flex is the other
implementation (slice 004). This keeps the whole flow browser-side and makes 004
a true config flip.

## Technical Context

**Language/Version**: TypeScript 5.x (strict), Node 20+ (unchanged)

**Primary Dependencies**: existing stack + **viem** (new) — used in three places:
the SimulatedSigner (`privateKeyToAccount(...).signTypedData`), the shared
typed-data builder, and backend verification (`recoverTypedDataAddress`). DMK
packages (`@ledgerhq/*`) are NOT added here — they arrive with the real device in
slice 004.

**Storage**: SQLite via Drizzle. `approvals` gains `signature` + `signer`
columns; a small `approval_events` audit table records signed/failed/cancelled
attempts.

**Testing**: Vitest — shared typed-data builder determinism; backend verification
(accepts a signature from the approver, refuses a different signer, refuses a
tampered/mismatched payload, refuses replay for another action).

**Target Platform**: Local/demo; console in a Chromium browser on localhost.

**Project Type**: Web app (React console + Node backend) + agent.

**Performance Goals**: action released and agent resumes within ~2s of the
on-device confirmation (SC-002).

**Constraints**: Trust boundary in cryptographic form — a held action is released
ONLY after the backend verifies a signature from the authorized approver that
matches the action it has stored (Principle II; FR-004/SC-006). The backend, not
the client, defines what was supposed to be signed (anti-tamper). The signer seam
is swappable via one env var (Principle IV). Off-chain only — no chain, no
contract (Principle V).

**Scale/Scope**: single agent → at most one held action at a time.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Applies? | Compliance |
|-----------|----------|------------|
| I. Ledger Is the Point | YES (simulator stage) | ✅ Builds the signing flow on the simulator; real Flex is 004. Consistent with the softened device-last (simulator fallback first) |
| II. The Gate Is Inviolable | YES | ✅ Release now requires backend signature verification — strictly stronger than the stub. No new bypass |
| III. Policy Engine Pure & Smart | unchanged | ✅ Policy untouched this slice |
| IV. Ledger Browser-Side & Swappable | YES (core) | ✅ ONE `ApprovalSigner` interface, two impls (simulator default, ledger stub→004), swapped by one env var; device call browser-side |
| V. No Custom Smart Contracts | YES | ✅ EIP-712 signature is off-chain; no contract, no chain |
| VI. Demo-able, Vertical Slices, Sim-before-Device | YES | ✅ Simulator path is a complete winnable demo; real device is the next slice |
| VII. DX Feedback Is a Deliverable | begins next slice | ✅ Minimal Ledger-SDK surface here (viem only); `DX-NOTES.md` starts with DMK integration in 004 |

**Tech-stack constraints**: TypeScript strict ✅ · viem is an allowed EVM lib ✅ ·
single Node backend ✅ · SQLite/Drizzle ✅ · WebSocket unchanged ✅ · dependency
direction (`web -> backend`, `agent -> backend`) preserved ✅ · shared types/typed-
data builder via `shared/` ✅ · no workspace tooling ✅.

**Result**: PASS — no violations. Complexity Tracking not required.

## Project Structure

### Documentation (this feature)

```text
specs/003-ledger-simulator-signing/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
└── tasks.md   # (/speckit-tasks — not created here)
```

### Source Code (changes over the existing layout)

```text
shared/
├── types.ts                 # CHANGE: ApprovalPayload, ApproveSignedRequest types
└── approval-typed-data.ts   # NEW: buildApprovalTypedData(action, approvalId) -> EIP-712 (domain/types/primaryType/message). Shared by FE (sign) and backend (verify)

be/server/
├── store/
│   ├── schema.ts            # CHANGE: approvals += signature, signer; NEW approval_events table
│   └── store.ts             # CHANGE: DDL; recordSignedApproval(), recordApprovalEvent()
├── approvals.ts             # CHANGE: NEW verifyAndApprove(id, signature) — rebuild typed data from stored action, recoverTypedDataAddress (viem), check == approver, then resolve approved + record
├── verify.ts                # NEW: thin viem wrapper (recoverTypedDataAddress) + approver config
└── index.ts                 # CHANGE: POST /approvals/:id/approve-signed; POST /approvals/:id/signing-cancelled

be/agent/loop.ts             # UNCHANGED — still resumes on release, drops on reject (release is now signature-gated, transparent to the agent)

web/src/
├── ledger/                  # NEW: the swappable signer seam (browser-side)
│   ├── ApprovalSigner.ts    # interface: connect(), getApproverAddress(), signApproval(typedData) -> signature
│   ├── SimulatedSigner.ts   # viem dev-key signer + confirm-dialog (default)
│   ├── LedgerSigner.ts      # STUB this slice (throws "implemented in slice 004"); real DMK+WebHID next
│   └── index.ts             # factory: pick impl from import.meta.env.VITE_SIGNER (default "simulator")
├── feed/Feed.tsx            # CHANGE: Approve triggers the signing flow; show "held / signing / verifying"
└── App.tsx                  # CHANGE: Connect control + signer wiring; on signature -> POST approve-signed; on device cancel -> show cancelled (+ POST signing-cancelled)
```

**Structure Decision**: All device-facing code lives under `web/src/ledger/`
(the constitution's recommended `web/ledger/`), behind the `ApprovalSigner`
interface — exactly the seam slice 004 swaps. The backend gains a small `verify.ts`
(viem) and an `approve-signed` route; the gate/policy/agent are otherwise
untouched. The typed-data builder is in `shared/` so FE and backend sign/verify
the *same* structure.

## Complexity Tracking

> No constitution violations — section intentionally empty.
