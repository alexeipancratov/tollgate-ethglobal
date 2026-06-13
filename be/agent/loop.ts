// The agent: a long-running loop that generates mocked priced "service calls" and
// asks the gate for clearance before performing each. It is deliberately dumb
// about policy. Trust boundary (Principle II / FR-002): on any non-proceed or
// error it does NOT perform the action — it waits and retries.
import { randomUUID } from "node:crypto";
import type { Action } from "../../shared/types";
import { clearanceResponseSchema } from "../../shared/messages";

const GATE_URL = process.env.GATE_URL ?? "http://127.0.0.1:8787/clearance";
const INTERVAL_MS = Number(process.env.AGENT_INTERVAL_MS ?? 7000);

const SERVICES = [
  { description: "call premium API", base: 0.04 },
  { description: "fetch market-data feed", base: 0.02 },
  { description: "run inference job", base: 0.15 },
  { description: "purchase dataset license", base: 12.5 },
];

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

async function requestClearance(action: Action): Promise<boolean> {
  const resp = await fetch(GATE_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action }),
  });
  if (!resp.ok) throw new Error(`gate returned ${resp.status}`);
  const data = clearanceResponseSchema.parse(await resp.json());
  return data.decision.outcome === "proceed";
}

async function tick(): Promise<void> {
  const action = nextAction();
  try {
    const proceed = await requestClearance(action);
    if (proceed) {
      // MOCKED useful work: a no-op marked done. No real settlement.
      console.log(`[agent] performed: ${action.description} ($${action.amount})`);
    } else {
      console.log(`[agent] held (not proceeding): ${action.description}`);
    }
  } catch (err) {
    // No decision => do NOT perform. Wait and retry next tick.
    console.warn(
      `[agent] no clearance (${(err as Error).message}); not acting, will retry`,
    );
  }
}

async function main(): Promise<void> {
  console.log(`[agent] starting; gate=${GATE_URL} interval=${INTERVAL_MS}ms`);
  for (;;) {
    await tick();
    await new Promise((r) => setTimeout(r, INTERVAL_MS));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
