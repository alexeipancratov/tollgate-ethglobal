# Research: Ledger Simulator Signing Path

Open questions here are about *how the simulator signs*, *how the backend trusts*,
and *where DMK fits*. Grounded in the Ledger DMK skills (`.agents/skills/`). No
`NEEDS CLARIFICATION` remain.

## Decision: Simulator is a software signer behind our own seam — not Speculos

- **Decision**: This slice's simulator is a **SimulatedSigner** that signs the
  approval payload with a dev key (viem) in the browser, behind an `ApprovalSigner`
  interface. The DMK-native Speculos transport is NOT used.
- **Rationale**: The DMK skills/reference confirm Speculos is a **TCP-socket
  transport for Node/CI**, not a browser transport — it cannot drive the
  browser-hosted signing flow the constitution mandates (Principle IV, WebHID is
  browser-side). The constitution's "swappable transport, two implementations" is
  *our* `ApprovalSigner` seam; the simulator is a software impl of it, the real
  Flex is the other impl. This keeps everything browser-side and makes slice 004 a
  true one-env-var flip.
- **Alternatives considered**: (a) Speculos via a Node bridge/proxy the browser
  calls — extra moving part, two transports, no real benefit for a demo;
  (b) running signing in a Node side-process — breaks the browser-side design.

## Decision: DMK packages deferred to slice 004

- **Decision**: Do NOT add `@ledgerhq/*` packages here. `LedgerSigner` is a stub
  that throws "implemented in slice 004". Slice 004 adds DMK + WebHID + the
  Ethereum signer and fills it in.
- **Rationale**: Keeps this slice dependency-light and avoids DMK ESM/Vite-polyfill
  integration risk until the device slice. The `ApprovalSigner` interface is the
  contract 004 implements; the real signer's `signTypedData` returns `{r,s,v}` which
  we assemble to a hex signature (per `dmk-platform-patterns.md`), the same shape
  the SimulatedSigner returns — so verification code is identical for both.
- **Alternatives considered**: Wiring DMK now with no device (more risk, nothing to
  exercise); building only the simulator with no real-impl placeholder (weaker seam).

## Decision: viem for signing (simulator) and verification (backend)

- **Decision**: Add **viem**. SimulatedSigner uses `privateKeyToAccount(pk).signTypedData(...)`;
  backend uses `recoverTypedDataAddress({ ...typedData, signature })` and compares to
  the configured approver address (case-insensitive).
- **Rationale**: viem is an allowed EVM lib (constitution lists viem/ethers), small,
  browser- and node-friendly, and gives first-class EIP-712 sign + recover with no
  node polyfills (unlike the DMK BTC/Solana signers). One lib covers both ends.
- **Alternatives considered**: ethers (also fine; viem is lighter/more modern);
  hand-rolled EIP-712 hashing (error-prone, no upside).

## Decision: Backend rebuilds the typed data; client sends only the signature

- **Decision**: `buildApprovalTypedData(action, approvalId)` lives in `shared/`.
  The FE builds it from the held action and signs it; the backend **rebuilds it from
  its own stored action** and verifies the signature against that. The client posts
  only `{ signature }`.
- **Rationale**: The backend, not the client, defines what was authorized — so a
  tampered amount or a forged payload simply fails verification (FR-005/SC-003). The
  signature binds to `actionId`/`approvalId`, so replaying it for another action
  fails too. This is the anti-tamper core of the trust boundary.
- **Alternatives considered**: Client sends the full payload + signature (backend
  must then re-check every field against its store anyway — rebuilding is simpler and
  strictly safer).

## Decision: EIP-712 domain is off-chain / fixed

- **Decision**: Domain = `{ name: "Tollgate", version: "1", chainId: <fixed config,
  e.g. 1> }` (no `verifyingContract`). Types: `Approval { approvalId, actionId,
  description, amount, counterparty, createdAt }`. `amount` encoded as an integer in
  minor units (cents) to avoid float ambiguity.
- **Rationale**: It's an off-chain authorization (Principle V) — chainId only feeds
  the domain separator, it is not a network we talk to. Fixing it makes FE and
  backend agree deterministically. Cents-as-integer keeps the signed value exact.
- **Alternatives considered**: Float amount (EIP-712 has no float type; ambiguous);
  per-environment chainId (needless variability for an off-chain sig).

## Decision: Authorized approver + key are dev config

- **Decision**: `TOLLGATE_APPROVER_ADDRESS` (backend) is the address allowed to
  release actions. The SimulatedSigner uses a throwaway dev private key
  (`VITE_SIM_APPROVER_PK`) whose address equals that approver. Both documented as
  TEST-ONLY (no real funds). In slice 004 the approver becomes the Flex's address.
- **Rationale**: Keeps approver identity and key path as developer constants
  (FR-010), and makes "the right device/key approved this" verifiable.
- **Alternatives considered**: User-entered key (forbidden by FR-010); generating a
  key at runtime (then the backend can't know the approver in advance).

## Decision: Resolution surface — add `approve-signed`, keep `resolve` for reject

- **Decision**: New `POST /approvals/:id/approve-signed { signature }` for the signed
  approve. Reject stays `POST /approvals/:id/resolve { outcome: "reject" }` (002,
  unchanged). Device cancel/refusal: FE shows cancelled and posts a lightweight
  `POST /approvals/:id/signing-cancelled` to record it (audit, FR-008).
- **Rationale**: Keeps the signed-approval path explicit and separate from reject;
  reuses 002's idempotent resolve for the no-device path. Audit captures
  signed/failed/cancelled.
- **Alternatives considered**: Overloading `resolve` to also carry a signature
  (muddier; mixes the no-device and device paths).

## Resolved unknowns

- Simulator mechanism, DMK deferral, crypto lib, anti-tamper verification model,
  domain/encoding, approver config, and the endpoint surface are all decided.
- Deferred by design: the real Flex (004, DMK+WebHID), human-readable Clear Signing
  (ERC-7730 descriptor + context-module), the remaining rule stack, the polished
  inbox, and anything on-chain.
