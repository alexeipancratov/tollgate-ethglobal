# Data Model: Escalation, Hold & Human Approval

Extends the 001 data model. Changes are marked **CHANGE** / **NEW**. Types live in
`shared/types.ts`; tables in `be/server/store/schema.ts`.

## Action (unchanged)

`id`, `description`, `amount`, `counterparty | null`, `createdAt` (epoch ms).

## ClearanceDecision (CHANGE)

| Field | Type | Notes |
|-------|------|-------|
| `actionId` | string | references Action |
| `outcome` | `"proceed" \| "escalate"` | **CHANGE**: widened from `proceed`-only |
| `policy` | `"per-action-cap"` | **CHANGE**: the rule that decided (was `pass-through`) |
| `decidedAt` | number | epoch ms |

## PendingApproval (NEW)

A held action awaiting a human decision.

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | approval id (UUID) |
| `actionId` | string | references Action |
| `status` | `"pending" \| "approved" \| "rejected"` | lifecycle |
| `createdAt` | number | when escalated (epoch ms) |
| `resolvedAt` | number \| null | when resolved; null while pending |

**State transitions**: `pending → approved` or `pending → rejected` (terminal).
No other transitions; a resolved approval never changes again (FR-012).

**Invariants**:
- An approval exists iff its action's decision outcome is `escalate` (FR-003).
- `resolvedAt` is null iff `status === "pending"`.
- At most one `pending` approval at a time (single-agent assumption).

## Feed events (CHANGE — now a union)

Streamed to consoles; ordered by `seq` (monotonic, server-assigned).

**DecisionFeedEvent** (existing shape):

| Field | Type | Notes |
|-------|------|-------|
| `type` | `"decision"` | |
| `action` | Action | |
| `decision` | ClearanceDecision | outcome proceed → "auto-approved"; escalate → "held" |
| `seq` | number | |

**ResolutionFeedEvent** (NEW):

| Field | Type | Notes |
|-------|------|-------|
| `type` | `"resolution"` | |
| `approvalId` | string | which approval |
| `actionId` | string | which action (to update the held row) |
| `outcome` | `"approved" \| "rejected"` | |
| `seq` | number | |
| `resolvedAt` | number | epoch ms |

`FeedEvent = DecisionFeedEvent | ResolutionFeedEvent`.

## Persistence (SQLite via Drizzle)

- `actions`, `decisions` — unchanged from 001 (`decisions.outcome` now also stores
  `escalate`; `decisions.policy` stores `per-action-cap`).
- **NEW** `approvals` table: `id` (PK), `action_id` (FK → actions), `status`,
  `created_at`, `resolved_at` (nullable).
- Store helpers:
  - `createApproval(actionId): string` — insert pending, return id.
  - `getApproval(id): PendingApproval | null`.
  - `listPending(): PendingApproval[]` — for discoverability (FR-008).
  - `resolveApproval(id, status): { ok: true, approval } | { ok: false, reason: "not_found" | "already_resolved" }` — conditional update (FR-011/FR-012).
  - `recentHistory(limit)` — **CHANGE**: returns the merged ordered stream of
    decision + resolution feed events for the snapshot.

## Derived: "performed" set (audit)

Not stored explicitly. Performed = decisions with `outcome = proceed` ∪ approvals
with `status = approved`. Used to verify SC-003 (rejected never performed) and
SC-006 (no held action performed before its approval).

## Policy input (CHANGE)

`PolicyState` now carries the threshold: `{ perActionThreshold: number }`. The
pure rule: `amount > perActionThreshold ? escalate : proceed`. Threshold is
injected by the gate from config — the policy reads no env, stays pure.
