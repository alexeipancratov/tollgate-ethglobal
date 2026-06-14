# Feature Specification: Real Ledger Flex Signing

**Feature Branch**: `004-real-flex-signing`

**Created**: 2026-06-14

**Status**: Draft

**Input**: User description: "Real Flex from the roadmap — implement the real Ledger device signer behind the existing approval seam, so a held action is approved with a genuine secure-element signature on the Ledger Flex. Flip from the simulator to the real device by configuration; the backend verification and the approval payload are unchanged. Raw-hex signing first; Clear Signing deferred."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Approve a held action on the real Ledger Flex (Priority: P1)

A held (escalated) action awaits approval. The human connects the physical Ledger
Flex, clicks Approve, reviews the approval on the device, and confirms it with the
secure element. The backend verifies the resulting signature and releases the
action; the agent resumes. This real on-device signature is the product's headline
moment.

**Why this priority**: This is the entire point of the product and the primary
prize (Principle I) — autonomy bounded by a hardware-anchored human authorization.
Everything prior built toward making this real.

**Independent Test**: With the real device selected and the approver configured to
the device's address, hold an action, click Approve, confirm on the Flex; the
action releases only after the on-device confirmation and the backend's
verification.

**Acceptance Scenarios**:

1. **Given** a held action and a connected, unlocked Flex on the Ethereum app,
   **When** the human clicks Approve and confirms on the device, **Then** the
   device produces a signature, the backend verifies it against the authorized
   approver, and the action is released.
2. **Given** a held action, **When** the human clicks Approve without confirming on
   the device, **Then** the action is NOT released until the on-device confirmation
   occurs.

---

### User Story 2 - Bring the device to a signable state (Priority: P2)

A human can get a fresh device ready to sign: connect it (an explicit action),
unlock it if locked, and open the Ethereum app if needed — guided by clear prompts.
The operator can also read the device's address so it can be configured as the
authorized approver.

**Why this priority**: Without readiness handling, the headline flow (US1) fails on
any real-world device state (locked, wrong app). Needed for a reliable demo, but
secondary to proving the signature itself.

**Independent Test**: Start from a locked device on the dashboard; confirm the
console guides unlock and opening the Ethereum app, and can display the device's
address for approver configuration; then US1 succeeds.

**Acceptance Scenarios**:

1. **Given** a locked device, **When** the human starts an approval, **Then** the
   console prompts to unlock (enter PIN) rather than failing silently.
2. **Given** the device is not on the Ethereum app, **When** the human starts an
   approval, **Then** the console prompts to open the Ethereum app.
3. **Given** a connected device, **When** the operator views its address, **Then**
   it is displayed so it can be set as the authorized approver.

---

### User Story 3 - Refusal, disconnect, and simulator fallback (Priority: P3)

If the human declines on the device, or it disconnects mid-signing, the approval
does not happen — shown neutrally, action still held and retryable. And if the real
device is unavailable entirely, the team can fall back to the simulator by
configuration so a complete demo still runs.

**Why this priority**: Robustness and the device-last safety net. Important for a
dependable live demo, but the happy path and readiness come first.

**Independent Test**: Decline on the device → action stays held/cancelled. Unplug
mid-sign → recoverable error, still held. Switch configuration back to the simulator
→ the full approval flow still works.

**Acceptance Scenarios**:

1. **Given** an approval in progress, **When** the human rejects on the device,
   **Then** the action stays held, is shown as cancelled (neutral), and is retryable.
2. **Given** an approval in progress, **When** the device disconnects, **Then** a
   clear recoverable message is shown and the action stays held.
3. **Given** the device is unavailable, **When** the configuration selects the
   simulator, **Then** the complete approval flow works without the device.

---

### Edge Cases

- Device locked at approval time → prompt to unlock (PIN).
- Wrong app / dashboard open → prompt to open the Ethereum app.
- More than one device connected → cannot auto-select; surface for human selection.
- User rejects on the device → neutral cancelled, action held.
- Cable unplugged / transport error mid-sign → recoverable error, action held.
- Unsupported browser (no device-USB support) → clear "use a Chromium browser" guidance.
- Connected device's address ≠ configured approver → verification fails (401),
  surfaced as a clear misconfiguration message, action held.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A held action MUST be approvable on the physical Ledger Flex, producing
  a real secure-element signature over the same EIP-712 approval payload used by the
  simulator slice.
- **FR-002**: Selecting the real device vs. the simulator MUST be a single
  configuration change, with no other change to the approval flow (same seam).
- **FR-003**: The backend release path MUST be unchanged from the simulator slice —
  it verifies the signature recovers to the configured authorized approver and
  matches the held action; a real-device signature MUST pass it.
- **FR-004**: The authorized approver MUST be configurable to the connected device's
  address, and the console MUST be able to surface that address for configuration.
- **FR-005**: When the device is locked, on the wrong app, or on the dashboard, the
  console MUST guide the human (unlock / open the Ethereum app) rather than fail
  silently.
- **FR-006**: Connecting to the device MUST be initiated by an explicit user action
  (gesture) in a supported browser environment.
- **FR-007**: An on-device refusal MUST surface as a neutral cancelled outcome; the
  action stays held and retryable.
- **FR-008**: A device disconnect or transport error during signing MUST surface as a
  clear, recoverable error; the action stays held.
- **FR-009**: The simulator path MUST remain available as a fallback selectable by
  configuration, so a complete demo runs if the device stalls.
- **FR-010**: Friction encountered integrating the device (SDK, docs, device quirks)
  MUST be captured in a `DX-NOTES.md` as part of the submission.
- **FR-011**: Sub-threshold actions and the reject path MUST be unaffected and require
  no device interaction.

### Key Entities

- **Approval payload / signature / authorized approver**: As defined in the simulator
  slice (unchanged). The signature is now produced by the device's secure element.
- **Device session**: The connection to the physical Ledger Flex.
- **Device address**: The Ethereum address derived on the device; configured as the
  authorized approver.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A held action is released only after a real secure-element signature
  from the device that the backend verifies — demonstrable on camera (Principle I).
- **SC-002**: After the human confirms on the device, the action releases and the
  agent resumes within a few seconds.
- **SC-003**: Switching simulator ↔ real device requires only a single configuration
  change, with no change to the approval flow.
- **SC-004**: 100% of on-device refusals and disconnects leave the action held and
  retryable, shown neutrally (no crash/error-state).
- **SC-005**: A complete demo runs on the simulator when the device is unavailable
  (fallback by configuration).
- **SC-006**: Device-readiness issues (locked, wrong app, multiple devices) produce
  actionable guidance, not silent failure.
- **SC-007**: A `DX-NOTES.md` capturing the integration friction is part of the
  submission.

## Assumptions

- **Display fidelity**: raw-hex (blind) signing first — the device shows unstructured
  data. Human-readable on-device display (a descriptor + Clear Signing) is a deferred
  fast-follow and is out of scope here.
- **Key/path**: the Ethereum derivation path is a developer-set constant (the
  Ledger-standard Ethereum account); the authorized approver is configured to that
  account's device address.
- **Environment**: a Chromium-based browser on localhost (secure context), and a
  physical Ledger Flex with the Ethereum app installed and unlocked.
- **Unchanged from the simulator slice**: the EIP-712 approval payload, the
  `approve-signed` flow, and the backend verification. Only the signer implementation
  is new — it fills the existing `LedgerSigner` seam.
- **Fallback**: the simulator remains selectable by configuration (device-last
  safety; if the Flex stalls, the simulator demo still runs).
- **DX**: `DX-NOTES.md` begins in this slice (Principle VII).

## Dependencies

- Builds on `003-ledger-simulator-signing`: the swappable `ApprovalSigner` seam, the
  signed-approval endpoint, backend verification, and the held/feed flow already
  exist. This feature implements the real-device side of the seam.
- Requires a physical **Ledger Flex** with the Ethereum app, and a Chromium browser.
- The device integration is governed by the Ledger DMK skills in `.agents/skills/`
  (authoritative), applied during planning/implementation.
- Explicitly NOT dependent on: human-readable Clear Signing (ERC-7730), the remaining
  policy rule stack, the polished approvals inbox, or any on-chain transaction.
