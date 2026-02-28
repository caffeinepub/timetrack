# Specification

## Summary
**Goal:** Display a welcome message dialog on app startup and fix the Android Chrome `removeChild` DOM crash.

**Planned changes:**
- Add a dismissible welcome/informational modal that appears automatically when the app first loads, shown only once per session
- Audit and fix all components with conditional rendering, portals, or dynamic DOM manipulation (dialogs, modals, tab navigation) to prevent the `DOMException: removeChild` crash on Android Chrome using defensive guards or stable keying strategies

**User-visible outcome:** Users see a welcome message when opening the app (dismissible, not repeated in the same session), and the app no longer crashes with the "Quelque chose s'est mal passé" error boundary screen on Android Chrome.
