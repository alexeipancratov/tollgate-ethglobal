# Quickstart: Escalation, Hold & Human Approval

How to run and validate the escalation slice. Builds on the 001 scaffold. Shapes
in [data-model.md](./data-model.md) and [contracts/](./contracts/).

## Prerequisites

- 001 scaffold installed (`npm install` already done).
- Node 20+ and a Chromium browser.

## Run

```bash
TOLLGATE_THRESHOLD=5 npm run be:server   # gate with a $5 per-action cap
npm run web                              # console
npm run be:agent                         # agent loop
```

Open the console. Cents-level actions stream as "auto-approved". When an expensive
action appears (e.g. the dataset-license ~$12.50, or a spiked amount), it shows as
**held** and the agent stops — the feed pauses. Click **Approve** on the held row
(or `POST /approvals/:id/resolve {"outcome":"approve"}`); the agent performs it and
resumes. Click **Reject** to drop it instead.

## Validate against success criteria

| Check | How | Expected (criterion) |
|-------|-----|----------------------|
| Sub-threshold unchanged | Watch cheap actions | All auto-proceed, stream live (SC-004, FR-002) |
| Freeze on expensive | Wait for an over-threshold action | Feed pauses on it; no further actions performed (SC-001, FR-004) |
| Approve → resume | Approve the held row | Agent performs it; streaming resumes within ~1s (SC-002, FR-006) |
| Reject → drop | Reject a held row | Action never performed; agent resumes (SC-003, FR-007) |
| Discoverable | `GET /approvals` while one is held | Returns the pending approval with its action (FR-008) |
| Audit | Inspect store after mixed outcomes | Each escalation + resolution recorded with outcome + timestamps (SC-005, FR-009) |
| Exactly-once | Resolve the same approval twice | Second call → 409; action performed at most once (SC-007, FR-012) |
| Unknown id | Resolve a bogus id | 404, no side effect (FR-011) |
| Trust boundary | Inspect audit ordering | No escalated action performed before its approval is `approved` (SC-006) |

## Run the tests

```bash
npm test        # policy boundary tests (<=, >, ==) + gate escalate + resolution idempotency
```

## Out of scope (later slices)

The remaining rule stack (budget window, velocity, per-counterparty), the polished
approvals inbox + transparency panels, and any Ledger device/signature. Approve
here is a plain authorization record, not a hardware signature.
