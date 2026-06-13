# Research: Walking-Skeleton Scaffold

The constitution fixes the stack (TypeScript, Vite+React, one Node backend with
the policy as a pure module, SQLite, WebSocket, single plain-folder project). The
open choices below were within the latitude the constitution allows (e.g.
"Express or Fastify", "Drizzle or Prisma"). No `NEEDS CLARIFICATION` remain.

## Decision: Backend framework — Fastify

- **Decision**: Fastify with `@fastify/websocket` for the event stream.
- **Rationale**: First-class TypeScript types, a maintained WebSocket plugin
  (wraps `ws`) so HTTP clearance endpoint and the live feed share one server and
  one port, and low ceremony. Satisfies the constitution's "one Node service"
  requirement.
- **Alternatives considered**: Express + a standalone `ws` server (more glue,
  two things to wire); raw Node `http` (too low-level for the time budget). Both
  are constitution-allowed; either could be swapped without architectural change.

## Decision: Persistence — Drizzle ORM + better-sqlite3

- **Decision**: Drizzle ORM over `better-sqlite3` (synchronous SQLite driver).
- **Rationale**: Drizzle is lightweight with no code-generation daemon or schema
  engine to run; schema is plain TS and migrations are trivial — fast to stand up
  under hackathon pressure. `better-sqlite3` is synchronous and simple, ideal for
  demo-scale writes and a single backend process.
- **Alternatives considered**: Prisma (heavier: generate step, larger runtime —
  constitution-allowed but more tooling); raw SQL via `node:sqlite`/`sqlite3`
  (loses typed queries). Drizzle is the lighter fit.

## Decision: Project setup — single root package.json, no workspace

- **Decision**: One `package.json` at the repo root holding both backend and
  frontend deps; `web/`, `be/`, `shared/` as plain folders; relative cross-folder
  imports; `tsx` to run `be/server` and `be/agent`, Vite to serve `web/`.
- **Rationale**: The constitution explicitly forbids a pnpm workspace ("avoid new
  tooling under time pressure"). A single package keeps install/run trivial.
  `shared/` is imported by relative path from both sides — the only shared surface.
- **Alternatives considered**: pnpm/npm workspaces (explicitly excluded); separate
  package.json per folder without a workspace (dependency duplication, more
  install steps).

## Decision: Run/test tooling — tsx + Vitest

- **Decision**: `tsx` for running/watching the TS backend and agent; Vitest for
  tests.
- **Rationale**: `tsx` runs TS directly with no build step — fast inner loop.
  Vitest shares Vite's config/transform, is fast, and gives the pure policy module
  the mandatory unit test (Principle III) with near-zero setup.
- **Alternatives considered**: `ts-node` (slower, more config); Jest (heavier,
  separate transform config).

## Decision: Message validation — Zod in shared/

- **Decision**: Define the clearance request/response and the WS event envelope as
  Zod schemas in `shared/messages.ts`; derive TS types from them.
- **Rationale**: One source of truth for the wire contract, validated at runtime
  on both ends (catches drift between agent, server, console early). Types live in
  `shared/` as the constitution requires.
- **Alternatives considered**: Hand-written interfaces only (no runtime checks);
  separate schema lib. Zod is small and dual-purpose (type + validator).

## Decision: Late-joiner / live-feed delivery (US3)

- **Decision**: On WebSocket connect, the server sends a snapshot of recent
  history (last N decisions from the store), then streams subsequent decisions
  live over the same socket.
- **Rationale**: Satisfies SC-005 (recent activity within ~3s of connecting) and
  keeps one delivery channel. Avoids a separate history REST endpoint for the
  console in this slice (the store still exposes `recentHistory()` reused by the
  snapshot).
- **Alternatives considered**: Live-only stream (empty screen for late joiners,
  fails US3); polling a REST history endpoint (extra round-trips, more code).

## Decision: Agent ↔ gate transport — HTTP request/response

- **Decision**: The agent calls a backend HTTP clearance endpoint per action and
  awaits the decision before treating the action as performed.
- **Rationale**: A synchronous request/response makes the trust boundary explicit
  and easy to verify (Principle II / FR-002): no decision, no action. Simple to
  reason about and to test.
- **Alternatives considered**: Agent over WebSocket (bidirectional, but blurs the
  clean "ask and wait" gate semantics for this slice); message queue (overkill at
  demo scale).

## Resolved unknowns

- Backend framework, ORM/driver, test runner, packaging, validation, and feed
  delivery are all decided above. No outstanding clarifications block planning.
- Deferred by design (later roadmap items, not unknowns): the real rule stack,
  escalation/approval flow, and all Ledger device interaction.
