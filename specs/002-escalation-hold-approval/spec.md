# Feature Specification: Escalation, Hold & Human Approval (stubbed)

**Feature Branch**: `002-escalation-hold-approval`

**Created**: 2026-06-13

**Status**: Draft

**Input**: User description: "Add an escalate outcome and a minimal per-action spending threshold so actions over the threshold are escalated instead of auto-proceeding. The gate holds the action (pending approval) and the agent freezes until a human approves or rejects it (resolution stubbed — no Ledger yet). Sub-threshold actions keep auto-proceeding. The audit trail records escalations and resolutions."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Expensive action freezes until approved (Priority: P1)

The agent is streaming auto-approved actions. It generates an expensive action
that crosses the spending line; instead of proceeding, that action is held and
the agent stops — the feed visibly pauses on it. A human approves the held
action, the agent then performs it, and the stream resumes.

**Why this priority**: This is the product's signature moment — autonomy bounded
by a human checkpoint. Without it there is no demo and nothing for later slices
(real approvals UI, Ledger) to build on.

**Independent Test**: Run the system; when an over-threshold action appears, the
feed pauses and no further actions are performed; approve the held action through
the resolution control; the agent performs it and resumes streaming.

**Acceptance Scenarios**:

1. **Given** the agent is streaming, **When** it generates an action whose amount
   exceeds the threshold, **Then** that action is held (not performed) and shown
   as awaiting approval, and the agent performs no further actions while it waits.
2. **Given** an action is held awaiting approval, **When** a human approves it,
   **Then** the agent performs that action and resumes streaming new actions.
3. **Given** an action is held, **When** no resolution has occurred, **Then** the
   action remains unperformed indefinitely (the gate never auto-releases it).

---

### User Story 2 - Rejecting a held action drops it (Priority: P2)

A human reviews a held action and rejects it. The action is never performed; the
agent discards it and resumes streaming.

**Why this priority**: Rejection is the other half of a meaningful checkpoint — an
approval gate that can only approve is not a gate. It builds directly on US1.

**Independent Test**: Hold an action, reject it through the resolution control,
confirm the action is never performed and the agent resumes.

**Acceptance Scenarios**:

1. **Given** an action is held awaiting approval, **When** a human rejects it,
   **Then** the action is not performed and the agent resumes streaming.
2. **Given** a held action was rejected, **When** the audit trail is inspected,
   **Then** the action shows as rejected and has no "performed" record.

---

### User Story 3 - Escalations and resolutions are auditable and visible (Priority: P3)

Every escalation and its outcome (approved or rejected) is recorded and reflected
in the live view, so the policy gate is seen working rather than hidden.

**Why this priority**: Transparency is required for the demo's credibility and the
audit-trail promise, but the freeze/approve loop (US1/US2) can be exercised before
the lifecycle display is polished.

**Independent Test**: Drive several escalations with mixed approve/reject outcomes;
confirm each appears in the audit trail with its outcome and timestamps, and the
live view reflects held → approved/rejected transitions.

**Acceptance Scenarios**:

1. **Given** an action was escalated and resolved, **When** the audit trail is
   inspected, **Then** it shows the escalation and the resolution (approved or
   rejected) with timestamps.
2. **Given** an action is held, **When** viewing the live feed, **Then** the held
   action is distinguishable from auto-approved ones and updates to its resolved
   state once decided.

---

### Edge Cases

- **Unknown approval**: resolving an approval id that does not exist is rejected
  safely with no side effect.
- **Double resolution**: resolving an already-resolved approval has no effect (the
  first outcome stands); an action is performed at most once.
- **Threshold boundary**: an action exactly at the threshold auto-proceeds (only
  strictly-greater amounts escalate); a very high threshold escalates nothing, a
  zero threshold escalates everything.
- **Agent restart while holding**: if the agent restarts while an action is held,
  it does not resurrect the frozen action; any stale pending record can be
  resolved harmlessly and is not performed by the restarted agent.
- **Gate unavailable during resolution**: the resolution attempt fails cleanly and
  can be retried; the action stays held.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The policy MUST classify each action against a single configurable
  per-action spending threshold: amount at or below the threshold → `proceed`;
  amount strictly above → `escalate`. This is the first rule of the rule stack and
  MUST remain a pure function.
- **FR-002**: Sub-threshold actions MUST continue to auto-proceed and stream
  exactly as before (no regression from the scaffold).
- **FR-003**: For an escalated action, the gate MUST create a pending-approval
  record and MUST NOT return `proceed`; the action is held until a human resolves
  it.
- **FR-004**: The agent MUST freeze on an escalated action — it MUST NOT perform
  the action and MUST stop performing further actions until the held action is
  resolved (trust boundary).
- **FR-005**: A human MUST be able to resolve a pending approval as either
  `approve` or `reject` through the resolution control (stubbed in this slice).
- **FR-006**: On `approve`, the held action MUST be released so the agent performs
  it, after which the agent resumes streaming.
- **FR-007**: On `reject`, the held action MUST NOT be performed; the agent drops
  it and resumes streaming.
- **FR-008**: Pending approvals MUST be discoverable (a human can see which
  action(s) await resolution and identify them) so resolution is possible.
- **FR-009**: The audit trail MUST record each escalation and its resolution
  (approved/rejected) with timestamps and the associated action.
- **FR-010**: The live view MUST distinguish a held/escalated action from
  auto-approved ones and reflect its transition to approved or rejected.
- **FR-011**: Resolving an unknown approval MUST fail safely with no side effect.
- **FR-012**: Each pending approval MUST be resolvable exactly once; subsequent
  resolutions have no effect, and the associated action is performed at most once.

### Key Entities

- **Action**: As defined in the scaffold (id, description, amount, counterparty,
  timestamp).
- **ClearanceDecision**: The gate's outcome for an action, now one of `proceed` or
  `escalate` (widened from the scaffold's `proceed`-only).
- **PendingApproval**: A held action awaiting a human decision. Attributes:
  approval id, referenced action, created timestamp, status (pending → approved |
  rejected), resolved timestamp.
- **Audit entry**: A durable record of an escalation and of a resolution, with
  outcome and timestamps (extends the scaffold's persisted history).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An above-threshold action is held and the agent performs no further
  actions until it is resolved (the feed visibly pauses on it).
- **SC-002**: After a human approves a held action, the agent performs it and
  resumes streaming within ~1 second of the resolution.
- **SC-003**: After a human rejects a held action, that action is never performed
  (verifiable from the audit trail) and the agent resumes.
- **SC-004**: 100% of sub-threshold actions continue to auto-proceed with no
  regression compared to the scaffold.
- **SC-005**: Every escalation and its resolution appears in the audit trail with
  the correct outcome and timestamps.
- **SC-006**: No held action is ever performed before an `approve` resolution
  (verifiable from audit ordering — the performed record never precedes the
  approval).
- **SC-007**: A pending approval is resolved exactly once; repeat or unknown
  resolutions produce no additional effect.

## Assumptions

- A single agent instance freezes on at most one escalated action at a time, so at
  most one pending approval exists at a time. Concurrent/multi-agent escalations
  are out of scope for this slice.
- The threshold is a single configurable per-action amount, with a demo default
  chosen so the expensive actions (e.g. the dataset-license purchase and spiked
  amounts) escalate while cents-level actions proceed.
- Resolution is a STUB — a backend resolution action / temporary console control.
  Approve in this slice produces a plain authorization record, NOT a cryptographic
  signature; the real approvals inbox UI and the Ledger hardware signature are
  later roadmap slices that replace the stub.
- The audit trail extends the scaffold's existing persisted history.
- The agent does not persist a frozen action across its own restart.

## Dependencies

- Builds on the `001-scaffold-walking-skeleton` feature: the gate, the pure policy
  module, persistence/audit, the live feed, and the agent loop already exist; this
  feature extends them (adds `escalate`, hold/resolve, and the freeze behavior).
- Explicitly NOT dependent on any Ledger device, signing, or real approvals UI —
  those are deferred to later roadmap items.
