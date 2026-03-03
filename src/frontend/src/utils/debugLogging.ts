/**
 * Console-only debug logging utility for UI interactions
 * Logs are only emitted in development mode or when explicitly enabled
 * No user data or sensitive information is logged
 */

const DEBUG_ENABLED =
  import.meta.env.DEV ||
  (typeof localStorage !== "undefined" &&
    localStorage.getItem("DEBUG_UI_INTERACTIONS") === "true");

// In-memory circular buffer for last N interactions (opt-in via debug flag)
const MAX_INTERACTION_HISTORY = 20;
const interactionHistory: Array<{
  timestamp: number;
  component: string;
  message: string;
}> = [];

export function logDebug(component: string, message: string): void {
  if (DEBUG_ENABLED) {
    const timestamp = Date.now();
    console.log(`[DEBUG:${component}] ${message}`);

    // Store in circular buffer (only when debug is enabled)
    interactionHistory.push({ timestamp, component, message });
    if (interactionHistory.length > MAX_INTERACTION_HISTORY) {
      interactionHistory.shift();
    }
  }
}

export function getInteractionHistory(): Array<{
  timestamp: number;
  component: string;
  message: string;
}> {
  return DEBUG_ENABLED ? [...interactionHistory] : [];
}

export function clearInteractionHistory(): void {
  interactionHistory.length = 0;
  if (DEBUG_ENABLED) {
    console.log("[DEBUG] Interaction history cleared");
  }
}

export function enableDebugLogging(): void {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("DEBUG_UI_INTERACTIONS", "true");
    console.log(
      "[DEBUG] UI interaction logging enabled. Reload the page to see logs.",
    );
  }
}

export function disableDebugLogging(): void {
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem("DEBUG_UI_INTERACTIONS");
    console.log("[DEBUG] UI interaction logging disabled.");
  }
}
