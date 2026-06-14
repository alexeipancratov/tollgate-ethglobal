---
description: "Task list for Ledger Simulator Signing Path"
---

# Tasks: Ledger Simulator Signing Path

**Input**: Design documents from `specs/003-ledger-simulator-signing/`

**Prerequisites**: Builds on completed `001` + `002`. plan.md, spec.md, research.md,
data-model.md, contracts/, quickstart.md.

**Tests**: Only the plan's mandated checks — the shared typed-data builder
determinism test and the backend verification tests (accept valid approver, refuse
wrong signer / tampered payload / replay). Not full TDD.

**Organization**: By user story. US1 (signed approve happy path on the simulator) is
the MVP; US2 hardens verification; US3 covers cancel/refusal + reject.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: different files, no incomplete dependency
- Paths extend the existing layout: `shared/`, `be/server/` (+`store/`), `web/src/`
  (new `web/src/ledger/`).

---

## Phase 1: Setup

- [x] T001 Add `viem` to `package.json` dependencies and run install (used by the simulator signer, the shared typed-data builder, and backend verification)
- [x] T002 [P] Document the new env vars and add a `.env.example`: backend `TOLLGATE_APPROVER_ADDRESS`, `TOLLGATE_CHAIN_ID`; web `VITE_SIGNER` (default `simulator`), `VITE_SIM_APPROVER_PK` (TEST key), `VITE_CHAIN_ID` — note the dev key's address MUST equal the approver address

---

## Phase 2: Foundational (shared contract + persistence + verify util)

**⚠️ CRITICAL**: Blocks all stories.

- [x] T003 [P] Create `shared/approval-typed-data.ts`: `buildApprovalTypedData(action, approvalId)` returning the EIP-712 `{ domain, types, primaryType: "Approval", message }`; `amount` encoded as integer minor units (cents); fixed domain `{ name, version, chainId }`
- [x] T004 [P] Extend `shared/types.ts` + `shared/messages.ts`: `ApproveSignedRequest` schema `{ signature }`, typed-data/payload types, and a `signingCancelled` request shape
- [x] T005 Update `be/server/store/schema.ts` + `initStore()` DDL in `be/server/store/store.ts`: add `signature`/`signer` columns to `approvals`; add the `approval_events` table
- [x] T006 Add store helpers in `be/server/store/store.ts`: `recordSignedApproval(id, signature, signer)` (sets columns + marks approved) and `recordApprovalEvent(approvalId, kind, { signer?, signatureHash? })`
- [x] T007 [P] Create `be/server/verify.ts`: viem `recoverTypedDataAddress` wrapper + approver/chainId config readers (`TOLLGATE_APPROVER_ADDRESS`, `TOLLGATE_CHAIN_ID`)
- [x] T008 [P] Add the typed-data builder determinism test (same action+approvalId → identical structure) in `shared/approval-typed-data.test.ts`

**Checkpoint**: contract, persistence, and the verify util are ready.

---

## Phase 3: User Story 1 - Approve a held action with a real device signature (Priority: P1) 🎯 MVP

**Goal**: Connect → Approve a held action → confirm on the (simulated) device →
backend verifies the signature → action released → agent resumes.

**Independent Test**: With `VITE_SIGNER=simulator` and the dev key matching the
approver, approve a held action and confirm the dialog; the action releases only
after verification and the agent resumes (SC-001, SC-002).

- [x] T009 [US1] Add `verifyAndApprove(id, signature)` in `be/server/approvals.ts`: load the pending approval + action, rebuild typed data (`shared/approval-typed-data.ts`), recover the signer (`verify.ts`); if it equals the approver → `recordSignedApproval` + broadcast the `resolution` event (002) + `recordApprovalEvent("signed_approved")`
- [x] T010 [US1] Add route `POST /approvals/:id/approve-signed { signature }` in `be/server/index.ts` (200 approved / 404 unknown / 409 already-resolved; 401 wired in US2)
- [x] T011 [P] [US1] Create `web/src/ledger/ApprovalSigner.ts` (interface) and `web/src/ledger/index.ts` (factory selecting impl from `import.meta.env.VITE_SIGNER`, default `simulator`)
- [x] T012 [US1] Create `web/src/ledger/SimulatedSigner.ts`: `connect()` resolves immediately; `signApproval(typedData)` shows a confirm dialog (mimics the device) then signs with `privateKeyToAccount(VITE_SIM_APPROVER_PK).signTypedData(...)`; `getApproverAddress()` returns that account's address
- [x] T013 [P] [US1] Create `web/src/ledger/LedgerSigner.ts` STUB — methods throw `"LedgerSigner: implemented in slice 004"` (the seam the real DMK+WebHID signer fills next)
- [x] T014 [US1] Update `web/src/App.tsx`: add a **Connect Ledger** control (`signer.connect()`), build `buildApprovalTypedData` on Approve, call `signer.signApproval`, then `POST /approvals/:id/approve-signed { signature }`; track signing/verifying state
- [x] T015 [US1] Update `web/src/feed/Feed.tsx`: the Approve button triggers the signing flow and shows held/signing states (Reject unchanged)
- [x] T016 [US1] Validate US1 per quickstart: connect, approve, confirm dialog → released and agent resumes ~2s (SC-001, SC-002)

**Checkpoint**: signed approve works end-to-end on the simulator.

---

## Phase 4: User Story 2 - Only a valid, authorized signature releases (Priority: P2)

**Goal**: The backend releases only on a signature from the authorized approver that
matches the stored action; wrong signer / tampered / replayed signatures are refused
and the action stays held.

**Independent Test**: Submit a signature from a non-approver key, or for a different
action; confirm 401 and the action stays held (SC-003).

- [ ] T017 [US2] Complete the refusal branch in `be/server/approvals.ts` / `be/server/index.ts`: on recovered-signer ≠ approver or any verification failure → respond 401 `signature_invalid`, leave the action held, and `recordApprovalEvent("verification_failed")`
- [ ] T018 [US2] Add `be/server/verify.test.ts` (Vitest): produce signatures with viem and assert — approver signature accepted; different-signer refused; tampered amount refused; a valid signature for action A refused when submitted for action B (replay)
- [ ] T019 [US2] Validate US2 per quickstart: run the console with a dev key ≠ approver, approve → 401 and the action stays held (SC-003)

**Checkpoint**: verification is the real trust boundary.

---

## Phase 5: User Story 3 - Graceful refusal, cancel, and reject (Priority: P3)

**Goal**: Device decline/disconnect leaves the action held (shown cancelled, not an
error, retryable); reject stays a plain no-device click.

**Independent Test**: Decline the confirm dialog → action stays held/cancelled and
retryable; click Reject → dropped with no device interaction (SC-004, SC-006).

- [ ] T020 [US3] In `web/src/ledger/SimulatedSigner.ts` make a declined dialog throw `SigningCancelled`; in `web/src/App.tsx` catch it → show cancelled, leave the row held, and `POST /approvals/:id/signing-cancelled`
- [ ] T021 [US3] Add route `POST /approvals/:id/signing-cancelled` in `be/server/index.ts` → `recordApprovalEvent("signing_cancelled")`, no state change (404 for unknown id)
- [ ] T022 [US3] Confirm the Reject path is unchanged (no device interaction) in `web/src/feed/Feed.tsx` / `web/src/App.tsx`
- [ ] T023 [US3] Validate US3 per quickstart: decline → held/cancelled/retryable; reject → dropped, no device (SC-004, SC-006)

**Checkpoint**: all three stories independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T024 [P] Confirm TypeScript strict passes across `shared/`, `be/`, `web/` (`npm run typecheck`)
- [ ] T025 [P] Update `RUN.md` with the signer env vars and the connect → approve → confirm flow
- [ ] T026 Run the full quickstart validation table end-to-end (SC-001 … SC-007), including the `approval_events` audit and the swappable-seam check (`VITE_SIGNER=ledger` → stub throws)

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (1)** → **Foundational (2)** blocks all stories.
- **US1 (3)**: depends on Foundational. MVP.
- **US2 (4)**: depends on US1 (hardens the same `approve-signed` path with refusal + tests).
- **US3 (5)**: depends on US1 (cancel handling around the signing flow) + reuses 002 reject.
- **Polish (6)**: after the desired stories.

### Key within-story dependencies

- T003/T004 → T009 (typed data + request shape before verifyAndApprove).
- T005 → T006; T007 → T009; T009 → T010.
- T011 → T012/T013; T011/T012 → T014 → T015.
- T009/T010 → T017 (refusal branch on the same handler) → T018.

---

## Parallel Opportunities

- **Foundational**: T003 ‖ T004 ‖ T007 (different files); T008 after T003.
- **US1**: T011 ‖ backend T009/T010; T013 ‖ T012 (different files).
- **Polish**: T024 ‖ T025.

### Parallel example (Foundational)

```bash
Task T003: shared/approval-typed-data.ts (EIP-712 builder)
Task T004: shared/types.ts + messages.ts (ApproveSignedRequest)
Task T007: be/server/verify.ts (viem recover + approver config)
```

---

## Implementation Strategy

### MVP first (US1 only)

1. Phase 1 → Phase 2 → Phase 3 (US1).
2. **STOP and VALIDATE**: with `VITE_SIGNER=simulator` and a dev key matching the
   approver, demo connect → approve → confirm → release. The signed-approval moment
   works on the simulator.

### Incremental delivery

1. US1 → verification hardening (US2) → cancel/reject (US3), validating each.
2. Each increment stays demo-able (Principle VI). Real Flex is slice 004 — flip
   `VITE_SIGNER=ledger` and implement `LedgerSigner` with DMK+WebHID; nothing else
   changes (the seam is the contract).

---

## Notes

- The backend rebuilds the typed data from its OWN stored action — the client sends
  only the signature (anti-tamper / anti-replay; SC-003/SC-006).
- `web/src/ledger/` + the `ApprovalSigner` interface IS the swappable seam
  (Principle IV). Keep the simulator and (future) Ledger impls behind it so slice 004
  is a one-env-var flip.
- No DMK packages this slice — only `viem`. DMK + `DX-NOTES.md` begin in slice 004.
- Commit after each task or logical group.
