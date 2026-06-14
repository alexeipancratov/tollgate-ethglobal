---
description: "Task list for Real Ledger Flex Signing"
---

# Tasks: Real Ledger Flex Signing

**Input**: Design documents from `specs/004-real-flex-signing/`

**Prerequisites**: Builds on completed `001`/`002` and `003`'s `ApprovalSigner` seam.
plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md.

**Tests**: Only one automated test — the pure signature-assembly round-trip
(`sig.test.ts`). The device flow is validated **manually on the physical Flex**
(hardware can't run in CI). Not TDD.

**Hardware note**: Code tasks need no device; tasks marked **(on Flex)** require the
physical Ledger Flex + Ethereum app + a Chromium browser on localhost.

**Organization**: By user story. US1 (real signed approval) is the MVP and the
product's headline; US2 adds device readiness; US3 adds refusal/disconnect + fallback.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: different files, no incomplete dependency
- New code lives in `web/src/ledger/`; backend/agent untouched.

---

## Phase 1: Setup

- [x] T001 Add the Ledger packages to `package.json` and install: `@ledgerhq/device-management-kit`, `rxjs`, `@ledgerhq/device-transport-kit-web-hid`, `@ledgerhq/device-signer-kit-ethereum`, `@ledgerhq/context-module` (the last is a mandatory peer dep of the ETH signer)
- [x] T002 [P] Verify `npm run web` boots and `vite build` succeeds with the DMK ESM packages; add `vite-plugin-node-polyfills` and/or `optimizeDeps.include` in `web/vite.config.ts` ONLY if `buffer`/`process`/ESM errors appear
- [x] T003 [P] Update `.env` / `.env.example`: document `VITE_SIGNER=ledger` and that `TOLLGATE_APPROVER_ADDRESS` must be set to the connected device's address

---

## Phase 2: Foundational (pure, testable helpers + DMK instance)

**⚠️ CRITICAL**: Blocks all stories.

- [x] T004 [P] Create `web/src/ledger/sig.ts`: `assembleSignature({r,s,v})` → `0x{r}{s}{v}` with `v` normalization (`v < 27 ? v + 27 : v`); `withEip712Domain(typedData)` (adds the `EIP712Domain` entry the DMK ETH signer requires)
- [x] T005 [P] Create `web/src/ledger/sig.test.ts`: sign the 003 payload with a viem test key, split into `{r,s,v}`, run `assembleSignature`, and assert `recoverTypedDataAddress` returns the expected address — including a `v=0/1` normalization case
- [x] T006 [P] Create `web/src/ledger/errors.ts`: `isDeviceRejection(err)` (`_tag`/codes `5501`,`6985`) and `classifyDeviceError(err)` (locked, wrong app, disconnect, timeout) per `dmk-code-patterns.md`
- [x] T007 Create `web/src/ledger/dmk.ts`: a single lazy DMK instance (`DeviceManagementKitBuilder().addTransport(webHidTransportFactory).build()`)

**Checkpoint**: helpers unit-tested green; DMK instance available.

---

## Phase 3: User Story 1 - Approve a held action on the real Ledger Flex (Priority: P1) 🎯 MVP

**Goal**: With `VITE_SIGNER=ledger`, Connect the Flex → Approve a held action → review
& confirm on the device → backend verifies the secure-element signature → released.

**Independent Test (on Flex)**: hold an action, Approve, confirm on the Flex → it
releases only after the on-device confirmation and the agent resumes (SC-001, SC-002).

- [x] T008 [US1] Implement `connect()` in `web/src/ledger/LedgerSigner.ts`: `firstValueFrom(dmk.startDiscovering({ transport: webHidIdentifier }))` → `dmk.connect({ device })`; build `new SignerEthBuilder({ dmk, sessionId }).build()` (no `originToken`); store session
- [x] T009 [US1] Implement `signApproval(typedData)` in `web/src/ledger/LedgerSigner.ts`: `withEip712Domain` → `signerEth.signTypedData(path, td)`; subscribe; `Completed` → `assembleSignature(output)`; `Pending` → map `requiredUserInteraction` to a prompt
- [x] T010 [US1] Implement `getApproverAddress()` (`signerEth.getAddress(path).output.address`) and `isConnected()` in `web/src/ledger/LedgerSigner.ts`
- [x] T011 [US1] Surface device signing/pending prompts in `web/src/App.tsx` (e.g. "Review and sign on your Ledger") reusing the existing busy/approve flow from 003
- [ ] T012 [US1] **(on Flex)** Validate US1 per quickstart: Connect, Approve, confirm on device → released, agent resumes (SC-001, SC-002)

**Checkpoint**: real secure-element signature releases a held action.

---

## Phase 4: User Story 2 - Bring the device to a signable state (Priority: P2)

**Goal**: Guide connect/unlock/open-Ethereum-app, and let the operator read the device
address to configure the approver.

**Independent Test (on Flex)**: start locked / on dashboard → guided to ready; show the
device address; then US1 succeeds (SC-006, FR-004).

- [x] T013 [US2] Add device-readiness prompts in `web/src/App.tsx` (via `errors.ts` + Pending interactions): locked → "unlock / enter PIN", dashboard/wrong app → "open the Ethereum app"
- [x] T014 [US2] Add a "Show device address" control in `web/src/App.tsx` that calls `getApproverAddress()` and displays it for `TOLLGATE_APPROVER_ADDRESS` configuration
- [ ] T015 [US2] **(on Flex)** Validate US2 per quickstart: locked/dashboard guided; address shown and configured; US1 then succeeds (SC-006, FR-004)

**Checkpoint**: a fresh device can be brought to a signable state.

---

## Phase 5: User Story 3 - Refusal, disconnect, and simulator fallback (Priority: P3)

**Goal**: On-device reject / disconnect handled neutrally (held, retryable); simulator
remains a configuration fallback.

**Independent Test (on Flex)**: reject on device → held/cancelled; unplug mid-sign →
recoverable; `VITE_SIGNER=simulator` → full flow without the device (SC-004, SC-005).

- [ ] T016 [US3] Handle errors in `web/src/ledger/LedgerSigner.ts` + `web/src/App.tsx`: `isDeviceRejection` → throw `SigningCancelled` (neutral, action held); else `classifyDeviceError` → recoverable message (action held)
- [ ] T017 [US3] Confirm and document the simulator fallback: `VITE_SIGNER=simulator` still works end-to-end with no device (no code change expected — verifies the seam)
- [ ] T018 [US3] **(on Flex)** Validate US3 per quickstart: reject on device → held/cancelled; disconnect mid-sign → recoverable/held; simulator fallback works (SC-004, SC-005)

**Checkpoint**: robust failure handling + a working fallback.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T019 Create `DX-NOTES.md` (repo root): capture Ledger integration friction — `context-module` peer dep, WebHID user-gesture, the `v`-byte normalization, any Vite ESM/polyfill snags — with screenshots (Principle VII / FR-010 / SC-007)
- [ ] T020 [P] Confirm TypeScript strict + `npm test` (incl. `sig.test.ts`) pass across `shared`/`be`/`web`
- [ ] T021 [P] Update `RUN.md`: real-device run, the one-time approver-address setup, and the Chromium + secure-context requirement
- [ ] T022 **(on Flex)** Run the full quickstart validation table on the device (SC-001 … SC-007) plus a final simulator-fallback check

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (1)** → **Foundational (2)** blocks all stories.
- **US1 (3)**: depends on Foundational. MVP.
- **US2 (4)**: depends on US1 (prompts/address around the same connect/sign flow).
- **US3 (5)**: depends on US1 (error handling around the signing observable) + reuses
  the 003 simulator for fallback.
- **Polish (6)**: after the desired stories; `DX-NOTES.md` accrues throughout but is
  finalized here.

### Key within-story dependencies

- T004/T006/T007 → T008/T009 (helpers + DMK before the signer).
- T005 after T004. T008 → T009/T010. T009 → T011.
- T016 builds on T009's observable handling.

---

## Parallel Opportunities

- **Setup**: T002 ‖ T003.
- **Foundational**: T004 ‖ T005 ‖ T006 (different files; T005 after T004); T007 independent.
- **Polish**: T020 ‖ T021.
- Most US tasks are sequential (same files: `LedgerSigner.ts`, `App.tsx`).

### Parallel example (Foundational)

```bash
Task T004: web/src/ledger/sig.ts (assembleSignature + withEip712Domain)
Task T006: web/src/ledger/errors.ts (isDeviceRejection + classifyDeviceError)
Task T007: web/src/ledger/dmk.ts (single DMK instance)
```

---

## Implementation Strategy

### MVP first (US1 only)

1. Phase 1 → Phase 2 → Phase 3 (US1).
2. **STOP and VALIDATE on the Flex**: Connect → Approve → confirm → release. This is
   the headline demo (Principle I) — a real secure-element signature.

### Incremental delivery

1. US1 → device readiness (US2) → refusal/fallback (US3).
2. Each increment stays demo-able; the simulator remains the fallback (Principle VI).
   Only `LedgerSigner` + the device-facing UI change — backend, payload, and
   verification are untouched (the 003 seam).

---

## Notes

- The signature flows through the UNCHANGED `approve-signed` endpoint + viem
  verification; the only risk is `v`-byte normalization (handled in `sig.ts`, tested
  in `sig.test.ts`).
- Keep `LedgerSigner` behind the `ApprovalSigner` interface — `VITE_SIGNER` is the
  single swap (simulator ↔ real device).
- `DX-NOTES.md` is a graded submission deliverable (Principle VII) — write it as you
  hit friction, not after.
- Device-dependent tasks (T012/T015/T018/T022) need the physical Flex; everything
  else can be completed and unit-tested without it.
- Commit after each task or logical group.
