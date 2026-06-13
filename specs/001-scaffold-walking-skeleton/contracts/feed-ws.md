# Contract: Feed WebSocket (backend → console)

The real-time event stream that drives the live feed (FR-005, FR-006) and serves
late joiners (FR-008). One channel delivers both a connect-time snapshot and the
live stream. Messages are defined in `shared/messages.ts` (Zod).

## GET /feed (WebSocket upgrade)

The console opens a WebSocket to `/feed`. No auth in this slice (local/demo).

### Server → client messages

All messages are JSON with a `type` discriminator.

**1. Snapshot** (sent once, immediately on connect — US3 / SC-005):

```json
{
  "type": "snapshot",
  "events": [
    { "type": "decision", "action": { /* Action */ }, "decision": { /* ClearanceDecision */ }, "seq": 41 },
    { "type": "decision", "action": { /* ... */ }, "decision": { /* ... */ }, "seq": 42 }
  ]
}
```

- `events` is recent history ordered by `seq` ascending (oldest → newest), capped
  at a recent-window limit (e.g. last 50). Empty array if nothing has happened yet
  (edge case: console connects before any action).

**2. Event** (sent live for each new decision — FR-005):

```json
{
  "type": "event",
  "event": { "type": "decision", "action": { /* Action */ }, "decision": { /* ClearanceDecision */ }, "seq": 43 }
}
```

- One `event` message per gate decision, in `seq` order (FR-010). The console
  appends it to the feed showing description, amount, and the "auto-approved"
  status (FR-006).

### Client → server messages

None required in this slice. The console is receive-only.

## Ordering & delivery guarantees

- `seq` is a monotonic per-server counter assigned at decision time; the console
  renders by `seq`, so feed order matches history order even under rapid
  generation (FR-010, SC-003).
- A client that misses messages (disconnect) reconnects and receives a fresh
  snapshot, then resumes live events (edge case: console reconnect).

## Out of scope (later slices)

- Escalation/approval event types, approval actions from the console, budget /
  velocity panels, and any Ledger signing. The `type` discriminators leave room
  for these without breaking the scaffold contract.
