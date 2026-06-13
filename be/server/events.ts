// In-process event bus -> WebSocket broadcast. On connect a client receives a
// snapshot of recent history (US3), then live events (FR-005).
import type { WebSocket } from "ws";
import type { FeedEvent } from "../../shared/types";
import { recentHistory } from "./store/store";

const clients = new Set<WebSocket>();
const SNAPSHOT_LIMIT = 50;
const WS_OPEN = 1;

/** Register a console socket: send the snapshot, then keep it for live events. */
export function addClient(socket: WebSocket): void {
  clients.add(socket);
  const events = recentHistory(SNAPSHOT_LIMIT);
  socket.send(JSON.stringify({ type: "snapshot", events }));
  socket.on("close", () => clients.delete(socket));
  socket.on("error", () => clients.delete(socket));
}

/** Push one decision event to every connected console, in seq order. */
export function broadcast(event: FeedEvent): void {
  const msg = JSON.stringify({ type: "event", event });
  for (const c of clients) {
    if (c.readyState === WS_OPEN) c.send(msg);
  }
}
