# Feature Specification: Ledger Simulator Signing Path

**Feature Branch**: `003-ledger-simulator-signing`

**Created**: 2026-06-14

**Status**: Draft

**Input**: User description: "Replace the stub approval with a real signing flow on a Ledger approval device, run in a simulator for this slice. The human connects the device once, then approves a held action by confirming on the device; the device produces a signature over an approval payload (the signature IS the authorization). The backend releases the action only after verifying the signature came from the authorized approver and matches the action. Real device is the next slice; raw-hex signing first (human-readable display deferred)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Approve a held action with a real device signature (Priority: P1)

A held (escalated) action is awaiting approval. The human connects the Ledger
approval device once, then clicks Approve on the held action. The device shows the
approval and the human confirms it physically on the device, producing a signature.
The action is released — and the agent resumes — only after the backend confirms
that signature is valid. The signature, not the click, is what authorizes the action.

**Why this priority**: This is the product's defining moment — a hardware-anchored
human authorization replacing the software-only stub. Everything in this slice
exists to make it real and reliable (on the simulator first).

**Independent Test**: With a held action present, connect the device, click Approve,
confirm on the (simulated) device; verify the action is released and the agent
resumes only after the confirmation, and that nothing is released on the click alone.

**Acceptance Scenarios**:

1. **Given** a held action and a connected device, **When** the human clicks Approve
   and confirms on the device, **Then** the backend verifies the resulting signature
   and releases the action, and the agent performs it.
2. **Given** a held action, **When** the human clicks Approve **without** having
   connected the device, **Then** the system prompts to connect first and nothing is
   released (no silent failure).
3. **Given** a connected device, **When** the human approves a second held action
   later, **Then** a fresh on-device confirmation is required (the prior connection
   does not auto-authorize).

---

### User Story 2 - Only a valid, authorized signature releases an action (Priority: P2)

The backend releases a held action only when the approval signature both (a) comes
from the configured authorized approver and (b) matches that specific action. Any
other signature is refused and the action stays held.

**Why this priority**: The verification is what makes the signature meaningful — it
is the trust boundary in cryptographic form. An approval that releases on an
unverified or mismatched signature would be theatre.

**Independent Test**: Submit an approval whose signature is from a different key, or
whose signed details don't match the held action; confirm the backend refuses it and
the action remains held.

**Acceptance Scenarios**:

1. **Given** a held action, **When** an approval signature is submitted that does not
   recover to the authorized approver, **Then** the action is NOT released and stays
   held.
2. **Given** a held action, **When** a signature is submitted whose signed payload
   does not match the action's details, **Then** it is refused and the action stays
   held.
3. **Given** a valid signature for one action, **When** it is submitted for a
   different action, **Then** it is refused (the signature binds to the specific
   action).

---

### User Story 3 - Graceful refusal, cancel, and reject (Priority: P3)

If the human declines on the device, or the device disconnects mid-signing, the
approval simply does not happen — shown as a neutral cancelled outcome, with the
action still held and retryable, not an error. Rejecting an action remains a plain
click with no device involvement.

**Why this priority**: A trustworthy checkpoint must handle "no" and interruptions
calmly. Important for demo robustness, but the happy path (US1) and verification
(US2) are the core.

**Independent Test**: Decline on the device (and separately, disconnect mid-sign);
confirm the action stays held and is shown as cancelled, then can be approved again.
Separately, click Reject and confirm no device interaction occurs.

**Acceptance Scenarios**:

1. **Given** a held action being approved, **When** the human declines on the device,
   **Then** the action remains held, is shown as cancelled (neutral, not an error),
   and can be approved again.
2. **Given** an approval in progress, **When** the device disconnects, **Then** the
   action remains held and retryable.
3. **Given** a held action, **When** the human clicks Reject, **Then** the action is
   dropped with no device interaction (unchanged from the prior slice).

---

### Edge Cases

- Approve clicked before connecting the device → prompt to connect; no silent failure.
- Signature from a non-authorized key → refused, action held.
- Tampered/mismatched payload (e.g. different amount than the held action) → refused.
- Replay: a previously valid signature submitted for a different action → refused.
- Approve attempted on an already-resolved action → safe no-op (idempotency preserved).
- Device declines / times out / disconnects mid-sign → cancelled, action held, retryable.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The console MUST provide an explicit action to connect the approval
  device, establishing a device session before any signing can occur.
- **FR-002**: Approving a held action MUST require a signature produced on the
  approval device over an approval payload that represents that action's
  authorization. The signature is the approval.
- **FR-003**: Each approval MUST require a fresh on-device confirmation; an existing
  device session MUST NOT auto-authorize subsequent approvals.
- **FR-004**: The backend MUST release a held action ONLY after verifying that the
  signature (a) recovers to the configured authorized approver and (b) matches the
  held action's details.
- **FR-005**: If verification fails (wrong signer, mismatched payload, malformed
  signature, wrong action), the backend MUST NOT release the action; it stays held.
- **FR-006**: A device-side refusal or a disconnect during signing MUST surface as a
  neutral cancelled outcome (not an error); the action MUST remain held and retryable.
- **FR-007**: Reject MUST remain available as a plain action with no device interaction.
- **FR-008**: The audit trail MUST record each approval signature (or its hash)
  alongside the resolution, and MUST record verification failures and cancellations.
- **FR-009**: The device implementation MUST be swappable between simulated and real
  via a single configuration switch, defaulting to the simulator in this slice.
- **FR-010**: The authorized approver identity and the signing key path MUST be
  developer-set configuration, never entered or chosen by the user.
- **FR-011**: Sub-threshold (auto-proceed) actions MUST be unaffected and MUST require
  no device interaction.
- **FR-012**: The agent's freeze/resume behavior MUST be unchanged — it resumes when an
  action is released (now gated by a verified signature) and drops on reject.

### Key Entities

- **Approval payload**: The canonical authorization data that is signed — binds to a
  specific held action (its id and details). What the device displays and signs.
- **Approval signature**: The cryptographic signature plus its recovered signer;
  recorded in the audit trail.
- **Authorized approver**: The configured identity whose signature is required to
  release a held action.
- **Device session**: The connection to the approval device (simulated in this slice).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A held action is released only after a valid signature from the
  authorized approver; it stays held until then.
- **SC-002**: After the human confirms on the device, the action is released and the
  agent resumes within ~2 seconds.
- **SC-003**: 100% of approvals whose signature is not from the authorized approver,
  or does not match the action, are refused with the action left held.
- **SC-004**: 100% of device refusals/disconnects leave the action held and retryable,
  shown as cancelled (not an error).
- **SC-005**: Switching from the simulator to the real device requires only a single
  configuration change, with no other change to the signing flow (the swappable seam
  exists).
- **SC-006**: Sub-threshold actions and the reject path require zero device interaction.
- **SC-007**: Every approval attempt (verified release, refusal, or cancel) is recorded
  in the audit trail with its signature/hash or outcome.

## Assumptions

- **Connection model**: an explicit "Connect Ledger" control establishes the device
  session once; subsequent approvals reuse it but each still requires a fresh on-device
  confirmation (the session is a transport handle, not an authorization).
- **Display fidelity**: this slice ships raw-hex (blind) signing first — the device
  shows unstructured data. Human-readable on-device display (a descriptor + Clear
  Signing) is a deferred fast-follow and is out of scope here.
- **Configuration**: the signing key path and the authorized approver identity are
  developer-set constants, never user input.
- **Simulator scope**: this slice targets the device simulator; flipping the
  configuration switch to the real device is the next roadmap item.
- Builds on the escalation slice (held actions, the resolve seam, and the existing
  Approve/Reject controls); the approve path is replaced by the signed-approval path,
  reject is unchanged.
- Local/demo environment; the device interaction is hosted in the browser console.

## Dependencies

- Builds on `002-escalation-hold-approval`: held actions, the approval resolution
  seam, the audit trail, and the Approve/Reject controls already exist.
- The detailed device-integration steps are governed by the Ledger DMK skills in
  `.agents/skills/` (authoritative), applied during planning/implementation.
- Explicitly NOT dependent on: the real physical device (next slice), human-readable
  Clear Signing, the remaining policy rule stack, the polished approvals inbox, or any
  on-chain transaction / payment settlement.
