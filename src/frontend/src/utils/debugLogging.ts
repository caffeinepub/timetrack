/**
 * Console-only debug logging utility for UI interactions
 * Logs are only emitted in development mode or when explicitly enabled
 * No user data or sensitive information is logged
 */

const DEBUG_ENABLED = 
  import.meta.env.DEV || 
  (typeof localStorage !== 'undefined' && localStorage.getItem('DEBUG_UI_INTERACTIONS') === 'true');

export function logDebug(component: string, message: string): void {
  if (DEBUG_ENABLED) {
    console.log(`[DEBUG:${component}] ${message}`);
  }
}

export function enableDebugLogging(): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('DEBUG_UI_INTERACTIONS', 'true');
    console.log('[DEBUG] UI interaction logging enabled. Reload the page to see logs.');
  }
}

export function disableDebugLogging(): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('DEBUG_UI_INTERACTIONS');
    console.log('[DEBUG] UI interaction logging disabled.');
  }
}
