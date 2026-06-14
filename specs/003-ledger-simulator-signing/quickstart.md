# Quickstart: Ledger Simulator Signing Path

Run and validate the signed-approval flow on the simulator. Builds on 002. Shapes
in [data-model.md](./data-model.md) and [contracts/](./contracts/).

## Prerequisites

- 002 working; `npm install` (adds viem).
- A throwaway TEST dev key + its address (no real funds). Set both so the simulator
  key matches the backend's authorized approver.

## Run

```bash
# backend: per-action cap + the authorized approver address
TOLLGATE_THRESHOLD=5 TOLLGATE_APPROVER_ADDRESS=0xYourTestAddr npm run be:server

# console: simulator signer (default) + the matching dev key
VITE_SIGNER=simulator VITE_SIM_APPROVER_PK=0xYourTestPrivKey npm run web

npm run be:agent
```

In the console: click **Connect Ledger**. When an expensive action holds, click
**Approve** — a confirm dialog (the simulated device) appears; confirm it. The app
signs, posts the signature, the backend verifies it against the approver, and the
action releases; the agent resumes. Decline the dialog to see a cancel (action
stays held). Click **Reject** for the no-device drop.

## Validate against success criteria

| Check | How | Expected (criterion) |
|-------|-----|----------------------|
| Signed release | Approve + confirm dialog | Action releases only after the backend verifies the signature; agent resumes ~2s (SC-001, SC-002) |
| Wrong signer refused | Run console with a dev key ≠ approver, approve | Backend returns 401; action stays held (SC-003) |
| Tamper/replay refused | (test) sign a different action's payload / altered amount | 401; action stays held (SC-003) |
| Device cancel | Decline the confirm dialog | Action stays held, shown cancelled (not error), retryable (SC-004) |
| Reject path | Click Reject | Action dropped, no device interaction (SC-006) |
| Sub-threshold | Watch cheap actions | Auto-proceed, no device interaction (SC-006) |
| Audit | Inspect `approval_events` after mixed outcomes | signed_approved / verification_failed / signing_cancelled recorded (SC-005, SC-007) |
| Swappable seam | Set `VITE_SIGNER=ledger` | LedgerSigner stub throws "implemented in slice 004" — proves the single-switch seam (SC-005) |

## Tests

```bash
npm test   # typed-data builder determinism + backend verify (approver ok / wrong signer / tampered / replay refused)
```

## Out of scope (later)

Real Flex (slice 004 — flip `VITE_SIGNER=ledger` with DMK+WebHID), human-readable
Clear Signing (ERC-7730 descriptor + context-module), the remaining rule stack, the
polished approvals inbox, and anything on-chain.
