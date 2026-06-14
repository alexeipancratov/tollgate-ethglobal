// The gate server: HTTP clearance + approvals + WebSocket /feed. One Node service
// holding the gate, the policy module, persistence, the approvals stub, and the
// event stream (constitution: one backend service).
import Fastify from "fastify";
import websocket from "@fastify/websocket";
import { initStore, getApproval, listPending } from "./store/store";
import { handleClearance } from "./gate";
import { resolve } from "./approvals";
import { addClient } from "./events";
import { resolveRequestSchema } from "../../shared/messages";

const PORT = Number(process.env.PORT ?? 8787);
const HOST = process.env.HOST ?? "127.0.0.1";
const DB_PATH = process.env.TOLLGATE_DB ?? "be/data/tollgate.db";
const THRESHOLD = Number(process.env.TOLLGATE_THRESHOLD ?? 5); // per-action cap

async function main(): Promise<void> {
  initStore(DB_PATH);

  const app = Fastify({ logger: true });
  await app.register(websocket);

  app.post("/clearance", async (req, reply) => {
    try {
      return handleClearance(req.body, THRESHOLD);
    } catch (err) {
      reply.code(400);
      return { error: err instanceof Error ? err.message : "invalid request" };
    }
  });

  app.get("/approvals", async () => ({ approvals: listPending() }));

  app.get("/approvals/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const approval = getApproval(id);
    if (!approval) {
      reply.code(404);
      return { error: "not_found" };
    }
    return { approval };
  });

  app.post("/approvals/:id/resolve", async (req, reply) => {
    const { id } = req.params as { id: string };
    let parsed;
    try {
      parsed = resolveRequestSchema.parse(req.body);
    } catch (err) {
      reply.code(400);
      return { error: err instanceof Error ? err.message : "invalid request" };
    }
    const res = resolve(id, parsed);
    if (!res.ok) {
      reply.code(res.reason === "not_found" ? 404 : 409);
      return { error: res.reason };
    }
    return { approval: res.approval };
  });

  app.register(async (f) => {
    f.get("/feed", { websocket: true }, (connection) => {
      addClient(connection.socket);
    });
  });

  await app.listen({ port: PORT, host: HOST });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
