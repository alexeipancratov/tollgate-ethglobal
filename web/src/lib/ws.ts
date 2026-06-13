// Console WebSocket client. Connects to /feed, applies the connect-time snapshot
// (replace) and subsequent live events (append). Reconnects on close.
import type { FeedEvent } from "../../../shared/types";
import { serverMessageSchema } from "../../../shared/messages";

/** Called with new events; `replace` is true for the initial snapshot. */
export type FeedListener = (events: FeedEvent[], replace: boolean) => void;

export function connectFeed(onEvents: FeedListener): () => void {
  let ws: WebSocket | null = null;
  let closed = false;
  let retry: ReturnType<typeof setTimeout> | null = null;

  function open(): void {
    if (closed) return;
    ws = new WebSocket(`ws://${location.host}/feed`);

    ws.onmessage = (ev) => {
      let raw: unknown;
      try {
        raw = JSON.parse(ev.data as string);
      } catch {
        return;
      }
      const parsed = serverMessageSchema.safeParse(raw);
      if (!parsed.success) return;
      const msg = parsed.data;
      if (msg.type === "snapshot") onEvents(msg.events, true);
      else onEvents([msg.event], false);
    };

    ws.onclose = () => {
      if (closed) return;
      retry = setTimeout(open, 1000); // reconnect
    };
    ws.onerror = () => ws?.close();
  }

  open();

  return () => {
    closed = true;
    if (retry) clearTimeout(retry);
    ws?.close();
  };
}
