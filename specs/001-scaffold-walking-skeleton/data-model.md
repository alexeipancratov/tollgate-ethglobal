# Data Model: Walking-Skeleton Scaffold

Entities map directly to the spec's Key Entities. Types live in `shared/types.ts`;
persisted tables live in `be/server/store/schema.ts`. All identifiers are strings
(UUID/ULID); all timestamps are epoch milliseconds (number) for ordering.

## Action

A single mocked unit of sensitive work the agent wants to perform.

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | Unique action id (agent-generated) |
| `description` | string | Human-readable, e.g. "call premium API" |
| `amount` | number | Monetary amount in a single fixed currency unit (e.g. USD) |
| `counterparty` | string \| null | Optional label; reserved for the future per-counterparty rule |
| `createdAt` | number | Generation timestamp (epoch ms) |

**Validation**: `amount >= 0`; `description` non-empty. (Stricter rules belong to
the later policy slice, not the schema.)

## ClearanceDecision

The gate's response to a clearance request for an action.

| Field | Type | Notes |
|-------|------|-------|
| `actionId` | string | References `Action.id` |
| `outcome` | `"proceed"` | Only value in this slice (enum widened later to add `"escalate"`) |
| `policy` | `"pass-through"` | Which policy produced it; future: `"rule-stack"` |
| `decidedAt` | number | Decision timestamp (epoch ms) |

**Invariant (Principle II / FR-002)**: an action is only recorded as performed
after a `ClearanceDecision` with `decidedAt >= action.createdAt` exists for it.

## FeedEvent

What is streamed to consoles for display. A thin envelope combining an action and
its decision.

| Field | Type | Notes |
|-------|------|-------|
| `type` | `"decision"` | Event kind (room for more kinds later) |
| `action` | Action | The action |
| `decision` | ClearanceDecision | Its decision |
| `seq` | number | Monotonic per-server sequence for stable feed ordering (FR-010) |

## Relationships & ordering

- One `Action` ↔ one `ClearanceDecision` in this slice (1:1). Later slices allow
  an action to be pending then resolved; the 1:1 assumption is scaffold-only.
- Feed and history order by `seq` (server-assigned) so the live feed and the
  persisted history agree even under rapid generation (FR-010, SC-003).

## Persistence (SQLite via Drizzle)

- `actions` table: columns mirror **Action** (`id` PK, `description`, `amount`,
  `counterparty` nullable, `created_at`).
- `decisions` table: columns mirror **ClearanceDecision** (`action_id` FK → actions,
  `outcome`, `policy`, `decided_at`, plus `seq` integer for ordering).
- `recentHistory(limit)` returns the last `limit` joined action+decision rows
  ordered by `seq` descending (used for the late-joiner snapshot, US3 / SC-005).
- History survives restart because it is on disk (FR-007 / SC-006).

## State (policy input)

The pass-through policy is pure: `(action, state) -> decision`. In this slice
`state` is unused (always proceeds) but the parameter exists so the signature
does not change when the rule stack arrives. Future `state` will carry rolling
spend, velocity counters, and per-counterparty totals.
