<!--
SYNC IMPACT REPORT
==================
Version change: 1.2.0 → 1.2.1 (PATCH)
Rationale: Softened the "device last" wording in Principle VI and the Development
Workflow sequencing discipline to state the actual safety property — the real
device is integrated only AFTER a complete simulator (Speculos) fallback exists,
not necessarily as the literal last step. Reflects the 2026-06-14 roadmap
reprioritization (sponsor-provided Flex; Ledger is the primary prize) that pulls
the device ahead of non-demo-gating enhancements. No principle added/removed/
redefined; the fallback-before-device guarantee is unchanged.

----- Prior entry (1.2.0, MINOR) -----
Version change: 1.1.0 → 1.2.0 (MINOR)
Rationale: Reframed the Development Workflow to fit the Spec Kit model. The
constitution no longer prescribes a numbered build sequence (the operator owns
that via specs; the living sequence moved to ROADMAP.md). Instead it now states
a "Sequencing discipline" (the durable rules any spec/plan must respect,
enforced at the plan's Constitution Check) and a "Spec-time interaction
contract" (agent validates each spec against constitution + roadmap and accepts
or proposes adjustments; operator may ask the agent to propose the next spec).
- New companion artifact: ROADMAP.md (operator-owned, agent-readable, status-
  tracked) holds the concrete walking-skeleton sequence.

----- Prior entry (1.1.0, MINOR) -----
Version change: 1.0.1 → 1.1.0 (MINOR)
Rationale: Reworked the Development Workflow build order to a walking-skeleton
approach — scaffold a thin end-to-end server + FE shell first, then deepen each
component. Material change to workflow guidance; no principles added/removed.
- Step 1 is now "Scaffold (walking skeleton)"; shared/ types emerge here
  incrementally instead of a big upfront pass.
- Policy engine moved to step 2 with an explicit guardrail that it comes right
  after the scaffold and is never deferred (preserves Principle III).
- Ledger simulator step names the Speculos transport (consistent with 1.0.1).

----- Prior entry (1.0.1, PATCH) -----
Version change: 1.0.0 → 1.0.1 (PATCH)
Rationale: Clarifications and one factual correction to the Ledger integration
guidance after adding the Ledger DMK skills under .agents/skills/. No principles
added, removed, or redefined.
- Corrected dev simulator from `wallet-api-simulator` to Speculos transport
  (DMK-native; consistent with the DMK + WebHID choice in Principle IV).
- Noted `@ledgerhq/context-module` as a mandatory ETH-signer peer dependency.
- Clarified `originToken` is optional / partner-gated; ship without it and use
  an ERC-7730 descriptor for Clear Signing.
- Added WebHID runtime constraints + derivation-path-as-constant rule.
- Strengthened Principle I: mock/stub transports void the device security model.
- Principle IV now points to .agents/skills/ as the binding DMK integration
  playbook (gates, error classification, HITL escalation).
- Governance: added a "Ledger source of truth" precedence rule — the DMK skills
  in .agents/skills/ are authoritative for Ledger decisions and override the
  constitution on any Ledger detail.

----- Prior entry (1.0.0) -----
Version change: (template, unversioned) → 1.0.0
Rationale: First concrete ratification of the project constitution from the
template placeholders. MAJOR baseline (1.0.0) for a brand-new governing
document.

Modified principles (placeholder → concrete):
- [PRINCIPLE_1_NAME] → I. Ledger Is the Point (NON-NEGOTIABLE)
- [PRINCIPLE_2_NAME] → II. The Gate Is Inviolable (NON-NEGOTIABLE)
- [PRINCIPLE_3_NAME] → III. The Policy Engine Is the Differentiator — Keep It Pure and Smart
- [PRINCIPLE_4_NAME] → IV. Ledger Device Interaction Is Browser-Side and Swappable
- [PRINCIPLE_5_NAME] → V. No Custom Smart Contracts
- (added) VI. Demo-able From Hour Six, Built in Vertical Slices
- (added) VII. DX Feedback Is a Deliverable

Added sections:
- Technology Stack & Constraints (was [SECTION_2_NAME])
- Development Workflow (was [SECTION_3_NAME])
- Expanded principle count from 5 → 7 per project direction.

Removed sections: none.

Templates requiring updates:
- ✅ .specify/templates/plan-template.md — Constitution Check gate auto-derives
  from this file; no hardcoded principles to reconcile. No edit needed.
- ✅ .specify/templates/spec-template.md — generic, no constitution coupling.
  No edit needed.
- ✅ .specify/templates/tasks-template.md — tests are OPTIONAL by default; the
  policy-engine mandatory-test rule (Principle III) is carried per-feature via
  spec/plan, not a template conflict. No edit needed.
- ✅ .specify/templates/commands/*.md — directory not present; no agent-specific
  references to scrub.

Follow-up TODOs: none. All placeholders resolved.
-->

# Tollgate Constitution

Tollgate is a policy-gated approval system for autonomous AI agents. An agent
takes sensitive actions (current scope: paying for services) at machine speed.
A backend policy engine evaluates every action against spending rules: actions
within policy proceed autonomously; actions that cross a line are escalated to a
human who approves or rejects them on a Ledger hardware signer (Ledger Flex)
with a real secure-element signature. Built for ETHGlobal New York 2026, with
the **Ledger "AI Agents x Ledger" prize** as the primary target.

## Core Principles

### I. Ledger Is the Point (NON-NEGOTIABLE)

The human-in-the-loop approval on a real Ledger device is the heart of the
product and the demo. Every scoping decision MUST favor making that approval
moment real, legible, and reliable. A real secure-element signature on the Flex
MUST appear in the final demo; the simulator is for development only. Any
mock/stub transport (`setStub(true)`, Speculos) voids the device security model
and MUST NOT stand in for the real signature in the submitted demo.

**Rationale**: The product's thesis — autonomy bounded by hardware-anchored
human authority — is only proven by a genuine device signature. Anything that
dilutes that moment dilutes the submission.

### II. The Gate Is Inviolable (NON-NEGOTIABLE)

No sensitive action is taken without a clearance decision from the backend gate.
The agent MUST NOT contain a code path that executes a sensitive action without
first receiving `proceed`. Policy lives in the backend, never in the agent's own
judgment. Any change that lets the agent self-approve violates the architecture
and MUST be rejected.

**Rationale**: The structural trust boundary is the safety guarantee. If the
agent can reach a sensitive action by any path that bypasses the gate, the
guarantee is fictional.

### III. The Policy Engine Is the Differentiator — Keep It Pure and Smart

The policy engine is composed of pure functions: `(action, state) -> decision`.
No I/O, no SDK calls, no database access inside it. It MUST be more than a flat
threshold: it implements a stack of rules (per-action cap, cumulative budget
window, velocity limit, per-counterparty cap). This is the one module with
mandatory unit tests, and the one we point judges to.

**Rationale**: Our edge is payments-policy thinking; this is where it lives.
Purity makes it trivially testable, and the rule stack is the demonstrable
substance behind the demo.

### IV. Ledger Device Interaction Is Browser-Side and Swappable

The device call uses Ledger's DMK over WebHID — a browser API — so the
`signTransaction` / `signTypedData` call happens in the front end, not the Node
backend. All Ledger interaction MUST go through ONE transport interface with two
implementations: a dev-default simulator (Speculos transport,
`@ledgerhq/device-transport-kit-speculos`) and the real Flex (WebHID transport +
DMK Ethereum signer). Because the simulator is itself just a DMK transport,
switching MUST be a single environment variable and the signing code above the
transport stays identical. The human signs a typed-data (EIP-712) approval
payload that represents the authorization itself — the signature IS the approval;
no custom chain or contract is required for it. The detailed DMK integration
gates (SDK init → session → device state → app → operation, plus error
classification and HITL escalation points) are governed by the Ledger DMK skills
in `.agents/skills/` and MUST be followed during implementation.

**Rationale**: WebHID constrains where the call can live. A single swappable
transport keeps the simulator and real-device paths identical everywhere else,
which is what lets the risky device leg be integrated last (Principle VI).

### V. No Custom Smart Contracts

The team writes, deploys, and forks zero Solidity. On-chain rails are out of core
scope. If a feature appears to need a custom contract, it MUST be redesigned at
the application layer or cut.

**Rationale**: Custom contracts add audit surface, deployment risk, and time
cost that the hackathon budget cannot absorb — and they are not needed, because
the typed-data signature carries the authorization.

### VI. Demo-able From Hour Six, Built in Vertical Slices

The system MUST stay runnable end-to-end after initial integration. Features are
added as thin vertical slices, never broad half-finished layers. The riskiest leg
(the real device) is integrated ONLY AFTER a complete simulator fallback exists,
so that if it stalls, a complete demo still runs on the simulator. Once that
fallback is in place the real device MAY be brought in early (ahead of
non-demo-gating enhancements); what is non-negotiable is that the simulator
fallback precedes it. A working narrow demo beats a broken ambitious one.

**Rationale**: Hackathon judging rewards a working artifact. Continuous
demo-ability is the only reliable hedge against the unknown unknowns of new
hardware and SDKs.

### VII. DX Feedback Is a Deliverable

Friction with Ledger docs and SDKs MUST be captured in `DX-NOTES.md` at the
moment it occurs, with screenshots. This file is part of the submission, not an
afterthought.

**Rationale**: Ledger judges developer-experience feedback as much as code.
Captured-in-the-moment notes are higher fidelity than reconstructed ones and
directly serve the prize criteria.

## Technology Stack & Constraints

- **Language**: TypeScript everywhere, strict mode. No second backend language.
- **Front end**: Vite + React. Hosts the human console AND the Ledger device
  call (WebHID requires a browser + secure context; localhost qualifies; use a
  Chromium browser).
- **Backend**: one Node service (Express or Fastify) = the gate + the policy
  engine (policy kept as its own pure, tested module) + persistence + a
  WebSocket event stream to the front end.
- **Agent**: a long-running Node process; an action-generating loop that asks
  the backend for clearance and obeys it. Sensitive actions are MOCKED (priced
  service calls) — no real payment rail in core scope.
- **Ledger**: DMK (`@ledgerhq/device-management-kit`) + WebHID transport
  (`@ledgerhq/device-transport-kit-web-hid`) + Ethereum signer
  (`@ledgerhq/device-signer-kit-ethereum`); Speculos transport
  (`@ledgerhq/device-transport-kit-speculos`) as the dev/CI simulator.
  `@ledgerhq/context-module` is a MANDATORY peer dependency of the ETH signer
  kit and MUST be installed even in development. Clear Signing additionally
  requires an `originToken` passed to `SignerEthBuilder`; the token is OPTIONAL
  and gated behind Ledger's partner program — without it the signer still works
  but the device silently shows raw hex (blind signing) with no runtime error.
  We therefore plan to ship without `originToken`; authoring an ERC-7730
  descriptor for the blind-signed approval is the realistic Clear-Signing
  enhancement (and a Ledger prize direction).
- **WebHID runtime constraints**: Chromium-based browser only; HTTPS or
  localhost; `startDiscovering()`/`connect()` MUST be called from a user gesture
  (silent failure otherwise). Derivation paths are developer-set constants, never
  user input. See the Ledger DMK skills in `.agents/skills/` for the binding
  integration playbook.
- **Persistence**: SQLite (Drizzle or Prisma), in the backend only.
- **Project layout**: single project, plain folders (NOT a pnpm workspace —
  avoid new tooling under time pressure). Recommended: `web/` (FE + browser-side
  `ledger/` transport), `be/` (`server/` with a `policy/` subfolder, and
  `agent/`), and top-level `shared/` for types used by both sides. Cross-folder
  imports are relative.
- **Dependency direction**: `web -> backend`, `agent -> backend`. The backend
  never calls the agent. Shared types only via `shared/`.

## Development Workflow

This project uses Spec Kit. The operator authors specs (`/speckit-specify`) and
owns the scope and ordering of each increment; plans and tasks flow from there.
The constitution does NOT own the concrete build sequence — that lives as a
living, operator-owned artifact in `ROADMAP.md`. The constitution owns the
sequencing discipline that any spec or plan must respect, and the interaction
contract for how specs get proposed and validated.

**Sequencing discipline** (every spec and plan MUST respect it; enforced at the
plan's Constitution Check):

- Walking skeleton first: stand up a thin end-to-end server + FE shell before
  deepening any component.
- The policy engine is deepened early and is never deferred toward the end
  (Principle III).
- Each increment MUST be demo-able end-to-end before the next begins
  (Principle VI).
- The real Ledger device is integrated ONLY AFTER a complete simulator path
  (Speculos) exists as a winnable fallback — never before it. The device may then
  be prioritized early; non-demo-gating enhancements MAY follow it
  (Principles I, IV, VI).

**Spec-time interaction contract**:

- When the operator authors a spec, the agent validates it against (1) this
  constitution (hard gate) and (2) the sequencing discipline + current
  `ROADMAP.md`, then either accepts it as-is or proposes adjustments with reasons.
- The operator may ask the agent to propose the next spec; the agent recommends
  based on `ROADMAP.md` and what is already built.
- `ROADMAP.md` is updated as increments land; the constitution is not touched for
  routine sequencing changes.

Commit continuously with meaningful messages (sponsors check history; no
single-commit submissions).

**Demo acceptance criteria**: many autonomous sub-threshold actions visible in
the live feed; one above-threshold action visibly freezing and escalating; human
approval producing a REAL signature on the Flex (on camera for the video); budget
state and audit trail visible.

## Governance

This constitution supersedes other working practices for the duration of the
ETHGlobal New York 2026 build. When a decision conflicts with a principle, the
principle wins or the constitution is amended first — never bypassed silently.

**Ledger source of truth**: For any Ledger-related decision (transports, signing
flow, dependencies, error handling, device gates), the Ledger DMK skills in
`.agents/skills/` are authoritative and take priority. Where this constitution
and those skills disagree on a Ledger detail, the skills win and the constitution
is corrected to match.

**Scope boundaries**: Arc (Circle nanopayments) and Dynamic (server wallets) are
explicitly OUT of the core scope. They MAY be added only as post-core stretch
goals, after the demo acceptance criteria above are met, and only without
weakening Principles I, II, or VI.

**Amendments**: Any team member may propose an amendment. An amendment MUST state
what changes, why, and its impact on the build order and demo. Amendments are
recorded by bumping the version below.

**Versioning policy** (semantic):

- **MAJOR**: backward-incompatible governance or principle removal/redefinition.
- **MINOR**: a new principle or section, or materially expanded guidance.
- **PATCH**: clarifications, wording, and non-semantic refinements.

**Compliance**: Every change is checked against these principles before merge.
The two NON-NEGOTIABLE principles (I and II) are hard gates — a change that
violates either MUST NOT be merged. Complexity that appears to require violating
a principle MUST be justified in writing, or the feature MUST be cut.

**Version**: 1.2.1 | **Ratified**: 2026-06-13 | **Last Amended**: 2026-06-14
