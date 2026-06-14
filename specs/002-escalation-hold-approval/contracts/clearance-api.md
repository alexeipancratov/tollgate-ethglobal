# Contract: Clearance API (agent → gate) — CHANGE

Extends the 001 clearance contract. The decision can now be `escalate`, in which
case the response carries an `approvalId` the agent uses to wait.

## POST /clearance

**Request** (`ClearanceRequest`, unchanged): `{ "action": { id, description, amount, counterparty, createdAt } }`

**Response 200 — proceed** (sub-threshold, unchanged behavior):

```json
{ "decision": { "actionId": "…", "outcome": "proceed", "policy": "per-action-cap", "decidedAt": 1786000000050 } }
```

**Response 200 — escalate** (over threshold):

```json
{
  "decision": { "actionId": "…", "outcome": "escalate", "policy": "per-action-cap", "decidedAt": 1786000000050 },
  "approvalId": "01J…"
}
```

| Field | Type | Notes |
|-------|------|-------|
| `decision.outcome` | `"proceed" \| "escalate"` | per-action-cap rule |
| `approvalId` | string | present ONLY when outcome is `escalate` |

**Response 400**: invalid `ClearanceRequest`. `{ "error": "<reason>" }`.

### Server behavior

- `proceed`: record decision, broadcast decision event, return decision (as 001).
- `escalate`: record decision (outcome `escalate`), create a pending approval,
  broadcast a held decision event, return decision + `approvalId`. The action is
  NOT performed and NOT released until resolved.

### Agent behavior

- `proceed` → perform, continue.
- `escalate` → do NOT perform; poll `GET /approvals/:approvalId` until resolved,
  then perform on `approved` or drop on `rejected`, then resume. No path performs
  an escalated action without observing `approved` (FR-004/SC-006).
