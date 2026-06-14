---
description: "Task list for Escalation, Hold & Human Approval"
---

# Tasks: Escalation, Hold & Human Approval (stubbed)

**Input**: Design documents from `specs/002-escalation-hold-approval/`

**Prerequisites**: Builds on the completed `001-scaffold-walking-skeleton`. plan.md,
spec.md, research.md, data-model.md, contracts/, quickstart.md.

**Tests**: Only the mandated ones — the pure policy boundary test (Principle III)
and the plan's gate-escalate / resolution-idempotency integration checks. Not full
TDD.

**Organization**: By user story. US1 (approve path) is the MVP — the freeze →
approve → resume moment. US2 adds reject; US3 adds audit/visibility polish.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: different files, no incomplete dependency
- File paths extend the existing 001 layout (`shared/`, `be/server/` + `policy/`/`store/`, `be/agent/`, `web/src/`)

---

## Phase 1: Setup (shared contract)

**Purpose**: Widen the wire/domain contract that every later task builds on.

- [x] T001 [P] Extend `shared/types.ts`: widen `DecisionOutcome` to `"proceed" | "escalate"`; set `PolicyId = "per-action-cap"`; add `ResolutionOutcome`; make `FeedEvent` a union (`DecisionFeedEvent | ResolutionFeedEvent`); add `PendingApproval`
- [x] T002 [P] Extend `shared/messages.ts`: clearance response carries `approvalId` on escalate; add `PendingApproval` + `ResolveRequest` schemas; widen the WS `snapshot`/`event` envelopes to carry a `decision` or `resolution` feed event

---

## Phase 2: Foundational (policy + persistence)

**Purpose**: The threshold rule and the approvals store — blocking prerequisites
for all stories.

**⚠️ CRITICAL**: No user story work begins until this phase is complete.

- [x] T003 Replace the pass-through stub with the per-action-cap rule in `be/server/policy/index.ts`: `PolicyState { perActionThreshold }`; pure `amount > perActionThreshold ? escalate : proceed`
- [x] T004 [P] Update the policy unit test in `be/server/policy/policy.test.ts`: below / equal / above threshold boundary cases + purity (constitution Principle III)
- [x] T005 Add the `approvals` table to `be/server/store/schema.ts` and its `CREATE TABLE` DDL in `initStore()` in `be/server/store/store.ts`
- [x] T006 Add store helpers in `be/server/store/store.ts`: `createApproval`, `getApproval`, `listPending`, idempotent `resolveApproval` (pending-only conditional update → not_found / already_resolved); update `recentHistory()` to return the merged ordered decision + resolution feed events
- [x] T007 Wire the threshold config in `be/server/index.ts`: read `TOLLGATE_THRESHOLD` (default 5) and pass `PolicyState` through the gate to the policy

**Checkpoint**: Threshold rule tested green; approvals persistence ready.

---

## Phase 3: User Story 1 - Expensive action freezes until approved (Priority: P1) 🎯 MVP

**Goal**: Over-threshold action escalates → gate holds + creates approval → agent
freezes → human approves → agent performs → stream resumes.

**Independent Test**: With `TOLLGATE_THRESHOLD=5`, an expensive action holds and the
agent stops; approving it makes the agent perform it and resume (SC-001, SC-002).

- [x] T008 [US1] Add the escalate path to `be/server/gate.ts`: on `escalate`, record the decision, `createApproval(actionId)`, broadcast a held decision event, and return `{ decision, approvalId }`
- [x] T009 [US1] Create `be/server/approvals.ts`: resolve orchestration that calls `store.resolveApproval` and emits a `resolution` feed event (handles both outcomes; approve path exercised here)
- [x] T010 [US1] Add routes in `be/server/index.ts`: `GET /approvals/:id` (agent poll), `POST /approvals/:id/resolve` (404 unknown / 409 already-resolved), `GET /approvals` (list pending)
- [x] T011 [US1] Update `be/server/events.ts`: broadcast `resolution` events and include them in the connect-time snapshot
- [x] T012 [US1] Update the agent in `be/agent/loop.ts`: on `escalate`, freeze and poll `GET /approvals/:id` (~400ms) until resolved; perform on `approved`; never perform without observing `approved` (FR-004)
- [x] T013 [P] [US1] Update `web/src/lib/ws.ts` to parse and surface `resolution` events
- [x] T014 [US1] Update `web/src/feed/Feed.tsx` and `web/src/App.tsx`: render escalate rows as **held** (distinct from auto-approved), add a stub **Approve** button calling the resolve endpoint, and merge resolution updates into feed state
- [x] T015 [US1] Validate US1 per quickstart: feed pauses on the expensive action; approve → agent performs it and resumes within ~1s (SC-001, SC-002, FR-004/FR-006)

**Checkpoint**: The signature freeze → approve → resume demo works end-to-end.

---

## Phase 4: User Story 2 - Rejecting a held action drops it (Priority: P2)

**Goal**: A human rejects a held action; it is never performed and the agent resumes.

**Independent Test**: Hold an action, reject it; confirm it is never performed and
the agent resumes (SC-003).

- [x] T016 [US2] Confirm the reject outcome end-to-end in `be/server/approvals.ts` (backend `resolveApproval` already supports it): reject emits a `resolution` event with `rejected` and never marks the action performed
- [x] T017 [US2] Ensure the agent in `be/agent/loop.ts` drops the action on `rejected` (no perform) and resumes streaming
- [x] T018 [US2] Add a stub **Reject** button to held rows in `web/src/feed/Feed.tsx`
- [x] T019 [US2] Validate US2 per quickstart: reject → action never performed (verify from audit), agent resumes (SC-003, FR-007)

**Checkpoint**: Both approve and reject paths work.

---

## Phase 5: User Story 3 - Escalations and resolutions are auditable and visible (Priority: P3)

**Goal**: Every escalation + resolution is recorded with timestamps and reflected
in the live view (held → approved/rejected).

**Independent Test**: Drive mixed outcomes; confirm audit records and that the live
feed shows held → resolved transitions, including for a late-joining console
(SC-005, FR-010).

- [x] T020 [US3] Confirm/extend the audit read in `be/server/store/store.ts`: escalations and resolutions are persisted with outcomes + timestamps and surfaced via `recentHistory()` (snapshot) for late joiners
- [x] T021 [US3] Ensure `web/src/App.tsx` / `web/src/feed/Feed.tsx` reflect the held → approved/rejected transition in place (no duplicate rows; ordered by `seq`), including from a snapshot
- [x] T022 [US3] Validate US3 per quickstart: audit shows each escalation + resolution; live lifecycle visible; unknown id → 404 and double-resolve → 409 surfaced safely (SC-005, SC-007, FR-009/FR-010/FR-011)

**Checkpoint**: All three stories independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T023 [P] Add integration checks in `be/server/approvals.test.ts`: gate escalate creates an approval and returns `approvalId`; `resolveApproval` idempotency (unknown → 404-equivalent, already-resolved → 409-equivalent) per plan.md
- [x] T024 [P] Confirm TypeScript strict passes across `shared/`, `be/`, `web/` (`npm run typecheck`)
- [x] T025 Update `RUN.md` (and confirm quickstart) with `TOLLGATE_THRESHOLD` and the approve/reject flow
- [x] T026 Run the full quickstart validation table end-to-end (SC-001 … SC-007)

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (Phase 1)**: contract changes — start immediately.
- **Foundational (Phase 2)**: depends on Setup — BLOCKS all stories.
- **US1 (Phase 3)**: depends on Foundational. The MVP.
- **US2 (Phase 4)**: depends on US1 (reuses the resolve endpoint + agent poll; adds the reject delta).
- **US3 (Phase 5)**: depends on US1 (+US2 for mixed-outcome audit); mostly confirmation + visible-lifecycle polish.
- **Polish (Phase 6)**: after the desired stories.

### Story completion order

P1 (US1) → P2 (US2) → P3 (US3). US1 is independently demo-able (approve path). US2
and US3 are small deltas layered on top.

### Key within-story dependencies

- T001/T002 → T003–T007 (contract before policy/store).
- T003 → T004; T005 → T006; T003/T006/T007 → T008.
- T008 → T009 → T010; T011 before agent/console consume resolution events.
- T008/T010/T011 → T012 (agent needs the escalate response + poll endpoint).

---

## Parallel Opportunities

- **Setup**: T001 ‖ T002 (different files).
- **Foundational**: T004 ‖ T005 (test vs schema; T004 after T003).
- **US1**: T013 (`web/src/lib/ws.ts`) ‖ backend tasks T008–T011.
- **Polish**: T023 ‖ T024.

### Parallel example (Setup)

```bash
Task T001: widen shared/types.ts (escalate, resolution, PendingApproval)
Task T002: widen shared/messages.ts (approvalId, resolve request, WS events)
```

---

## Implementation Strategy

### MVP first (US1 only)

1. Phase 1 → Phase 2 → Phase 3 (US1).
2. **STOP and VALIDATE**: with `TOLLGATE_THRESHOLD=5`, demo freeze → approve →
   resume. This alone is the product's signature moment.

### Incremental delivery

1. US1 → reject (US2) → audit/visibility (US3), validating each independently.
2. Each increment stays demo-able (Principle VI). No Ledger, no remaining rule
   stack, no real inbox — those are later roadmap items.

---

## Notes

- The threshold rule stays a pure module so the remaining rule stack (next slice)
  extends it, not rewrites it (Principle III).
- Guard the trust boundary (T008 + T012): an escalated action is performed ONLY
  after the agent observes `approved`. SC-006 is verifiable from the audit.
- Resolution is the STUB the Ledger signature replaces later — keep the resolve
  endpoint the single seam so that swap is localized (device-last).
- Commit after each task or logical group.
