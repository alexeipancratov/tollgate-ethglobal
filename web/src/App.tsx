import { useEffect, useRef, useState } from "react";
import type { FeedEvent } from "../../shared/types";
import { connectFeed } from "./lib/ws";
import { Feed } from "./feed/Feed";

const MAX_RENDERED = 500;

export default function App() {
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const seen = useRef<Set<number>>(new Set());

  useEffect(() => {
    return connectFeed((incoming, replace) => {
      setEvents((prev) => {
        if (replace) {
          seen.current = new Set(incoming.map((e) => e.seq));
          return [...incoming];
        }
        const fresh = incoming.filter((e) => !seen.current.has(e.seq));
        if (fresh.length === 0) return prev;
        fresh.forEach((e) => seen.current.add(e.seq));
        const merged = [...prev, ...fresh].sort((a, b) => a.seq - b.seq);
        return merged.slice(-MAX_RENDERED);
      });
    });
  }, []);

  return (
    <main
      style={{
        maxWidth: 880,
        margin: "0 auto",
        padding: 24,
        color: "#e6edf3",
        background: "#0d1117",
        minHeight: "100vh",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1 style={{ fontSize: 20, margin: "0 0 4px" }}>Tollgate — live feed</h1>
      <p style={{ color: "#8b949e", margin: "0 0 16px", fontSize: 13 }}>
        {events.length} actions · all auto-approved (pass-through policy)
      </p>
      <Feed events={[...events].reverse()} />
    </main>
  );
}
