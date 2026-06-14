import type { CSSProperties } from "react";
import type { Action } from "../../../shared/types";

export type RowStatus = "auto-approved" | "held" | "approved" | "rejected";

export interface FeedRow {
  action: Action;
  status: RowStatus;
  seq: number;
  approvalId?: string;
}

const statusColor: Record<RowStatus, string> = {
  "auto-approved": "#3fb950",
  held: "#d29922",
  approved: "#3fb950",
  rejected: "#f85149",
};

function btn(bg: string): CSSProperties {
  return {
    background: bg,
    color: "#fff",
    border: "none",
    borderRadius: 6,
    padding: "4px 8px",
    marginLeft: 6,
    cursor: "pointer",
    fontSize: 12,
  };
}

export function Feed({
  rows,
  onResolve,
}: {
  rows: FeedRow[];
  onResolve: (approvalId: string, outcome: "approve" | "reject") => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {rows.map((r) => (
        <div
          key={r.action.id}
          style={{
            display: "grid",
            gridTemplateColumns: "64px 1fr 96px 170px",
            gap: 12,
            alignItems: "center",
            padding: "8px 12px",
            borderRadius: 8,
            background: r.status === "held" ? "#1c1810" : "#11161c",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: 13,
          }}
        >
          <span style={{ color: "#5b6b7b" }}>#{r.seq}</span>
          <span style={{ color: "#e6edf3" }}>{r.action.description}</span>
          <span style={{ color: "#d7a85f", textAlign: "right" }}>${r.action.amount.toFixed(2)}</span>
          <span style={{ textAlign: "right" }}>
            {r.status === "held" && r.approvalId ? (
              <>
                <button style={btn("#238636")} onClick={() => onResolve(r.approvalId!, "approve")}>
                  Approve
                </button>
                <button style={btn("#a23631")} onClick={() => onResolve(r.approvalId!, "reject")}>
                  Reject
                </button>
              </>
            ) : (
              <span style={{ color: statusColor[r.status] }}>{r.status}</span>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}
