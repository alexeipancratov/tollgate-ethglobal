import { useEffect, useState } from "react";
import { connectFeed } from "./lib/ws";
import { Feed, type FeedRow } from "./feed/Feed";
import { getSigner, SigningCancelled } from "./ledger";
import { buildApprovalTypedData } from "../../shared/approval-typed-data";

const CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID ?? 1);

export default function App() {
  // Rows keyed by action id; resolutions update the matching held row in place.
  const [rows, setRows] = useState<Record<string, FeedRow>>({});
  const [connected, setConnected] = useState(false);
  const [deviceAddress, setDeviceAddress] = useState<string | null>(null);
  const [addressBusy, setAddressBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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

  async function onConnect() {
    try {
      setDeviceAddress(null);
      await getSigner().connect();
      setConnected(true);
      setNotice(null);
    } catch (e) {
      setNotice((e as Error).message);
    }
  }

  async function onShowDeviceAddress() {
    setAddressBusy(true);
    setNotice(null);
    try {
      setDeviceAddress(await getSigner().getApproverAddress());
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setAddressBusy(false);
    }
  }

  async function onApprove(row: FeedRow) {
    if (!row.approvalId) return;
    const signer = getSigner();
    if (!signer.isConnected()) {
      setNotice("Connect the Ledger first.");
      return;
    }
    setBusyId(row.action.id);
    setNotice("Review and confirm the approval on your device…");
    try {
      const typedData = buildApprovalTypedData(row.action, row.approvalId, CHAIN_ID);
      const { signature } = await signer.signApproval(typedData);
      setNotice(null);
      const resp = await fetch(`/approvals/${row.approvalId}/approve-signed`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ signature }),
      });
      if (!resp.ok) setNotice(`Backend refused the signature (HTTP ${resp.status}) — action still held.`);
    } catch (e) {
      if (e instanceof SigningCancelled) {
        setNotice("Signing cancelled — action still held, you can approve again.");
      } else {
        setNotice((e as Error).message);
      }
    } finally {
      setBusyId(null);
    }
  }

  async function onReject(approvalId: string) {
    await fetch(`/approvals/${approvalId}/resolve`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ outcome: "reject" }),
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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 style={{ fontSize: 20, margin: "0 0 4px" }}>Tollgate — live feed</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {connected && (
            <button
              onClick={onShowDeviceAddress}
              disabled={addressBusy}
              style={{
                background: "#21262d",
                color: "#e6edf3",
                border: "1px solid #30363d",
                borderRadius: 6,
                padding: "6px 12px",
                cursor: addressBusy ? "wait" : "pointer",
                fontSize: 13,
                opacity: addressBusy ? 0.7 : 1,
              }}
            >
              {addressBusy ? "Reading address…" : "Show device address"}
            </button>
          )}
          <button
            onClick={onConnect}
            style={{
              background: connected ? "#238636" : "#1f6feb",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "6px 12px",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            {connected ? "Ledger connected" : "Connect Ledger"}
          </button>
        </div>
      </div>
      <p style={{ color: "#8b949e", margin: "0 0 8px", fontSize: 13 }}>
        {list.length} actions · {held} awaiting approval (per-action-cap policy)
      </p>
      {deviceAddress && (
        <div
          style={{
            background: "#161b22",
            border: "1px solid #30363d",
            borderRadius: 6,
            margin: "0 0 12px",
            padding: "10px 12px",
            fontSize: 13,
          }}
        >
          <div style={{ color: "#8b949e", marginBottom: 4 }}>
            Set this as <code>TOLLGATE_APPROVER_ADDRESS</code>, then restart the backend:
          </div>
          <code style={{ color: "#58a6ff", overflowWrap: "anywhere" }}>{deviceAddress}</code>
        </div>
      )}
      {notice && (
        <p style={{ color: "#d29922", margin: "0 0 12px", fontSize: 13 }}>{notice}</p>
      )}
      <Feed rows={list} busyId={busyId} onApprove={onApprove} onReject={onReject} />
    </main>
  );
}
