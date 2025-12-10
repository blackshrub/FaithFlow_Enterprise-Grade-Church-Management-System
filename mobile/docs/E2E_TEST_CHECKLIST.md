# FaithFlow Mobile App - E2E Test Checklist

> Complete this checklist before each release to ensure app quality.
> Mark items with [x] when completed, [ ] when pending.

---

## Pre-Testing Setup

- [ ] Fresh install of the app (delete previous installation)
- [ ] Stable internet connection available
- [ ] Test accounts ready (phone numbers for OTP)
- [ ] Backend server running and accessible
- [ ] Test church data seeded in database

---

## 1. Authentication Flow

### 1.1 Login Flow
- [ ] App launches without crash
- [ ] Login screen displays correctly
- [ ] Phone number field accepts valid input
- [ ] Phone validation works (rejects invalid numbers)
- [ ] "Send OTP" button triggers OTP send
- [ ] OTP received via WhatsApp
- [ ] OTP screen displays correctly
- [ ] OTP validation works (rejects non-numeric input)
- [ ] OTP validation works (rejects wrong length)
- [ ] Successful OTP navigates to church selection
- [ ] Church list loads correctly
- [ ] Church search works
- [ ] Selecting church navigates to main app
- [ ] User data persists after app restart

### 1.2 Logout Flow
- [ ] Logout button visible in profile/settings
- [ ] Logout confirmation dialog appears
- [ ] Logout clears all cached data
- [ ] Logout redirects to login screen
- [ ] Cannot access protected screens after logout

### 1.3 Biometric Authentication
- [ ] Biometric enable/disable toggle works
- [ ] Face ID / Fingerprint prompt appears when enabled
- [ ] Successful biometric unlocks app
- [ ] Failed biometric shows error
- [ ] "Use Password" fallback works
- [ ] Biometric lock triggers when app backgrounded

### 1.4 Session Management
- [ ] App handles expired token gracefully
- [ ] Refresh token flow works
- [ ] 401 response triggers re-login

---

## 2. Multi-Tenant Data Isolation

### 2.1 Church Switching (if applicable)
- [ ] Can switch between churches
- [ ] Previous church data is cleared
- [ ] New church data loads correctly
- [ ] Cache is properly invalidated
- [ ] X-Church-ID header sent in requests

### 2.2 Data Isolation
- [ ] Events show only current church's events
- [ ] Prayer requests show only current church's requests
- [ ] Community shows only current church's community
- [ ] Profile shows correct member data

---

## 3. Main Tab Navigation

### 3.1 Today Tab
- [ ] Today screen loads without crash
- [ ] Coming up events carousel works
- [ ] Quick action buttons are tappable
- [ ] Pull to refresh works
- [ ] Skeleton loader shows while loading

### 3.2 Events Tab
- [ ] Events list loads correctly
- [ ] Event cards display properly
- [ ] Event details screen opens
- [ ] RSVP button works
- [ ] RSVP status updates correctly
- [ ] Cancel RSVP works
- [ ] Event filtering works
- [ ] Pull to refresh works

### 3.3 Give Tab
- [ ] Give screen loads correctly
- [ ] Fund selection works
- [ ] Amount input accepts valid numbers
- [ ] Currency formatting displays correctly
- [ ] Payment method selection works
- [ ] Payment flow completes successfully
- [ ] Success screen shows after payment
- [ ] Giving history loads correctly
- [ ] Pull to refresh works

### 3.4 Profile Tab
- [ ] Profile screen loads correctly
- [ ] Member info displays correctly
- [ ] Edit profile works
- [ ] Settings navigation works
- [ ] Logout button works
- [ ] Pull to refresh shows toast

---

## 4. Grow Panel (Center FAB)

### 4.1 FAB Interaction
- [ ] FAB pulse animation works (when closed)
- [ ] FAB tap opens panel
- [ ] FAB rotates when panel open
- [ ] Panel slides up smoothly
- [ ] Panel backdrop dismisses on tap

### 4.2 Bible Section
- [ ] Bible reader opens correctly
- [ ] Book selection works
- [ ] Chapter navigation works
- [ ] Verse selection works
- [ ] Highlighting works
- [ ] Bookmarks work
- [ ] Notes work
- [ ] Share verse works
- [ ] Reading preferences modal works
- [ ] Font size adjustment works
- [ ] Theme toggle works

### 4.3 Explore Section
- [ ] Explore screen loads
- [ ] Content categories display
- [ ] Devotions load correctly
- [ ] Quizzes work
- [ ] Progress tracking works

---

## 5. Prayer Requests

### 5.1 Create Prayer Request
- [ ] "New Prayer" button works
- [ ] Form loads correctly
- [ ] Title field validation works
- [ ] Description field validation works
- [ ] Category selection works
- [ ] Anonymous toggle works
- [ ] Draft auto-saves
- [ ] Draft loads on return
- [ ] Submit creates prayer request
- [ ] Success notification shows
- [ ] Draft clears after submit

### 5.2 View Prayer Requests
- [ ] Prayer list loads correctly
- [ ] Pull to refresh works
- [ ] Prayer details open
- [ ] Pray button works
- [ ] Share button works

---

## 6. Request Forms

### 6.1 Baptism Request
- [ ] Form loads correctly
- [ ] Login required validation works
- [ ] Preferred date picker works
- [ ] Testimony field works
- [ ] Submit creates request
- [ ] Success screen shows

### 6.2 Accept Jesus
- [ ] Guided prayer displays
- [ ] Commitment type toggle works
- [ ] Prayer confirmation checkbox works
- [ ] Submit creates request
- [ ] Success celebration shows

### 6.3 Holy Matrimony
- [ ] Multi-step form works
- [ ] Partner A info captures
- [ ] Partner B info captures
- [ ] Wedding date picker works
- [ ] Baptism confirmation works
- [ ] Submit creates request

### 6.4 Child Dedication
- [ ] Multi-step form works
- [ ] Father info captures
- [ ] Mother info captures
- [ ] Child info captures
- [ ] Photo capture works
- [ ] Submit creates request

---

## 7. Settings Screens

### 7.1 Privacy Settings
- [ ] Screen loads correctly
- [ ] Online status toggle works
- [ ] Anonymous prayer toggle works
- [ ] Navigation to security works

### 7.2 Notification Settings
- [ ] Screen loads correctly
- [ ] Push notification toggle works
- [ ] Category toggles work
- [ ] Quiet hours setting works

### 7.3 Language Settings
- [ ] Language picker shows
- [ ] English selection works
- [ ] Indonesian selection works
- [ ] App language changes correctly
- [ ] All strings update

### 7.4 Appearance Settings
- [ ] Theme picker shows
- [ ] Light theme works
- [ ] Dark theme works
- [ ] System theme works
- [ ] Theme persists after restart

---

## 8. Network & Offline Behavior

### 8.1 Offline Detection
- [ ] Offline banner appears when network lost
- [ ] Banner shows correct message
- [ ] Banner animates smoothly
- [ ] "Back online" banner appears on reconnect
- [ ] Banner auto-hides after delay

### 8.2 Offline Functionality
- [ ] Cached data available offline
- [ ] Form submissions show error when offline
- [ ] Error messages are helpful
- [ ] Retry works when back online

### 8.3 Network Recovery
- [ ] MQTT reconnects automatically
- [ ] Push notifications resume
- [ ] Data syncs after reconnect

---

## 9. Real-Time Features

### 9.1 Push Notifications
- [ ] FCM token registered on login
- [ ] Notifications received when app backgrounded
- [ ] Notifications received when app foregrounded
- [ ] Notification tap opens correct screen
- [ ] Badge count updates
- [ ] Mark as read works
- [ ] Mark all as read works

### 9.2 MQTT / Real-Time
- [ ] Connection indicator shows status
- [ ] Real-time messages work in community
- [ ] Typing indicators work
- [ ] Online status updates

---

## 10. Error Handling

### 10.1 API Errors
- [ ] 400 errors show helpful message
- [ ] 401 errors trigger re-login
- [ ] 403 errors show access denied
- [ ] 404 errors handled gracefully
- [ ] 500 errors show generic error
- [ ] Network errors show offline message

### 10.2 Form Errors
- [ ] Inline validation errors show
- [ ] Error messages are translated
- [ ] Error states clear on fix
- [ ] Submit button disabled during submit

---

## 11. Accessibility

### 11.1 Screen Reader
- [ ] All buttons have labels
- [ ] Tab bar tabs are accessible
- [ ] Forms are navigable
- [ ] Images have alt text
- [ ] Error messages announced

### 11.2 Visual
- [ ] Text is readable
- [ ] Touch targets are large enough (44x44pt min)
- [ ] Color contrast is sufficient
- [ ] Focus indicators visible

---

## 12. Performance

### 12.1 Startup
- [ ] App launches in < 3 seconds
- [ ] Splash screen displays correctly
- [ ] No white flash between screens

### 12.2 Navigation
- [ ] Tab switches are instant
- [ ] Screen transitions are smooth
- [ ] No janky animations
- [ ] Scrolling is smooth

### 12.3 Memory
- [ ] App doesn't crash after extended use
- [ ] Images load efficiently
- [ ] Lists virtualize correctly

---

## Post-Testing

- [ ] All critical paths tested
- [ ] No crashes observed
- [ ] All major features working
- [ ] Performance acceptable
- [ ] Ready for release

---

## Sign-Off

**Tested By:** ____________________

**Date:** ____________________

**Build Version:** ____________________

**Device(s) Tested:**
- [ ] iOS Simulator
- [ ] iOS Physical Device: ____________________
- [ ] Android Emulator
- [ ] Android Physical Device: ____________________

**Notes:**
```
(Add any observations, issues found, or recommendations here)
```

---

## Issue Tracking

| # | Screen | Issue | Severity | Status |
|---|--------|-------|----------|--------|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |

Severity: Critical / High / Medium / Low
Status: Open / Fixed / Won't Fix
