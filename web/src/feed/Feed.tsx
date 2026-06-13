import type { FeedEvent } from "../../../shared/types";

const styles = {
  feed: { display: "flex", flexDirection: "column" as const, gap: 4 },
  row: {
    display: "grid",
    gridTemplateColumns: "64px 1fr 96px 120px",
    gap: 12,
    alignItems: "center",
    padding: "8px 12px",
    borderRadius: 8,
    background: "#11161c",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: 13,
  },
  seq: { color: "#5b6b7b" },
  desc: { color: "#e6edf3" },
  amt: { color: "#d7a85f", textAlign: "right" as const },
  status: { color: "#3fb950", textAlign: "right" as const },
};

export function Feed({ events }: { events: FeedEvent[] }) {
  return (
    <div style={styles.feed}>
      {events.map((e) => (
        <div key={e.seq} style={styles.row}>
          <span style={styles.seq}>#{e.seq}</span>
          <span style={styles.desc}>{e.action.description}</span>
          <span style={styles.amt}>${e.action.amount.toFixed(2)}</span>
          <span style={styles.status}>auto-approved</span>
        </div>
      ))}
    </div>
  );
}
