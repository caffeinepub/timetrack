# Specification

## Summary
**Goal:** Stop the Android Chrome crash triggered by tapping any icon-based control, add lightweight console-only debug logging + a regression checklist, and localize the crash (ErrorBoundary) UI text to English.

**Planned changes:**
- Fix the Android/Chrome DOMException (`removeChild`) that occurs on tap/click of icon-based controls (bottom navigation tabs and header icon/buttons), ensuring these interactions do not trigger the ErrorBoundary or freeze the UI.
- Add console-only debug logging around tab switches and icon-button clicks, and document a small regression test checklist to verify the fix on Android without adding any new user-facing debug UI.
- Update the ErrorBoundary user-facing copy (title, description, buttons) to English while keeping the technical error details visible for troubleshooting.

**User-visible outcome:** On Android Chrome, users can tap any icon-based navigation/control without crashing; if a crash occurs, the recovery screen is in English and still shows technical error details with reload/back recovery options.
