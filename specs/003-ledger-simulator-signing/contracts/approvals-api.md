# Contract: Approvals API — signed approval (CHANGE / NEW)

Extends the 002 approvals API. The signed approve replaces the stub approve; reject
is unchanged. Schemas in `shared/messages.ts`; the signed structure in
`shared/approval-typed-data.ts`.

## POST /approvals/:id/approve-signed (NEW)

Release a held action with a verified EIP-712 signature. The client sends ONLY the
signature; the backend rebuilds the typed data from its stored action.

**Request** (`ApproveSignedRequest`): `{ "signature": "0x…" }`

**Response 200**: `{ "approval": PendingApproval }` with `status: "approved"` and
`signature`/`signer` populated.

**Response 401** (verification failed — wrong signer, mismatched/tampered payload,
malformed signature): `{ "error": "signature_invalid" }`. The action stays held; an
`approval_events(verification_failed)` row is recorded.

**Response 404**: unknown approval id → `{ "error": "not_found" }`.

**Response 409**: already resolved → `{ "error": "already_resolved" }`.

### Server behavior

1. Look up the pending approval + its action (404 / 409 as above).
2. Rebuild `buildApprovalTypedData(action, approvalId)` from stored data.
3. `recoverTypedDataAddress({ ...typedData, signature })` (viem).
4. If recovered address == `TOLLGATE_APPROVER_ADDRESS` (case-insensitive) → resolve
   `approved`, persist `signature`/`signer`, record `signed_approved`, broadcast the
   resolution feed event (002). Else → 401, record `verification_failed`, leave held.

The agent (unchanged) performs the action only after the release — and release now
requires this verification (FR-004 / SC-006).

## POST /approvals/:id/signing-cancelled (NEW, audit-only)

Record that the human declined on the device or the signing was interrupted. No
state change — the action remains held and retryable (FR-006).

**Request**: `{}` (or `{ "reason": "declined" | "disconnected" }`)

**Response 200**: `{ "ok": true }`. Records `approval_events(signing_cancelled)`.
**Response 404**: unknown id.

## POST /approvals/:id/resolve (UNCHANGED — reject path)

`{ "outcome": "reject" }` → drops the action, no device interaction (002). The
`approve` outcome on this endpoint is superseded by `approve-signed` and is no
longer used by the console.

## Feed (WebSocket /feed) — UNCHANGED

The signed approval still resolves via the same path, so it emits the existing
`resolution` feed event (`approved`). No new event kinds.
