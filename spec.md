# Specification

## Summary
**Goal:** Update all time duration displays across the application to use an "XhMM" format (e.g., "7h30", "1h05").

**Planned changes:**
- Update the shared `timeFormatting.ts` utility to produce the "XhMM" format with zero-padded two-digit minutes
- Update Dashboard, Calendar, and Reports pages to display time durations using the new format

**User-visible outcome:** All time durations throughout the app (Dashboard, Calendar, Reports) are shown as hours and zero-padded minutes (e.g., "7h30", "2h05", "0h00") instead of any previous format.
