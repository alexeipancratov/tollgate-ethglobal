// The gate server: HTTP clearance + approvals + WebSocket /feed. One Node service
// holding the gate, the policy module, persistence, the approvals stub, and the
// event stream (constitution: one backend service).
import "dotenv/config"; // load repo-root .env before reading process.env
import Fastify from "fastify";
import websocket from "@fastify/websocket";
import { initStore, getApproval, listPending } from "./store/store";
import { handleClearance } from "./gate";
import { resolve, verifyAndApprove } from "./approvals";
import { addClient } from "./events";
import { approverAddress } from "./verify";
import { resolveRequestSchema, approveSignedRequestSchema } from "../../shared/messages";

const PORT = Number(process.env.PORT ?? 8787);
const HOST = process.env.HOST ?? "127.0.0.1";
const DB_PATH = process.env.TOLLGATE_DB ?? "be/data/tollgate.db";
const THRESHOLD = Number(process.env.TOLLGATE_THRESHOLD ?? 5); // per-action cap

async function main(): Promise<void> {
  initStore(DB_PATH);

  if (!approverAddress()) {
    console.warn(
      "[gate] WARNING: TOLLGATE_APPROVER_ADDRESS is not set — signed approvals will be refused. Set it in .env (must match the web signer's address).",
    );
  }

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

  // Signed approval (slice 003): client posts only the signature; backend rebuilds
  // the typed data from its stored action and verifies it against the approver.
  app.post("/approvals/:id/approve-signed", async (req, reply) => {
    const { id } = req.params as { id: string };
    let parsed;
    try {
      parsed = approveSignedRequestSchema.parse(req.body);
    } catch (err) {
      reply.code(400);
      return { error: err instanceof Error ? err.message : "invalid request" };
    }
    const res = await verifyAndApprove(id, parsed.signature as `0x${string}`);
    if (!res.ok) {
      reply.code(res.reason === "not_found" ? 404 : res.reason === "already_resolved" ? 409 : 401);
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
