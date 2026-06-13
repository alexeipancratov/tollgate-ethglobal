---
description: "Task list for Walking-Skeleton Scaffold"
---

# Tasks: Walking-Skeleton Scaffold

**Input**: Design documents from `specs/001-scaffold-walking-skeleton/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Only included where mandated — the pure policy unit test (constitution
Principle III) and the thin clearance-endpoint integration check from the plan.
This is not full TDD.

**Organization**: Tasks are grouped by user story. US1 is the MVP — a complete,
demo-able end-to-end pipe. US2 and US3 are independent increments layered on top.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on incomplete tasks)
- **[Story]**: US1 / US2 / US3 (story phases only)
- File paths follow the structure in plan.md (`web/`, `be/server/` with `policy/`
  and `store/`, `be/agent/`, top-level `shared/`)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project skeleton so all three processes can run.

- [x] T001 Create the folder structure per plan.md: `shared/`, `be/server/policy/`, `be/server/store/`, `be/agent/`, `web/src/feed/`, `web/src/lib/`
- [x] T002 Create root `package.json` (single package, NO workspace) and install dependencies: `fastify`, `@fastify/websocket`, `drizzle-orm`, `better-sqlite3`, `zod`, `react`, `react-dom`, `vite`, `@vitejs/plugin-react`, `tsx`, `vitest`, `typescript`
- [x] T003 [P] Add `tsconfig.json` (strict mode) at repo root and a `web/tsconfig.json` extending it for DOM/JSX, plus `web/vite.config.ts` with the React plugin
- [x] T004 [P] Add npm scripts to `package.json`: `be:server` (tsx be/server/index.ts), `be:agent` (tsx be/agent/loop.ts), `web` (vite), `test` (vitest run)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared wire contract, the pure policy module, and the server boot —
everything every user story depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T005 [P] Define shared domain types (`Action`, `ClearanceDecision`, `FeedEvent`) in `shared/types.ts`
- [x] T006 [P] Define Zod message schemas in `shared/messages.ts` (`ClearanceRequest`, `ClearanceResponse`, WS `snapshot` and `event` envelopes) and derive their TS types — per `contracts/clearance-api.md` and `contracts/feed-ws.md`
- [x] T007 Implement the pure pass-through policy `passThroughPolicy(action, state) -> decision` (returns `proceed` / `pass-through`, no I/O) in `be/server/policy/index.ts`
- [x] T008 [P] Add the mandatory Vitest unit test for the policy in `be/server/policy/policy.test.ts` (asserts `proceed` for representative actions; purity: same input → same output, no side effects) — constitution Principle III
- [x] T009 Implement the in-process event bus with a monotonic `seq` counter and WebSocket broadcast helper in `be/server/events.ts`
- [x] T010 Bootstrap the Fastify app and register `@fastify/websocket` in `be/server/index.ts` (no routes yet)

**Checkpoint**: Server boots, policy is tested green, the shared contract compiles.

---

## Phase 3: User Story 1 - Live feed of autonomous actions (Priority: P1) 🎯 MVP

**Goal**: End-to-end pipe — agent generates mocked priced actions, asks the gate,
the gate decides (pass-through) and publishes a live event, the console renders a
self-updating feed. This is the walking skeleton and the demo surface.

**Independent Test**: Start server, console, and agent; new actions appear in the
feed within ~1s, each showing description, amount, and "auto-approved", updating
on their own (SC-001, SC-002).

- [x] T011 [US1] Implement the gate clearance handler in `be/server/gate.ts`: validate `ClearanceRequest`, call `passThroughPolicy`, publish a `FeedEvent` (live only, no persistence yet), return `ClearanceResponse` — per `contracts/clearance-api.md`
- [x] T012 [US1] Register the `POST /clearance` route and the `GET /feed` WebSocket route (live events) into the Fastify app in `be/server/index.ts`
- [x] T013 [US1] Implement the agent loop in `be/agent/loop.ts`: generate mocked priced actions on an interval, `POST /clearance`, mark performed ONLY on `proceed`, and wait/retry without acting on failure (trust boundary, FR-002)
- [x] T014 [P] [US1] Implement the console WebSocket client in `web/src/lib/ws.ts`: connect to `/feed`, parse and handle live `event` messages
- [x] T015 [US1] Implement the feed UI in `web/src/feed/` and `web/src/App.tsx`: render streaming events (description, amount, "auto-approved"), ordered by `seq` (FR-006, FR-010)
- [x] T016 [US1] Add the React entry point `web/src/main.tsx` and `web/index.html` mounting `App`
- [x] T017 [US1] Validate US1 per quickstart: feed updates within ~1s, 5-min unattended run, and gate-down safety (agent does not act while gate is down)

**Checkpoint**: US1 is a complete, demo-able MVP on its own.

---

## Phase 4: User Story 2 - Durable action history (Priority: P2)

**Goal**: Persist every action and decision so history survives a restart (audit
foundation).

**Independent Test**: Generate actions, restart the backend, inspect the store —
all prior actions and decisions are present and ordered (SC-006, FR-007).

- [x] T018 [US2] Define the Drizzle schema for `actions` and `decisions` (with `seq`) in `be/server/store/schema.ts` (mirrors data-model.md)
- [x] T019 [US2] Implement store helpers `record(action, decision, seq)` and `recentHistory(limit)` (joined, ordered by `seq`) in `be/server/store/store.ts`
- [x] T020 [US2] Update the gate handler in `be/server/gate.ts` to persist via `store.record()` BEFORE publishing the event (so history is the source of truth, SC-004)
- [x] T021 [US2] Initialize the SQLite database file and ensure the schema exists on server start in `be/server/index.ts` (e.g. `be/data/tollgate.db`)
- [x] T022 [US2] Validate US2 per quickstart: no drops/dupes over a 5-min run, and history present after a backend restart (SC-003, SC-006)

**Checkpoint**: US1 + US2 both work; history is durable.

---

## Phase 5: User Story 3 - Late-joining console (Priority: P3)

**Goal**: A console that connects mid-run shows recent activity immediately, then
streams live.

**Independent Test**: Run for a while, open a fresh console; recent activity shows
within ~3s, then new actions stream in (SC-005).

- [x] T023 [US3] On WebSocket connect, send a `snapshot` of `recentHistory(limit)` (oldest→newest) before streaming live `event`s, in `be/server/events.ts` and the `/feed` handler in `be/server/index.ts`
- [x] T024 [US3] Handle the `snapshot` message in `web/src/lib/ws.ts` and the feed: render history first, then append live events (no duplicates, ordered by `seq`)
- [x] T025 [US3] Validate US3 per quickstart: late-joiner sees recent activity within ~3s; reconnect resumes live updates

**Checkpoint**: All three stories independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Quality gates and final end-to-end validation.

- [x] T026 [P] Add a top-level run note (README section or `RUN.md`) documenting the three `npm run` commands from quickstart.md
- [x] T027 [P] Confirm TypeScript strict passes across `shared/`, `be/`, and `web/` (`tsc --noEmit`)
- [x] T028 Add a thin clearance-endpoint integration check in `be/server/gate.test.ts` (valid request → `proceed`; invalid body → 400) per plan.md
- [x] T029 Run the full quickstart validation table end-to-end (SC-001 … SC-006)

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (Phase 1)**: no dependencies — start immediately.
- **Foundational (Phase 2)**: depends on Setup — BLOCKS all user stories.
- **US1 (Phase 3)**: depends on Foundational. The MVP.
- **US2 (Phase 4)**: depends on Foundational; integrates with US1's gate handler
  (T020 edits `gate.ts` created in T011).
- **US3 (Phase 5)**: depends on Foundational + US2 (uses `recentHistory()` from
  T019) + US1's WS client (T014).
- **Polish (Phase 6)**: depends on the desired stories being complete.

### Story completion order

P1 (US1) → P2 (US2) → P3 (US3). US1 is independently shippable as the MVP; US2 and
US3 each add value without breaking US1.

### Key within-story dependencies

- T007 → T008 (policy before its test); T009 → T010 (bus before bootstrap).
- T011 → T012 (handler before route wiring); T011 → T013 needs the running route.
- T018 → T019 → T020 → T021 (schema → store → gate persistence → db init).
- T019 + T014 → T023 → T024 (history + client before snapshot).

---

## Parallel Opportunities

- **Setup**: T003 and T004 can run in parallel after T002.
- **Foundational**: T005, T006, and T008 are `[P]` (different files). Note T008
  depends on T007.
- **US1**: T014 (`web/src/lib/ws.ts`) can be built in parallel with backend tasks
  T011–T013 since it is a different file; T015/T016 then consume it.
- **Polish**: T026 and T027 are `[P]`.

### Parallel example (Foundational)

```bash
# After T002 (deps installed), these touch different files:
Task T005: Define shared types in shared/types.ts
Task T006: Define Zod message schemas in shared/messages.ts
Task T008: Policy unit test in be/server/policy/policy.test.ts   # after T007
```

---

## Implementation Strategy

### MVP first (US1 only)

1. Phase 1 (Setup) → Phase 2 (Foundational) → Phase 3 (US1).
2. **STOP and VALIDATE**: run the quickstart checks for SC-001/SC-002; demo the
   live feed end-to-end. This alone is a winnable narrow demo.

### Incremental delivery

1. US1 → durable history (US2) → late-joiner (US3), validating each independently.
2. Each increment stays demo-able (Principle VI); nothing here touches Ledger,
   escalation, or approvals — those are later roadmap items.

---

## Notes

- `[P]` = different files, no incomplete dependencies.
- The pass-through policy stays a pure module so the rule-stack slice extends it
  rather than rewriting it (Principle III).
- The trust boundary (T013 + T011/T020) is the one rule to guard: no action is
  performed without a `proceed`. SC-004 is verifiable from the persisted history
  once US2 lands.
- Commit after each task or logical group (constitution: commit continuously).
