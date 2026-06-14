# Tollgate Roadmap

Living build sequence — **operator-owned, agent-readable**. Update this file as
increments land. The durable _discipline_ behind this order (walking skeleton
first, policy engine early, demo-able increments, real device only after a
simulator fallback) lives in the constitution's Development Workflow; this file
is the concrete, mutable plan and
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
3. `[~]` **Ledger simulator path** (`specs/003-ledger-simulator-signing/`, IN PROGRESS)
   — a swappable browser-side `ApprovalSigner` seam (Principle IV) wired into the
   existing #2 Approve button. The human signs an EIP-712 approval payload; the
   backend rebuilds the typed data and verifies the signer == the authorized
   approver before releasing. **Simulator = a software signer (viem dev key),
   NOT Speculos** (Speculos is Node/TCP, unfit for the browser flow); no DMK
   packages this slice. **US1 done** (signed approve → verify → release works,
   tested). **Deferred: US2** (verification test suite — tamper/replay) **and US3**
   (device-cancel audit + reject re-confirm).
4. `[ ]` **Real Flex** — set `VITE_SIGNER=ledger` and implement `LedgerSigner` with
   DMK + WebHID + the Ethereum signer (Principle IV) on the sponsor-provided device:
   a REAL secure-element EIP-712 signature in the demo (Principle I). MUST come
   after #3's simulator fallback, never before it. (Also finish #3's US2/US3 around
   here.)
5. `[ ]` **FE console — approvals inbox + transparency** — real approvals inbox UI
   (replaces #2's stub resolution) plus budget/velocity and audit-log panels.
   Enhancement; does not gate the core Ledger demo.
6. `[ ]` **Policy rule stack (remaining rules)** — add cumulative budget window,
   velocity limit, and per-counterparty cap to the pure module + unit tests
   (Principle III). Extends #2's policy without rewriting it. Enhancement; does
   not gate the core Ledger demo.

> **Reprioritized 2026-06-14**: The sponsor provided a physical Ledger Flex, and
> Ledger is the primary prize (Principle I), so the device work (#3 simulator →
> #4 real Flex) is pulled ahead of the FE-console polish (#5) and the remaining
> rule stack (#6). The constitution's "device last" _safety property_ is
> preserved — the Speculos simulator path (#3) is a complete fallback and lands
> before the real device (#4); #5 and #6 are non-demo-gating enhancements.

## Stretch goals (ONLY after the Ledger core is rock solid, ≥ 8h left)

- `[ ]` **Arc/Circle** — replace the mocked priced action with a real x402/Circle
  nanopayment on Arc testnet.
- `[ ]` **Dynamic** — replace the agent's local keypair with a Dynamic server
  wallet (+ delegated access).

Neither stretch goal may delay or destabilize the Ledger core.
