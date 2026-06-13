<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan
<!-- SPECKIT END -->

# Project Context: Tollgate

> Principles, governance, and full tech constraints live in
> `.specify/memory/constitution.md`. Ledger integration is governed by the DMK
> skills in `.agents/skills/` (authoritative for anything Ledger-related). This
> file is the narrative/architecture overview; where it touches a rule or a
> constraint, the constitution wins.

## The one-sentence idea

An autonomous AI agent spends at machine speed under a policy engine; anything
that crosses a risk line freezes and waits for a human to approve it on a real
Ledger hardware device.

## Why it's good (do not "improve" it into something worse)

Most agent-payment demos hand an LLM an uncapped wallet. The insight here is the
opposite: autonomy and safety are in tension, and the resolution is a **policy
gate** plus a **hardware human-approval step**. The differentiator is NOT the
blockchain plumbing — it's the **policy engine** (payments-grade decision logic)
and the **legible human-approval moment**. Keep effort there.

## The 90-second demo (what we optimize for)

1. Agent runs; a live feed shows actions streaming past, most stamped
   "auto-approved," scrolling fast. (Autonomy, visible.)
2. Agent hits an expensive action. The feed visibly PAUSES on it; it appears in
   an approvals inbox. (The gate, visible.)
3. A human clicks approve → the Ledger Flex lights up, shows the approval
   details, the human taps the device → the action releases and the feed
   resumes. (Safety, on real hardware.)
4. Budget/velocity state and an audit log are on screen throughout, so the
   policy is seen working, not hidden.

Everything in the build serves making those 90 seconds real and reliable.

## Components and responsibilities

### Agent (Node process)

A loop that generates a realistic stream of sensitive actions — in scope, MOCKED
priced "service calls" (e.g. "call premium API, $0.04"; occasionally a big one).
For each action it requests clearance from the backend and obeys the result
(proceed, or wait because it escalated). It is deliberately dumb about policy —
it never decides for itself. Its only signing need (for the autonomous path) is
a plain local keypair (viem/ethers); no Dynamic in core scope.

### Backend = Gate + Policy (one Node service)

- **Policy engine** (pure, tested module): `(action, state) -> proceed | escalate`.
  Rule stack: per-action cap, cumulative budget window (spend/hour or /day),
  velocity limit (max N/min), per-counterparty cap. Pure functions only.
- **Gate/state service** around it: receives the agent's clearance requests,
  calls the policy engine, and on escalate creates a pending-approval record and
  holds the action until a human resolves it. Owns SQLite persistence (the audit
  log) and a WebSocket stream of events to the FE.
- **Hard rule**: the agent cannot act on a sensitive action without a `proceed`
  (or a resolved approval) from here. This is the trust boundary.

### FE — Vite + React (the human console; the demo surface)

Three jobs:

1. **Live feed** — actions streaming in real time over WebSocket, most
   auto-approved. The autonomy half, made visible.
2. **Approvals inbox** — escalated actions surface here; the feed pauses on the
   escalated one. The human approves, which triggers the Ledger device call, and
   the signed result is posted back to the backend to release the action.
3. **Transparency panels** — current budget/velocity state and the audit log, so
   the policy engine is visibly doing its job.

The FE also HOSTS the Ledger device interaction (WebHID is browser-only).

### Ledger approval (a capability, lives in the FE)

Turns "human clicked approve" into a real secure-element signature. One transport
interface, two implementations: simulator (dev default — Speculos transport) and
real Flex via DMK + Ethereum signer. The human signs a typed-data (EIP-712)
payload that represents the approval itself — the signature IS the authorization.
No chain/contract needed for this in core scope.

## Data flow (one pass)

`agent generates action` → POST clearance request to backend → backend asks
policy engine →

- **proceed**: backend returns OK, logs it, pushes "auto-approved" event to FE;
  agent proceeds.
- **escalate**: backend creates pending approval, pushes "escalated" event to FE,
  holds the action → human sees it in FE inbox, clicks approve → FE invokes
  Ledger (Flex signs) → FE posts signed approval to backend → backend
  verifies/records, releases the action, pushes "approved" event → agent
  proceeds.

Everything is written to the audit log.

## What is REAL vs MOCKED in core scope

- **REAL**: policy engine, the gate, persistence/audit, the live FE, the Ledger
  device signature.
- **MOCKED**: the "payment" itself (a priced action with no real settlement), and
  the agent's autonomous signing (local keypair, not a server wallet).
- **NOT PRESENT**: smart contracts, Arc/Circle rail, Dynamic server wallets.

## Tech stack (summary — full constraints in the constitution)

TypeScript throughout. FE: Vite + React (Chromium, localhost). Backend: Node +
Express/Fastify + SQLite (Drizzle/Prisma) + WebSocket. Agent: Node loop. Ledger:
`@ledgerhq/device-management-kit`, `@ledgerhq/device-transport-kit-web-hid`,
`@ledgerhq/device-signer-kit-ethereum`, plus `@ledgerhq/context-module`
(mandatory peer dep) and the Speculos transport as the dev simulator. Single
plain project with folders (`web/`, `be/` with `server/`+`policy/`+`agent/`,
top-level `shared/`); NO pnpm workspace.

## Build order & roadmap

This project uses Spec Kit: the operator authors specs and owns per-increment
scope/ordering. The **living build sequence is in `ROADMAP.md`** (status-tracked,
operator-owned) — read it when deciding or proposing what to build next. The
durable *sequencing discipline* (walking skeleton first, policy engine early and
never deferred, each increment demo-able, real device last) and the spec-time
interaction contract live in the constitution's Development Workflow.

When the operator writes a spec, validate it against the constitution + roadmap
and either accept it or propose adjustments with reasons. When asked "what's
next?", recommend from `ROADMAP.md` based on what's already built.

## Stretch goals (ONLY after the Ledger core is rock solid, ≥ 8h left)

- **Arc/Circle**: replace the mocked priced action with a real x402/Circle
  nanopayment on Arc testnet → re-enables Arc's agentic-economy prize.
- **Dynamic**: replace the agent's local keypair with a Dynamic server wallet
  (+ delegated access) → re-enables Dynamic's agentic prize.

The architecture boundaries are designed so both drop in without restructuring.
Neither may delay or destabilize the Ledger core.
