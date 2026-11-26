export const DEFAULT_SERVER_NAME = "RoboApps Server";
export const SERVER_VERSION = "v2026.11.26+1";

export function resolveServerName(override?: string): string {
  const trimmed = typeof override === "string" ? override.trim() : "";
  return trimmed || DEFAULT_SERVER_NAME;
}
