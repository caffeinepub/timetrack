# Android Chrome Regression Checklist

This checklist verifies that icon-based UI controls work correctly on Android Chrome without triggering DOMException errors or ErrorBoundary crashes.

## Prerequisites
- Android device or emulator with Chrome browser
- Application deployed and accessible
- User logged in with Internet Identity

## Production Build Verification Requirement

**IMPORTANT:** This checklist MUST be completed on a production-mode build (minified) before publishing.

- [ ] **Production build tested**: Confirm you are testing the production bundle (check build mode badge in UI)
- [ ] **Build mode verified**: UI shows "v7 (MODE=production)" or similar production indicator
- [ ] **Timestamp visible** (if configured): Build timestamp is displayed in the UI

See `frontend/PRODUCTION_BUILD_RUNBOOK.md` for instructions on building and serving the production bundle locally.

## Test Steps

### 1. Bottom Navigation Tabs
Test each bottom navigation tab by tapping on the icon and label:

- [ ] **Dashboard tab**: Tap the chart icon → Dashboard page loads without error
- [ ] **Calendar tab**: Tap the calendar icon → Calendar page loads without error
- [ ] **Journal tab**: Tap the microphone icon → Journal page loads without error
- [ ] **Reports tab**: Tap the PDF icon → Reports page loads without error

**Expected**: Each tap switches the active tab smoothly. No ErrorBoundary screen appears. No console errors related to "removeChild" or DOM manipulation.

### 2. Header Icon Buttons
Test header controls:

- [ ] **Login/Logout button**: Tap the button with icon → Authentication flow starts/completes without error
- [ ] **Admin Restart Publish button** (if admin): Tap the button with refresh icon → Dialog opens without error

**Expected**: Buttons respond to taps. Dialogs open/close smoothly. No ErrorBoundary screen. No console errors.

### 3. Rapid Tapping
Simulate rapid user interaction:

- [ ] **Rapid tab switching**: Quickly tap between Dashboard → Calendar → Journal → Reports (5 times in 3 seconds)
- [ ] **Rapid dialog open/close**: If admin, quickly open and close the Restart Publish dialog (3 times)

**Expected**: UI remains stable. No white screen. No ErrorBoundary. Console may show debug logs but no DOMException errors.

### 4. Console Verification
Open Chrome DevTools (chrome://inspect on desktop, connect Android device):

- [ ] **No DOMException errors**: Check console for "removeChild" or "Node" errors → None present
- [ ] **Debug logs present** (if enabled): See `[DEBUG:MobileBottomNav]`, `[DEBUG:Header]`, `[DEBUG:App]` logs
- [ ] **No React errors**: No "Cannot read property" or "undefined" errors in console

### 5. Admin Publish Dialog Verification (Admin Only)

- [ ] **Checklist confirmation required**: Restart Publish dialog shows pre-publish verification gate
- [ ] **Checklist link works**: "View Checklist" button opens this document
- [ ] **Publish disabled without confirmation**: Restart Publish button is disabled until checkbox is checked
- [ ] **Publish enabled after confirmation**: Checking the checkbox enables the Restart Publish button

## Debug Logging

To enable console debug logs for UI interactions:

1. Open browser console on the device
2. Run: `localStorage.setItem('DEBUG_UI_INTERACTIONS', 'true')`
3. Reload the page
4. Tap controls and verify logs appear: `[DEBUG:ComponentName] message`

To disable:

