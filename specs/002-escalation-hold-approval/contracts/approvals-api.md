# Contract: Approvals API (NEW)

The hold/resolve surface. Resolution is the STUB the Ledger signature replaces
later. Schemas in `shared/messages.ts` (Zod).

## GET /approvals

List pending approvals (discoverability, FR-008).

**Response 200**: `{ "approvals": [ PendingApproval, … ] }` where each
`PendingApproval` = `{ id, actionId, status, createdAt, resolvedAt, action }`
(includes the embedded action for display). Only `status === "pending"` are
returned.

## GET /approvals/:id

Status of one approval (the agent polls this while frozen).

**Response 200**: `{ "approval": PendingApproval }` (status `pending` | `approved` | `rejected`).
**Response 404**: unknown id → `{ "error": "not_found" }`.

## POST /approvals/:id/resolve

Resolve a pending approval (human action; stubbed).

**Request** (`ResolveRequest`): `{ "outcome": "approve" | "reject" }`

**Response 200**: `{ "approval": PendingApproval }` with `status` now `approved` or
`rejected` and `resolvedAt` set.

**Response 404**: unknown id → `{ "error": "not_found" }` (FR-011, safe no-op).

**Response 409**: already resolved → `{ "error": "already_resolved" }` (FR-012,
exactly-once; the first outcome stands).

### Server behavior

On a valid resolve of a `pending` approval: set `status`/`resolvedAt`, persist,
and broadcast a `resolution` feed event (`approved`/`rejected`). Approve does NOT
release the action itself — the frozen agent observes `approved` and performs it.
Reject leaves the action unperformed.

## Feed (WebSocket /feed) — CHANGE

Server → client messages gain the `resolution` event kind. The `snapshot` and
live `event` envelopes now carry either a `decision` or a `resolution` FeedEvent
(see data-model.md). The console renders escalate decisions as **held** rows and
updates them when their `resolution` event arrives.
