# Contract: Clearance API (agent → backend gate)

The single synchronous endpoint that enforces the trust boundary (Principle II,
FR-002). The agent MUST call this and receive a decision before treating an
action as performed. Schemas are defined in `shared/messages.ts` (Zod) and
validated on both ends.

## POST /clearance

Request a clearance decision for one action.

**Request body** (`ClearanceRequest`):

```json
{
  "action": {
    "id": "01J...",
    "description": "call premium API",
    "amount": 0.04,
    "counterparty": null,
    "createdAt": 1786000000000
  }
}
```

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `action.id` | string | yes | non-empty, unique per action |
| `action.description` | string | yes | non-empty |
| `action.amount` | number | yes | `>= 0` |
| `action.counterparty` | string \| null | no | label only in this slice |
| `action.createdAt` | number | yes | epoch ms |

**Response 200** (`ClearanceResponse`):

```json
{
  "decision": {
    "actionId": "01J...",
    "outcome": "proceed",
    "policy": "pass-through",
    "decidedAt": 1786000000050
  }
}
```

| Field | Type | Notes |
|-------|------|-------|
| `decision.actionId` | string | echoes `action.id` |
| `decision.outcome` | `"proceed"` | only value this slice |
| `decision.policy` | `"pass-through"` | stub policy id |
| `decision.decidedAt` | number | epoch ms |

**Response 400**: body fails `ClearanceRequest` validation. `{ "error": "<reason>" }`.

## Server behavior

On a valid request the gate MUST, in order:
1. Evaluate `passThroughPolicy(action, state)` (pure) → `decision`.
2. Persist the action and its decision (assign monotonic `seq`).
3. Publish a `FeedEvent` to all connected console sockets.
4. Return `ClearanceResponse`.

The endpoint never returns `proceed` without recording it first, so history is the
source of truth for SC-004 (every performed action has a preceding decision).

## Agent behavior

For each generated action the agent MUST `await` this call and only mark the
action performed on a `proceed` response. On network error or non-200 it MUST NOT
perform the action; it waits and retries (edge case: gate temporarily
unavailable). There is no code path that performs an action without a `proceed`.
