// The gate server: HTTP POST /clearance (agent) + WebSocket /feed (console).
// One Node service holding the gate, the policy module, persistence, and the
// event stream (constitution: one backend service).
import Fastify from "fastify";
import websocket from "@fastify/websocket";
import { initStore } from "./store/store";
import { handleClearance } from "./gate";
import { addClient } from "./events";

const PORT = Number(process.env.PORT ?? 8787);
const HOST = process.env.HOST ?? "127.0.0.1";
const DB_PATH = process.env.TOLLGATE_DB ?? "be/data/tollgate.db";

async function main(): Promise<void> {
  initStore(DB_PATH); // creates be/data and the schema if missing (FR-007)

  const app = Fastify({ logger: true });
  await app.register(websocket);

  app.post("/clearance", async (req, reply) => {
    try {
      return handleClearance(req.body);
    } catch (err) {
      reply.code(400);
      return { error: err instanceof Error ? err.message : "invalid request" };
    }
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
