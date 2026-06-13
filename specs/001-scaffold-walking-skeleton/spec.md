# Feature Specification: Walking-Skeleton Scaffold

**Feature Branch**: `001-scaffold-walking-skeleton`

**Created**: 2026-06-13

**Status**: Draft

**Input**: User description: "Walking-skeleton scaffold — a thin, end-to-end runnable shell where the agent requests clearance from the backend gate (trivial pass-through policy), the backend persists each action and streams events, and the console renders a live feed. No real rule stack, escalation, approvals, or Ledger yet."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Live feed of autonomous actions (Priority: P1)

A demo viewer opens the console and watches a stream of the agent's actions
appear in real time, each one labeled as auto-approved, scrolling as new actions
are generated. This makes the agent's autonomy visible.

**Why this priority**: This is the core demo surface and the minimum proof that
the whole pipe — agent generates an action, asks the gate, the gate decides, the
console shows it — works end to end. Without it there is nothing to demo and no
foundation for later slices.

**Independent Test**: Start the system and open the console; confirm that newly
generated actions appear in the feed within a couple of seconds, each showing its
description, amount, and an auto-approved status, and that the feed keeps updating
on its own.

**Acceptance Scenarios**:

1. **Given** the system is running, **When** the agent generates a new action,
   **Then** that action appears in the console feed within ~1 second, showing its
   description, amount, and an "auto-approved" status.
2. **Given** the console is open and idle, **When** the agent continues
   generating actions, **Then** new entries continue to appear in order without
   any manual refresh.
3. **Given** an action has been generated, **When** the gate has not yet returned
   a decision, **Then** the agent has not acted on it (the action only counts as
   done after a decision is received).

---

### User Story 2 - Durable action history (Priority: P2)

Every action and its clearance decision is recorded so there is a persistent
history that survives a restart and can be inspected later — the foundation of
the audit trail.

**Why this priority**: Persistence is required for the audit trail the product
promises and for late-joining viewers, but the live demo can be shown without it
first. It builds directly on US1.

**Independent Test**: Generate several actions, stop and restart the backend, then
query the history and confirm previously generated actions and their decisions are
still present and in order.

**Acceptance Scenarios**:

1. **Given** several actions have been generated, **When** the recorded history is
   inspected, **Then** every generated action appears exactly once with its
   decision and a timestamp.
2. **Given** actions have been recorded, **When** the backend is restarted,
   **Then** the previously recorded history is still available.

---

### User Story 3 - Late-joining console (Priority: P3)

A viewer who opens the console after the agent has already been running for a
while sees recent activity immediately and then continues to receive live
updates, rather than starting from an empty screen.

**Why this priority**: Improves the demo experience and proves the stream and the
history work together, but it is not required for the first runnable end-to-end
slice. Depends on US1 and US2.

**Independent Test**: Let the system run and generate actions, then open a fresh
console; confirm recent actions are shown immediately and new ones continue to
stream in.

**Acceptance Scenarios**:

1. **Given** the agent has generated actions before the console connects,
   **When** the console connects, **Then** it shows recent activity within a few
   seconds and then receives new actions live.

---

### Edge Cases

- A console connects while no actions have been generated yet → it shows an empty
  feed and begins updating as actions arrive.
- The backend gate is temporarily unavailable when the agent requests a clearance
  → the agent waits and does not act on the action; it resumes once the gate is
  reachable. No action is ever acted upon without a decision.
- The console loses its connection and reconnects → it resumes receiving live
  updates without requiring a full restart.
- Actions are generated in rapid succession → the feed and the recorded history
  preserve their order with no dropped entries.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The agent MUST continuously generate a stream of mocked, priced
  actions, each with a human-readable description and a monetary amount (e.g.
  "call premium API — $0.04"), at a pace suitable for a live demo.
- **FR-002**: For every action, the agent MUST request a clearance decision from
  the backend gate and MUST NOT treat the action as performed until it receives a
  decision. (Trust boundary, even with a stub policy.)
- **FR-003**: The gate MUST decide each clearance request using a pass-through
  policy that returns "proceed" for all actions in this slice. (No caps, windows,
  velocity, or counterparty rules yet.)
- **FR-004**: The gate MUST record every action together with its decision and a
  timestamp in durable storage.
- **FR-005**: The gate MUST publish an event for every decision to connected
  consoles in real time.
- **FR-006**: The console MUST display incoming events as a live, self-updating
  feed showing each action's description, amount, and decision status
  ("auto-approved").
- **FR-007**: The recorded history MUST survive a backend restart and remain
  inspectable.
- **FR-008**: A console connecting after actions have already occurred MUST be
  able to show recent activity, then continue receiving live updates.
- **FR-009**: The system MUST run end-to-end with a single documented startup so
  the full agent → gate → console pipe can be demonstrated without manual
  intervention between components.
- **FR-010**: Action ordering MUST be preserved in both the live feed and the
  recorded history.

### Key Entities

- **Action**: A single mocked unit of sensitive work the agent wants to perform.
  Attributes: identifier, description, amount, optional counterparty label,
  generation timestamp.
- **Clearance Decision**: The gate's response to a clearance request for an
  action. Attributes: reference to the action, outcome (always "proceed" in this
  slice), decision timestamp, indication that it came from the pass-through
  policy.
- **Feed Event**: A record streamed to consoles representing an action and its
  decision for display.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A viewer with the console open sees a newly generated action appear
  in the feed within 1 second of its generation.
- **SC-002**: The system runs unattended for at least 5 continuous minutes,
  producing a visibly streaming feed, with no manual intervention required.
- **SC-003**: 100% of generated actions appear in both the live feed and the
  recorded history, with none dropped or duplicated, over a 5-minute run.
- **SC-004**: No action is ever marked performed without first receiving a
  clearance decision (verifiable from the recorded history: every performed action
  has a corresponding decision that precedes it).
- **SC-005**: A console opened after the agent has been running shows recent
  activity within 3 seconds of connecting.
- **SC-006**: Recorded history from before a backend restart is fully present
  after the restart.

## Assumptions

- The pass-through policy approves every action; the real rule stack (per-action
  cap, cumulative budget window, velocity limit, per-counterparty cap) is a later
  feature and out of scope here.
- Actions are mocked: a priced descriptor with no real payment, settlement, or
  external service call. "Performing" an action is a no-op recorded as done.
- A single agent instance and a small number of console viewers (demo scale) are
  assumed; high-concurrency load is not a goal.
- The system runs in a local/demo environment for development and the demo.
- Escalation, the approvals inbox, human approval, and any Ledger device
  interaction or signature are explicitly out of scope for this slice and arrive
  in later roadmap items.
- Smart contracts, real payment rails (Arc/Circle), and server wallets (Dynamic)
  are not present, per the project scope boundaries.
