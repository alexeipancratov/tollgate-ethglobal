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

1. `[ ]` **Scaffold** — server skeleton (Node + clearance endpoint backed by a
   trivial pass-through policy + WebSocket event stream) and FE skeleton (Vite +
   React connecting over WebSocket, rendering a feed). Minimal `shared/` types
   (clearance request/response, event). Goal: end-to-end runnable shell.
2. `[ ]` **Policy engine** — pure `(action, state) -> decision` with the full
   rule stack (per-action cap, cumulative budget window, velocity limit,
   per-counterparty cap) + unit tests, wired into the gate. Right after scaffold;
   never deferred (Principle III).
3. `[ ]` **Agent loop** — generates a realistic stream of mocked priced actions,
   asks the backend for clearance, obeys it (auto-clear + escalation).
4. `[ ]` **FE console** — real live feed + approvals inbox + budget/velocity and
   audit-log transparency panels.
5. `[ ]` **Ledger simulator path** — Speculos transport wired to the approve
   button (full flow, mocked device). A complete, winnable demo on its own.
6. `[ ]` **Real Flex** — integrated LAST; the only thing that can sink the demo.

## Stretch goals (ONLY after the Ledger core is rock solid, ≥ 8h left)

- `[ ]` **Arc/Circle** — replace the mocked priced action with a real x402/Circle
  nanopayment on Arc testnet.
- `[ ]` **Dynamic** — replace the agent's local keypair with a Dynamic server
  wallet (+ delegated access).

Neither stretch goal may delay or destabilize the Ledger core.
