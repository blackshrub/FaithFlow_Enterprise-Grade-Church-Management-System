# 🎭 Demo Mode - UI/UX Testing Guide

This mobile app now supports **Demo Mode** for testing UI/UX without backend authentication.

## How to Use Demo Mode

### 1. Start the App
```bash
cd mobile
npx expo start
```

### 2. Login with Demo Mode

On the login screen, you'll see two options:
- **"Kirim OTP"** - Real authentication (requires backend)
- **"🎭 Demo Login (Skip Auth)"** - Demo mode for UI testing

Tap the **"🎭 Demo Login (Skip Auth)"** button to bypass authentication.

### 3. What Works in Demo Mode

Demo mode provides **fully functional UI** with realistic mock data:

#### ✅ Events
- **5 Upcoming Events** with various types:
  - Sunday Worship Service
  - Youth Group Meeting
  - Prayer & Fasting Week
  - Community Outreach
  - Marriage Enrichment Seminar

- **3 Past Events** for testing history view
- **RSVP Functionality** - All RSVP actions (Going/Maybe/Not Going) work with optimistic updates
- **Pull-to-refresh** - Works with simulated API delays
- **Event Details** - Tap any event to view full details
- **Share** - Share event functionality works

#### ✅ Bible Reader
- Full offline Bible reading (not affected by demo mode)
- All translations work
- Bookmarks, highlights, notes - all functional

#### ✅ Auth Flow
- Demo login stores a fake token
- Logout works correctly
- App state persists across restarts

### 4. Demo User Details

When you use demo login, you're logged in as:

```
Name: Demo User
Email: demo@faithflow.com
Phone: 8123456789
Church: FaithFlow Demo Church
Church ID: demo-church-001
Token: demo-jwt-token-for-testing
```

## Technical Implementation

### Files Modified

1. **[stores/auth.ts](stores/auth.ts#L71-L106)** - `loginDemo()` function
2. **[app/(auth)/login.tsx](app/(auth)/login.tsx#L108-L115)** - Demo login button
3. **[hooks/useEvents.ts](hooks/useEvents.ts)** - Mock data integration
4. **[mock/events.ts](mock/events.ts)** - Realistic event mock data

### How It Works

1. **Demo Token Detection**: All hooks check if token === `'demo-jwt-token-for-testing'`
2. **Mock Data**: When demo mode is detected, hooks return mock data instead of making API calls
3. **Simulated Delays**: Mock responses include realistic delays (300-500ms) for smooth UX
4. **Full Functionality**: RSVP, pull-to-refresh, and all interactions work as they would with real data

### Adding Mock Data for Other Screens

To add demo mode for other screens (Groups, Prayer, etc.):

1. Create mock data file in `/mock/` directory:
   ```typescript
   // mock/groups.ts
   export const mockGroups = [/* ... */];
   ```

2. Update the corresponding hook:
   ```typescript
   // hooks/useGroups.ts
   import { useAuthStore } from '@/stores/auth';
   import { mockGroups } from '@/mock/groups';

   export function useGroups() {
     const { token } = useAuthStore();
     const isDemoMode = token === 'demo-jwt-token-for-testing';

     return useQuery({
       queryFn: async () => {
         if (isDemoMode) {
           await new Promise(resolve => setTimeout(resolve, 500));
           return mockGroups;
         }
         // Real API call
         const response = await api.get('/api/groups');
         return response.data;
       },
       // ...
     });
   }
   ```

## Switching Between Demo and Real Mode

### To Demo Mode:
1. Logout (if logged in)
2. Tap "🎭 Demo Login (Skip Auth)" button

### To Real Mode:
1. Logout from demo mode
2. Enter real phone number
3. Complete OTP verification

## Console Logs

When in demo mode, you'll see helpful console logs:
```
📊 Using mock upcoming events (Demo Mode)
📊 Using mock past events (Demo Mode)
📊 Simulating RSVP (Demo Mode): { eventId: 'event-001', status: 'going' }
```

## Production Deployment

**Important**: Demo mode is always available, even in production builds. This is by design to allow stakeholders to test the app without needing backend access.

If you want to disable demo mode in production:
1. Remove the demo login button from `login.tsx`
2. Or add environment check: `{__DEV__ && <DemoLoginButton />}`

## Testing Checklist

Use this checklist to test the UI/UX:

### Events
- [ ] View upcoming events
- [ ] View past events
- [ ] Switch between tabs
- [ ] Pull to refresh
- [ ] Tap event card to view details
- [ ] RSVP to event (Going)
- [ ] RSVP to event (Maybe)
- [ ] RSVP to event (Not Going)
- [ ] Change RSVP status
- [ ] Share event
- [ ] Scroll through long event list
- [ ] Test loading states (look fast!)
- [ ] Test empty states (try when no events)

### General
- [ ] Login with demo mode
- [ ] Navigate between tabs
- [ ] Logout
- [ ] App state persists after restart

---

**Happy Testing! 🎉**

For questions or issues, contact the development team.
