# Quickstart: Walking-Skeleton Scaffold

How to run the scaffold end-to-end and validate it against the spec's success
criteria. Detailed shapes live in [data-model.md](./data-model.md) and
[contracts/](./contracts/).

## Prerequisites

- Node.js 20+ and a Chromium-based browser (Chrome/Edge/Brave).
- Dependencies installed from the repo root: `npm install`.

## Run (three processes)

From the repo root, in three terminals (exact script names are finalized in
`tasks.md` / `package.json`):

```bash
npm run be:server   # starts the Fastify gate (HTTP /clearance + WS /feed) on localhost
npm run web         # starts the Vite console on localhost
npm run be:agent    # starts the agent loop generating mocked priced actions
```

Then open the console URL printed by Vite in a Chromium browser.

## Validate against success criteria

| Check | How | Expected (criterion) |
|-------|-----|----------------------|
| Live feed updates | Watch the console after starting the agent | New actions appear within ~1s, each with description, amount, "auto-approved" (SC-001, FR-006) |
| Unattended run | Leave it running ~5 min | Feed keeps streaming, no manual intervention (SC-002) |
| No drops/dupes | Compare feed count to history count over a 5-min run | 100% of actions in both feed and history, none dropped/duplicated (SC-003, FR-010) |
| Trust boundary | Inspect the SQLite store: every action has a decision with `decidedAt >= createdAt` | No action performed without a preceding decision (SC-004, FR-002) |
| Late joiner | Open a second console tab mid-run | Recent activity shows within ~3s, then live updates (SC-005, US3) |
| Survives restart | Stop and restart `be:server`, re-open console | Pre-restart history still present (SC-006, FR-007) |
| Gate-down safety | Stop `be:server` while the agent runs, then restart it | Agent does not perform actions while the gate is down; resumes after (edge case, FR-002) |

## Run the test

```bash
npm test            # Vitest: pass-through policy unit test + clearance endpoint check
```

The policy unit test asserts `passThroughPolicy(action, state)` returns
`{ outcome: "proceed", policy: "pass-through" }` for representative actions and is
pure (same input → same output, no side effects). This is the seed of the
mandatory policy test suite the rule-stack slice extends (Principle III).

## What you should NOT see (out of scope here)

No escalation, no approvals inbox, no human-approval step, no Ledger device or
signature, no real payment settlement. Those arrive in later roadmap items.
