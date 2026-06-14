# Implementation Plan: Escalation, Hold & Human Approval (stubbed)

**Branch**: `002-escalation-hold-approval` (spec dir) | **Date**: 2026-06-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/002-escalation-hold-approval/spec.md`

## Summary

Replace the scaffold's pass-through policy with the first real rule — a
configurable per-action spending cap — and add the hold/resolve machinery around
it. Sub-threshold actions still auto-`proceed`. Over-threshold actions return
`escalate`: the gate creates a **pending approval** and holds the action; the
agent **freezes** (polls the approval) instead of performing it. A human resolves
the approval (approve/reject) through a **stub** control (a backend resolve
endpoint, exposed as temporary Approve/Reject buttons on held feed rows). On
approve the agent performs the action and resumes; on reject it drops it and
resumes. Escalations and resolutions are persisted (audit) and reflected live.

Built entirely on the 001 scaffold — same stack, same folders — extending the
pure policy module, the gate, the store, the WS feed, and the agent loop. **No
Ledger**: approve produces a plain authorization record; the hardware signature
replaces the stub in a later slice.

## Technical Context

**Language/Version**: TypeScript 5.x (strict), Node.js 20+ (unchanged from 001)

**Primary Dependencies**: Existing only — Fastify + @fastify/websocket, Drizzle +
better-sqlite3, Zod, React + Vite, Vitest. No new dependencies.

**Storage**: SQLite via Drizzle. Adds an `approvals` table; `decisions.outcome`
now also stores `escalate`.

**Testing**: Vitest — extend the policy unit test for the threshold rule (boundary
cases), plus integration checks for the gate (escalate path) and approval
resolution (idempotency).

**Target Platform**: Local/demo (unchanged).

**Project Type**: Web app (React console + Node backend) + agent process.

**Performance Goals**: Agent resumes within ~1s of a resolution (SC-002) — agent
poll interval ≤ ~500ms. Sub-threshold path unchanged (SC-001/SC-004).

**Constraints**: Trust boundary absolute — the agent performs an escalated action
ONLY after observing an `approved` resolution (Principle II, FR-004/SC-006). The
threshold rule stays a pure `(action, state) -> result` function (Principle III).
Resolution is idempotent: an approval resolves exactly once (FR-011/FR-012).

**Scale/Scope**: Single agent → at most one pending approval at a time.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Applies? | Compliance |
|-----------|----------|------------|
| I. Ledger Is the Point | Deferred (device LAST) | ✅ Resolution stubbed; approve = plain authorization record. No device yet, consistent with device-last |
| II. The Gate Is Inviolable | YES | ✅ Escalate holds; agent freezes and performs only after `approved`. No new path bypasses the gate |
| III. Policy Engine Pure & Smart | YES | ✅ Threshold is the first real rule — pure `(action, state) -> result`; unit-tested boundaries. Extends, not rewrites, the 001 module |
| IV. Ledger Browser-Side & Swappable | N/A this slice | ✅ No device interaction |
| V. No Custom Smart Contracts | YES | ✅ None |
| VI. Demo-able, Vertical Slices, Device Last | YES | ✅ Thin vertical cut (one rule + hold/resolve); stays demo-able; device deferred |
| VII. DX Feedback Is a Deliverable | N/A this slice | ✅ No Ledger friction yet |

**Tech-stack constraints**: TypeScript strict ✅ · same single Node backend ✅ ·
SQLite/Drizzle ✅ · WebSocket ✅ · no new tooling/deps ✅ · dependency direction
(`web -> backend`, `agent -> backend`) preserved ✅ · shared types via `shared/` ✅.

**Result**: PASS — no violations. Complexity Tracking not required.

## Project Structure

### Documentation (this feature)

```text
specs/002-escalation-hold-approval/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
└── tasks.md   # (/speckit-tasks — not created here)
```

### Source Code (repository root) — changes to the existing 001 layout

```text
shared/
├── types.ts                 # CHANGE: DecisionOutcome += "escalate"; PolicyId; ResolutionOutcome;
│                            #         FeedEvent -> union (decision | resolution); PendingApproval
└── messages.ts              # CHANGE: clearance response carries approvalId on escalate;
                             #         approval status + resolve request/response; widened WS events

be/server/
├── policy/
│   ├── index.ts             # CHANGE: per-action-cap rule (pure); state carries threshold
│   └── policy.test.ts       # CHANGE: threshold boundary tests (<=, >, ==)
├── store/
│   ├── schema.ts            # CHANGE: add `approvals` table
│   └── store.ts             # CHANGE: createApproval, getApproval, listPending, resolveApproval (idempotent)
├── gate.ts                  # CHANGE: escalate -> create approval + hold + return approvalId
├── approvals.ts             # NEW: resolve logic + resolution feed event
├── events.ts                # CHANGE: broadcast resolution events; snapshot includes both kinds
└── index.ts                 # CHANGE: GET /approvals, GET /approvals/:id, POST /approvals/:id/resolve

be/agent/
└── loop.ts                  # CHANGE: on escalate, freeze and poll approval; perform on approved, drop on rejected

web/src/
├── lib/ws.ts                # CHANGE: handle resolution events
├── feed/Feed.tsx            # CHANGE: render held rows distinctly + Approve/Reject (stub) controls
└── App.tsx                  # CHANGE: merge resolution updates into feed state
```

**Structure Decision**: No new folders — this slice extends the 001 scaffold in
place. The only new file is `be/server/approvals.ts` (resolution orchestration),
keeping the gate focused on clearance. The policy stays a pure module so the next
slice (remaining rule stack) extends it again without rewrite.

## Complexity Tracking

> No constitution violations — section intentionally empty.
