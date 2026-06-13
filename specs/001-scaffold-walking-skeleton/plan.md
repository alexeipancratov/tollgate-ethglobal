# Implementation Plan: Walking-Skeleton Scaffold

**Branch**: `001-scaffold-walking-skeleton` (spec dir; not on a git branch yet) | **Date**: 2026-06-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-scaffold-walking-skeleton/spec.md`

## Summary

Stand up the thin end-to-end pipe for Tollgate: an **agent** process generates a
stream of mocked priced actions and, for each, requests a clearance decision from
the **backend gate**; the gate decides via a **pass-through policy** (pure
function, approves all), records the action + decision in durable storage, and
publishes a real-time event; the **web console** renders a live, self-updating
feed. No rule stack, escalation, approvals, or Ledger in this slice — those are
later roadmap items. This is the walking skeleton every later feature deepens.

Technical approach is fixed by the constitution: TypeScript everywhere (strict),
Vite + React console, one Node backend (Fastify) with the policy as its own pure
module, SQLite persistence, and a WebSocket event stream. Single plain-folder
project (`web/`, `be/`, `shared/`), no workspace tooling.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), Node.js 20+ LTS

**Primary Dependencies**: Fastify (backend HTTP) + `@fastify/websocket` (event
stream); Drizzle ORM + `better-sqlite3` (persistence); Vite + React 18 (console);
Zod (shared runtime validation of messages); `tsx` (run/watch TS for be/agent);
Vitest (tests). No Ledger packages in this slice.

**Storage**: SQLite (single file, e.g. `be/data/tollgate.db`) via Drizzle.

**Testing**: Vitest — unit test for the pass-through policy (pure function), plus
a thin integration check of the clearance endpoint.

**Target Platform**: Local/demo. Console runs in a Chromium browser on localhost;
backend and agent run as local Node processes.

**Project Type**: Web application (React console + Node backend) with an
additional long-running agent process. Layout per constitution.

**Performance Goals**: New action visible in the feed within ~1s of generation
(SC-001); late-joiner sees recent history within ~3s (SC-005); demo-scale
throughput (a handful of actions/sec), not high concurrency.

**Constraints**: Trust boundary is absolute — the agent has no code path that
performs an action without first receiving `proceed` (Principle II, FR-002). The
policy module is a pure `(action, state) -> decision` function with no I/O
(Principle III), even as a stub. Dependency direction: `web -> backend`,
`agent -> backend`; backend never calls the agent; shared types only via
`shared/`.

**Scale/Scope**: Single agent instance, a few console viewers, one demo machine.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Applies to this slice? | Compliance |
|-----------|------------------------|------------|
| I. Ledger Is the Point | Deferred — device integrated LAST | ✅ No Ledger here; consistent with the device-last discipline |
| II. The Gate Is Inviolable | YES | ✅ FR-002: agent requests clearance and never acts without `proceed`; enforced as the one clearance path |
| III. Policy Engine Pure & Smart | YES (stub) | ✅ Pass-through policy is a pure `(action, state) -> decision` in `be/server/policy/`, with a unit test — sets the pattern the rule stack will extend |
| IV. Ledger Browser-Side & Swappable | N/A this slice | ✅ No device interaction yet |
| V. No Custom Smart Contracts | YES | ✅ None written or deployed |
| VI. Demo-able, Vertical Slices, Device Last | YES | ✅ This IS the walking skeleton; end-to-end runnable and demo-able on completion |
| VII. DX Feedback Is a Deliverable | N/A this slice | ✅ No Ledger friction to capture yet; `DX-NOTES.md` begins with Ledger work |

**Tech-stack constraints**: TypeScript strict ✅ · Vite+React console ✅ · single
Node backend (Fastify, allowed) ✅ · SQLite via Drizzle (allowed) ✅ · WebSocket
stream ✅ · single plain-folder project, no workspace ✅ · dependency direction
honored ✅ · shared types only via `shared/` ✅.

**Result**: PASS — no violations. Complexity Tracking not required.

## Project Structure

### Documentation (this feature)

```text
specs/001-scaffold-walking-skeleton/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (clearance API + WS event contracts)
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
shared/                      # Types + message schemas shared by web, server, agent
├── types.ts                 # Action, ClearanceDecision, FeedEvent
└── messages.ts              # ClearanceRequest/Response + WS event envelope (Zod)

be/                          # Backend (gate + policy) and the agent
├── server/                  # The gate: HTTP clearance endpoint, persistence, WS stream
│   ├── index.ts             # Fastify app bootstrap (HTTP + @fastify/websocket)
│   ├── gate.ts              # Receives clearance requests, calls policy, records, publishes
│   ├── policy/              # The policy engine (Principle III) — pure, tested
│   │   ├── index.ts         # passThroughPolicy(action, state) -> decision
│   │   └── policy.test.ts   # Vitest unit test
│   ├── store/               # Persistence (Drizzle + better-sqlite3)
│   │   ├── schema.ts        # actions, decisions tables
│   │   └── store.ts         # record() / recentHistory() helpers
│   └── events.ts            # In-process event bus → WS broadcast
└── agent/
    └── loop.ts              # Generates mocked priced actions; requests clearance; obeys

web/                         # Vite + React console
├── index.html
├── src/
│   ├── main.tsx
│   ├── App.tsx              # Live feed view
│   ├── feed/                # Feed components
│   └── lib/ws.ts            # WebSocket client (connect, recent history + live)
└── vite.config.ts

package.json                 # Single root package.json (no workspace)
tsconfig.json                # Base TS config (strict); web extends for DOM/JSX
```

**Structure Decision**: Single plain-folder project per the constitution —
`web/` (console), `be/` (`server/` with the `policy/` subfolder, plus `agent/`),
and top-level `shared/`. One root `package.json`; cross-folder imports are
relative; `shared/` is the only path the three sides share. The agent and server
are separate entry points run as distinct processes; the console is served by
Vite. This is the skeleton later slices extend (rule stack into `policy/`,
approvals into `server/` + `web/`, Ledger into `web/`).

## Complexity Tracking

> No constitution violations — section intentionally empty.
