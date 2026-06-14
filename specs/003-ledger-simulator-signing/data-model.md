# Data Model: Ledger Simulator Signing Path

Extends the 002 model. Changes marked **CHANGE** / **NEW**.

## Approval payload (the signed authorization) — NEW

The EIP-712 typed data produced by `buildApprovalTypedData(action, approvalId)` in
`shared/approval-typed-data.ts`. Built identically by FE (to sign) and backend (to
verify).

- **domain**: `{ name: "Tollgate", version: "1", chainId: <fixed config> }`
- **primaryType**: `Approval`
- **types.Approval**:

| Field | EIP-712 type | Source |
|-------|--------------|--------|
| `approvalId` | string | the pending approval id |
| `actionId` | string | the held action id |
| `description` | string | action description |
| `amount` | uint256 | action amount in **minor units (cents)** — integer, exact |
| `counterparty` | string | action counterparty, or "" |
| `createdAt` | uint256 | action timestamp (epoch ms) |

**Validation**: the backend rebuilds this from its OWN stored action + approval, so
the signed values cannot be client-supplied. A signature only verifies if it was
produced over the backend's reconstruction (anti-tamper, anti-replay).

## ApprovalSignature — NEW (recorded)

| Field | Type | Notes |
|-------|------|-------|
| `signature` | string (0x hex) | the EIP-712 signature |
| `signer` | string (0x address) | recovered signer; must equal the approver |

## PendingApproval (CHANGE)

`approvals` table gains two nullable columns, set when a signed approval verifies:

| Field | Type | Notes |
|-------|------|-------|
| `signature` | text \| null | the verifying signature (NEW) |
| `signer` | text \| null | recovered signer address (NEW) |

Status lifecycle is unchanged (`pending → approved | rejected`), but `approved` via
the signed path also persists `signature` + `signer`.

## ApprovalEvent — NEW (audit)

`approval_events` table — the attempt log for the audit trail (FR-008 / SC-007).

| Field | Type | Notes |
|-------|------|-------|
| `seq` | integer PK autoincrement | ordering |
| `approvalId` | text | references the approval |
| `kind` | text | `signed_approved` \| `verification_failed` \| `signing_cancelled` |
| `signatureHash` | text \| null | hash of the signature (for `signed_approved`) |
| `signer` | text \| null | recovered signer (when available) |
| `at` | integer | epoch ms |

## Config (developer constants)

- Backend: `TOLLGATE_APPROVER_ADDRESS` (the only address allowed to release),
  `TOLLGATE_CHAIN_ID` (fixed domain chainId).
- Web: `VITE_SIGNER` (`simulator` default | `ledger`), `VITE_SIM_APPROVER_PK`
  (throwaway TEST dev key whose address == the approver), `VITE_CHAIN_ID`.
- Derivation path (slice 004, real device): `44'/60'/0'/0/0` constant.

## State / flow

1. Gate escalates → held action + pending approval (002, unchanged).
2. FE: Connect → signer session. Approve → build typed data → `signer.signApproval`
   → `{ signature }`.
3. FE → `POST /approvals/:id/approve-signed { signature }`.
4. Backend rebuilds typed data from its stored action, recovers signer, checks
   `signer == approver` AND it matches this approval/action → `resolveApproval(approved)`
   + persist `signature`/`signer` + `approval_events(signed_approved)`; else refuse
   (action stays held) + `approval_events(verification_failed)`.
5. Agent (unchanged) observes the release and performs; reject/cancel leave it held.
