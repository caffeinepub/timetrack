/**
 * Build information utility
 * Exposes production-relevant build metadata for verification
 */

export interface BuildInfo {
  mode: string;
  timestamp?: string;
}

export function getBuildInfo(): BuildInfo {
  return {
    mode: import.meta.env.MODE || "unknown",
    timestamp: import.meta.env.VITE_BUILD_TIMESTAMP,
  };
}
