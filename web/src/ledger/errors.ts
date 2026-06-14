// Device error classification (per .agents/skills dmk-code-patterns). User rejection
// is a distinct, neutral outcome — not an error.

export function isDeviceRejection(error: unknown): boolean {
  const tag = (error as { _tag?: string })?._tag ?? "";
  const code =
    (error as { errorCode?: string })?.errorCode ??
    (error as { originalError?: { errorCode?: string } })?.originalError?.errorCode ??
    "";
  return tag === "RefusedByUserDAError" || code === "5501" || code === "6985";
}

export function classifyDeviceError(error: unknown): string {
  const tag = (error as { _tag?: string })?._tag ?? "";
  const code = (error as { errorCode?: string })?.errorCode ?? "";
  if (tag === "DeviceLockedError" || code === "5515")
    return "Ledger is locked — enter your PIN on the device.";
  if (code === "6807") return "Ethereum app not installed — install it via Ledger Live.";
  if (code === "6a80")
    return "Blind signing not enabled — enable it in the Ethereum app settings on the device.";
  if (code === "6e00") return "Wrong app open — the Ethereum app will open automatically.";
  if (tag === "DeviceDisconnectedWhileSendingError")
    return "Ledger disconnected. Reconnect and try again.";
  if (tag === "SendApduTimeoutError") return "Ledger timed out — check the connection.";
  if (tag === "NoAccessibleDeviceError")
    return "No Ledger found or access denied — click Connect and select your device.";
  return (error as Error)?.message ?? "Unexpected Ledger error.";
}
