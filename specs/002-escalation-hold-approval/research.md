# Research: Escalation, Hold & Human Approval

The stack is unchanged from 001; this slice's open questions are about *how* the
agent waits and *how* resolution is modeled. No `NEEDS CLARIFICATION` remain.

## Decision: Agent wait mechanism — short-poll the approval status

- **Decision**: On an `escalate` response, the agent receives an `approvalId` and
  polls `GET /approvals/:id` on a short interval (~400ms) until the status is
  `approved` or `rejected`. It performs the action only on `approved`.
- **Rationale**: Makes the trust boundary obvious and verifiable (no decision →
  no action; FR-004/SC-006) and keeps the agent simple. Resumes within ~1s of a
  resolution (SC-002) at a 400ms poll. No held HTTP connection, no extra transport.
- **Alternatives considered**: Long-poll / blocking the `/clearance` request until
  resolved (ties up a server request for an unbounded human delay); agent
  subscribing over WebSocket (adds a second consumer of the stream and bidirectional
  complexity for one waiting agent). Polling is the least machinery for a single
  agent at demo scale.

## Decision: Resolution is a stub backend endpoint surfaced as feed-row controls

- **Decision**: `POST /approvals/:id/resolve { outcome: "approve" | "reject" }` is
  the resolution action. The console renders held feed rows with temporary
  Approve/Reject buttons that call it. No separate inbox panel.
- **Rationale**: The spec allows "a backend resolve endpoint / temporary console
  action". Buttons on held rows make the demo clickable now without building the
  real approvals inbox (a later slice). Approve writes a plain authorization record
  — the Ledger signature replaces this exact endpoint's trust later (device-last).
- **Alternatives considered**: curl-only resolution (not demo-friendly); a full
  approvals inbox panel with transparency (explicitly the later slice, out of scope).

## Decision: "Performed" is derived, not separately recorded

- **Decision**: Do not add a persisted "performed" record or an agent→backend
  completion callback. Define the performed set as: decisions with outcome
  `proceed` ∪ approvals with status `approved`.
- **Rationale**: Keeps the audit honest and the slice small. SC-003 (rejected never
  performed) holds because a rejected approval is never in the set. SC-006 (held
  action not performed before approve) holds because "performed" of an escalated
  action is defined as its approval reaching `approved` (with `resolvedAt`), which
  the agent observes before acting. Verifiable purely from persisted state.
- **Alternatives considered**: An agent callback `POST /approvals/:id/performed`
  (extra endpoint + round-trip for a no-op mock; redundant with the approval state).

## Decision: Idempotent resolution via conditional update

- **Decision**: `resolveApproval(id, outcome)` updates the row only when its status
  is `pending`; returns the resolved approval, or a typed "not found" / "already
  resolved" result otherwise. The endpoint maps those to 404 / 409.
- **Rationale**: Satisfies FR-011 (unknown → safe no-op) and FR-012 (resolve
  exactly once; action performed at most once) with a single guarded write — no
  races at single-agent demo scale.
- **Alternatives considered**: Unconditional update (would allow flipping an
  already-resolved approval); optimistic-locking/versioning (overkill here).

## Decision: Threshold configuration

- **Decision**: A single per-action amount threshold from env (`TOLLGATE_THRESHOLD`,
  default `5.00`), passed by the gate into the pure policy as part of `PolicyState`.
  The policy itself reads no env.
- **Rationale**: Keeps the policy pure (config injected, not read inside). Default
  `5.00` makes the dataset-license ($12.50) and spiked amounts ($20–100) escalate
  while cents-level calls proceed — matching the demo intent.
- **Alternatives considered**: Hardcoding in the policy (impure, untunable);
  per-rule config object (premature — one rule this slice).

## Decision: Feed event model — add a `resolution` event kind

- **Decision**: Widen `FeedEvent` to a union: `decision` (proceed/escalate) and a
  new `resolution` (approved/rejected, references the action/approval). The console
  shows escalate rows as "held" and updates them on the resolution event.
- **Rationale**: One ordered stream still drives the whole view (FR-010). Snapshot
  replays both kinds so a late joiner sees current held/resolved state.
- **Alternatives considered**: Mutating prior events in place over the wire (harder
  to order and replay); a separate approvals socket (more transport).

## Resolved unknowns

- Wait mechanism (poll), resolution surface (stub endpoint + row buttons),
  performed-semantics (derived), idempotency (guarded update), threshold config,
  and the feed event model are all decided. Nothing blocks planning.
- Deferred by design: the remaining rule stack, the real approvals inbox /
  transparency panels, and all Ledger signing.
