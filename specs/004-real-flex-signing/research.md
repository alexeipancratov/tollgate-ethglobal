# Research: Real Ledger Flex Signing

Grounded in the Ledger DMK skills (`.agents/skills/`). The seam, payload, and backend
verification are fixed by slice 003; the open questions are all about the device
integration. No `NEEDS CLARIFICATION` remain.

## Decision: DMK packages + versions

- **Decision**: `@ledgerhq/device-management-kit` (+ `rxjs`),
  `@ledgerhq/device-transport-kit-web-hid`, `@ledgerhq/device-signer-kit-ethereum`,
  and `@ledgerhq/context-module`. Import `webHidTransportFactory` and (transport id)
  from the WebHID package; never hardcode `"WEB-HID"`.
- **Rationale**: This is the constitution's named Ledger stack and the DMK skills'
  prescribed set. `@ledgerhq/context-module` is a **mandatory peer dependency** of
  the ETH signer (imported internally) — install it even though we omit `originToken`
  (no Clear Signing this slice), or the build fails.
- **Alternatives considered**: none — the DMK is the required integration.

## Decision: One DMK instance, held by the singleton LedgerSigner (no React provider)

- **Decision**: A single DMK instance in `web/src/ledger/dmk.ts`, created lazily and
  reused. `LedgerSigner` (a cached singleton via the 003 factory) holds it.
- **Rationale**: The DMK skills warn against a module singleton **in React render**
  because StrictMode double-render creates two instances. Our signer lives *outside*
  React's render cycle (an imperative `ApprovalSigner` created once by `getSigner()`),
  so there is exactly one DMK — the pitfall doesn't apply. A React provider would force
  the imperative seam into hooks for no benefit.
- **Alternatives considered**: `DmkProvider` + hooks (per the skill) — cleaner for a
  hook-driven UI, but mismatched with our imperative seam; would mean reworking the
  003 interface.

## Decision: Connect + read address (approver setup)

- **Decision**: `connect()` = `firstValueFrom(dmk.startDiscovering({ transport }))` →
  `dmk.connect({ device })`, from the existing **Connect** button (user gesture).
  `getApproverAddress()` = `signerEth.getAddress(path, { checkOnDevice: false })`.
  The console surfaces this address so the operator sets `TOLLGATE_APPROVER_ADDRESS`
  to it (one-time).
- **Rationale**: WebHID requires a user gesture and its OS picker guarantees a single
  device (so multi-device auto-select isn't a concern in-browser). Reading the address
  makes the approver configurable to the device (FR-004).
- **Alternatives considered**: `listenToAvailableDevices` (for Node/CLI, no browser
  picker — wrong context); hardcoding an address (can't, it's the device's key).

## Decision: signTypedData + signature assembly

- **Decision**: `signerEth.signTypedData(path, typedData)` where `typedData` is the
  003 payload **with an `EIP712Domain` entry added to `types`** (`name`, `version`,
  `chainId`). On `Completed`, assemble `0x{r}{s}{v}` from `state.output.{r,s,v}`
  (a pure helper in `sig.ts`). The backend verifies with viem unchanged.
- **Rationale**: The DMK ETH signer expects `EIP712Domain` declared in `types`; viem
  (backend) auto-derives it and ignores an extra declaration — so the same EIP-712
  hash is produced on both ends. Splitting assembly into a pure helper makes it
  unit-testable without hardware.
- **Likely DX friction (capture in DX-NOTES)**: the `v` byte. Ledger may return `v`
  as `0/1` or `27/28`; viem expects a canonical 65-byte sig. If recovery yields the
  wrong/no address, normalize `v` (`< 27 ? v + 27 : v`). This is the single most
  likely integration snag.
- **Alternatives considered**: EIP-1193 provider wrapper (overkill — we only need one
  typed-data signature, not a full provider).

## Decision: Error handling — rejection vs. recoverable

- **Decision**: Use the skill's `isDeviceRejection(err)` (`_tag RefusedByUserDAError`,
  codes `5501`/`6985`) → throw `SigningCancelled` (the 003 neutral path; action stays
  held). All other errors → `classifyDeviceError(err)` for an actionable, recoverable
  message (locked → unlock PIN, wrong app → opens automatically, disconnect → reconnect).
- **Rationale**: Matches FR-007/FR-008 and the constitution's "device screen is the
  trusted display"; reuses the seam's `SigningCancelled` so cancel handling is identical
  to the simulator.
- **Alternatives considered**: matching on message strings (brittle across versions).

## Decision: Raw-hex signing (no Clear Signing this slice)

- **Decision**: Build the `SignerEthBuilder` WITHOUT `originToken`. The device shows
  raw hex; the human still confirms physically.
- **Rationale**: Per the spec/roadmap, Clear Signing (ERC-7730 descriptor +
  context-module data) is a deferred fast-follow. Signing works without it.
- **Alternatives considered**: enroll for an `originToken` now (partner-program gated;
  out of scope, slows the headline demo).

## Decision: Vite / ESM integration

- **Decision**: Add the packages; if the dev/build bundle errors on `buffer`/`process`
  or ESM interop, add `vite-plugin-node-polyfills` and/or `optimizeDeps.include` for the
  `@ledgerhq` packages. Verify `npm run web` boots and `npm run build` succeeds.
- **Rationale**: DMK packages are ESM-only; standalone (non-monorepo) bundlers
  sometimes need polyfills/transpile hints (the skill flags this for Next; Vite's
  analog is polyfills/optimizeDeps). Treat as a settle-on-first-run item — and a DX-NOTES
  entry.
- **Alternatives considered**: none — resolve empirically at implementation.

## Resolved unknowns

- Packages, single-instance strategy, connect/address, signTypedData + assembly,
  error classification, raw-hex signing, and bundler integration are decided.
- Deferred by design: Clear Signing (ERC-7730), the remaining rule stack, the polished
  inbox, anything on-chain.
