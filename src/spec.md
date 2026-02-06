# Specification

## Summary
**Goal:** Fix the Android-only regression where tapping any icon-based UI control (including bottom navigation and header icon buttons) causes a blank white screen and makes the app non-interactive.

**Planned changes:**
- Identify and fix the runtime error(s) triggered by icon taps/navigation on Android so page switches and icon interactions do not crash the UI.
- Ensure the app uses a single React Query provider instance across the full React tree (remove any duplicate/nested provider setup that could break context during navigation).
- Add a recoverable in-app error state for navigation/icon-triggered runtime errors so the UI does not degrade into a blank white screen and the app remains usable.

**User-visible outcome:** On Android, tapping bottom navigation items (Dashboard, Calendar, Journal, Reports) and other icon buttons (e.g., header login/logout) works normally without a blank white screen; if an error occurs, the user sees a recoverable error state and can continue using the app.
