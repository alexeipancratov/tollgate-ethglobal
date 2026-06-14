import { useEffect, useState } from "react";
import { connectFeed } from "./lib/ws";
import { Feed, type FeedRow } from "./feed/Feed";

export default function App() {
  // Rows keyed by action id; resolutions update the matching held row in place.
  const [rows, setRows] = useState<Record<string, FeedRow>>({});

  useEffect(
    () =>
      connectFeed((events) => {
        setRows((prev) => {
          const next = { ...prev };
          for (const e of events) {
            if (e.type === "decision") {
              next[e.action.id] = {
                action: e.action,
                seq: e.seq,
                status: e.decision.outcome === "escalate" ? "held" : "auto-approved",
                approvalId: e.approvalId,
              };
            } else {
              const row = next[e.actionId];
              if (row) next[e.actionId] = { ...row, status: e.outcome };
            }
          }
          return next;
        });
      }),
    [],
  );

  async function onResolve(approvalId: string, outcome: "approve" | "reject") {
    await fetch(`/approvals/${approvalId}/resolve`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ outcome }),
    });
  }

  const list = Object.values(rows).sort((a, b) => b.seq - a.seq);
  const held = list.filter((r) => r.status === "held").length;

  return (
    <main
      style={{
        maxWidth: 920,
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
        {list.length} actions · {held} awaiting approval (per-action-cap policy)
      </p>
      <Feed rows={list} onResolve={onResolve} />
    </main>
  );
}
