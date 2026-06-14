// The agent: a long-running loop that generates mocked priced "service calls" and
// asks the gate for clearance before performing each. It is deliberately dumb about
// policy. Trust boundary (Principle II / FR-004): it performs an action only after
// a `proceed`, or — for an escalated action — only after observing `approved`. On a
// `escalate` it FREEZES (polls the approval) until a human resolves it.
import "dotenv/config"; // load repo-root .env before reading process.env
import { randomUUID } from "node:crypto";
import type { Action } from "../../shared/types";
import { clearanceResponseSchema, approvalResponseSchema } from "../../shared/messages";

const BASE_URL = process.env.GATE_BASE_URL ?? "http://127.0.0.1:8787";
const CLEARANCE_URL = `${BASE_URL}/clearance`;
const INTERVAL_MS = Number(process.env.AGENT_INTERVAL_MS ?? 7000);
const POLL_MS = Number(process.env.AGENT_POLL_MS ?? 400);

const SERVICES = [
  { description: "call premium API", base: 0.04 },
  { description: "fetch market-data feed", base: 0.02 },
  { description: "run inference job", base: 0.15 },
  { description: "purchase dataset license", base: 12.5 },
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function nextAction(): Action {
  const svc = SERVICES[Math.floor(Math.random() * SERVICES.length)]!;
  const spike = Math.random() < 0.1 ? 20 + Math.random() * 80 : 0; // occasional big one
  const amount = Number((svc.base + spike).toFixed(2));
  return {
    id: randomUUID(),
    description: svc.description,
    amount,
    counterparty: null,
    createdAt: Date.now(),
  };
}

type Clearance = { outcome: "proceed" } | { outcome: "escalate"; approvalId: string };

async function requestClearance(action: Action): Promise<Clearance> {
  const resp = await fetch(CLEARANCE_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action }),
  });
  if (!resp.ok) throw new Error(`gate returned ${resp.status}`);
  const data = clearanceResponseSchema.parse(await resp.json());
  if (data.decision.outcome === "escalate") {
    if (!data.approvalId) throw new Error("escalate without approvalId");
    return { outcome: "escalate", approvalId: data.approvalId };
  }
  return { outcome: "proceed" };
}

/** Freeze until the approval is resolved; returns the terminal status. */
async function waitForResolution(approvalId: string): Promise<"approved" | "rejected"> {
  for (;;) {
    try {
      const resp = await fetch(`${BASE_URL}/approvals/${approvalId}`);
      if (resp.ok) {
        const { approval } = approvalResponseSchema.parse(await resp.json());
        if (approval.status === "approved" || approval.status === "rejected") {
          return approval.status;
        }
      }
    } catch {
      // gate temporarily unreachable — keep waiting, do not act
    }
    await sleep(POLL_MS);
  }
}

function perform(action: Action): void {
  // MOCKED useful work: a no-op marked done. No real settlement.
  console.log(`[agent] performed: ${action.description} ($${action.amount})`);
}

async function tick(): Promise<void> {
  const action = nextAction();
  try {
    const clearance = await requestClearance(action);
    if (clearance.outcome === "proceed") {
      perform(action);
      return;
    }
    // escalate -> FREEZE until a human resolves it
    console.log(
      `[agent] FROZEN — escalated, awaiting approval: ${action.description} ($${action.amount})`,
    );
    const status = await waitForResolution(clearance.approvalId);
    if (status === "approved") {
      perform(action);
    } else {
      console.log(`[agent] dropped (rejected): ${action.description} ($${action.amount})`);
    }
  } catch (err) {
    // No decision => do NOT perform. Wait and retry next tick.
    console.warn(`[agent] no clearance (${(err as Error).message}); not acting, will retry`);
  }
}

async function main(): Promise<void> {
  console.log(`[agent] starting; base=${BASE_URL} interval=${INTERVAL_MS}ms poll=${POLL_MS}ms`);
  for (;;) {
    await tick();
    await sleep(INTERVAL_MS);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
