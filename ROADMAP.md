# Tollgate Roadmap

Living build sequence — **operator-owned, agent-readable**. Update this file as
increments land. The durable *discipline* behind this order (walking skeleton
first, policy engine early, demo-able increments, real device last) lives in the
constitution's Development Workflow; this file is the concrete, mutable plan and
the agent's reference for proposing what to spec next.

**How this is used** (see the constitution's "Spec-time interaction contract"):
when a spec is authored, the agent checks it against the constitution and this
roadmap, then accepts it or proposes adjustments. Ask the agent "what's next?"
and it recommends from here based on what's already built.

Status legend: `[ ]` not started · `[~]` in progress · `[x]` done

## Build sequence (walking skeleton)

1. `[x]` **Scaffold** (`specs/001-scaffold-walking-skeleton/`) — server (Node +
   clearance endpoint, pass-through policy, WebSocket event stream) + console
   (Vite + React live feed) + agent loop generating mocked priced actions.
   End-to-end runnable shell. **Done.**
2. `[x]` **Escalation slice** (`specs/002-escalation-hold-approval/`, done) — `escalate` outcome + a minimal per-action
   threshold (the FIRST rule of the rule stack) in the pure policy module; gate
   creates a pending-approval record and HOLDS the action; agent FREEZES on
   `escalate` and resumes on resolution (feed pauses → resumes). Resolution via a
   STUB endpoint/console action — **Ledger deferred**. This re-slices the old
   "Policy engine" (one rule now) and the backend half of the old "FE console
   approvals inbox" into one demo-able vertical cut.
3. `[ ]` **Policy rule stack (remaining rules)** — add cumulative budget window,
   velocity limit, and per-counterparty cap to the pure module + unit tests
   (Principle III). Extends item 2's policy without rewriting it.
4. `[ ]` **FE console — approvals inbox + transparency** — real approvals inbox UI
   (replaces item 2's stub resolution) plus budget/velocity and audit-log panels.
5. `[ ]` **Ledger simulator path** — Speculos transport wired to the approve
   button (full flow, mocked device). A complete, winnable demo on its own.
6. `[ ]` **Real Flex** — integrated LAST; the only thing that can sink the demo.

## Stretch goals (ONLY after the Ledger core is rock solid, ≥ 8h left)

- `[ ]` **Arc/Circle** — replace the mocked priced action with a real x402/Circle
  nanopayment on Arc testnet.
- `[ ]` **Dynamic** — replace the agent's local keypair with a Dynamic server
  wallet (+ delegated access).

Neither stretch goal may delay or destabilize the Ledger core.
