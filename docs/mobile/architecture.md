# 📱 FaithFlow Mobile App Architecture

## Tech Stack

### Core Framework
- **React Native** with **Expo SDK 51+**
- **Expo Router v6** - File-based navigation
- **TypeScript** - Strict mode

### UI & Styling
- **Gluestack Pro** - Primary UI component library
- **NativeWind v4** - Tailwind CSS for React Native
- **Moti (Reanimated 3)** - Smooth animations
- **FlashList** - High-performance lists
- **Lucide React Native** - Icons

### State Management
- **@tanstack/react-query** - Server state
- **Zustand** - Auth & UI state
- **Expo SecureStore** - Token storage

### Networking
- **axios** - HTTP client with interceptors
- **Expo Notifications** - Push notifications (FCM)

## Project Structure

```
mobile/
├── app/                          # Expo Router v6 routes
│   ├── _layout.tsx              # Root layout with theme
│   ├── (auth)/                  # Auth group
│   │   ├── login.tsx            # Phone + OTP login
│   │   └── select-church.tsx    # Church selection
│   ├── (tabs)/                  # Bottom tabs group
│   │   ├── _layout.tsx          # Custom animated tabs
│   │   ├── home.tsx             # Dashboard
│   │   ├── events/
│   │   │   ├── index.tsx        # Events list
│   │   │   └── [eventId].tsx   # Event details
│   │   ├── groups/
│   │   │   ├── index.tsx        # Groups list
│   │   │   └── [groupId].tsx   # Group details
│   │   ├── bible/
│   │   │   ├── index.tsx        # Bible home
│   │   │   ├── [book].tsx       # Chapter list
│   │   │   └── [book]/[chapter].tsx  # Verse reader
│   │   ├── give/
│   │   │   ├── index.tsx        # Give home
│   │   │   ├── payment.tsx      # Payment flow
│   │   │   └── history.tsx      # Giving history
│   │   ├── more/
│   │   │   ├── index.tsx        # More menu
│   │   │   ├── profile.tsx      # Profile view
│   │   │   ├── settings.tsx     # Settings
│   │   │   ├── prayers.tsx      # Prayer requests
│   │   │   └── counseling.tsx   # Counseling
│   │   └── +not-found.tsx       # 404 page
│
├── components/
│   ├── ui/                      # Gluestack Pro components
│   ├── shared/
│   │   ├── AnimatedFAB.tsx      # Give FAB button
│   │   ├── AnimatedTabBar.tsx   # Custom tab bar
│   │   ├── SkeletonLoader.tsx   # Moti skeleton
│   │   └── Header.tsx           # Animated header
│   ├── animations/
│   │   ├── FadeIn.tsx
│   │   ├── SlideUp.tsx
│   │   └── ScaleIn.tsx
│   ├── bible/
│   │   ├── BookCard.tsx
│   │   ├── ChapterGrid.tsx
│   │   └── VerseReader.tsx
│   ├── events/
│   │   ├── EventCard.tsx
│   │   └── RSVPButton.tsx
│   └── forms/
│       ├── PhoneInput.tsx
│       └── OTPInput.tsx
│
├── hooks/
│   ├── useAuth.ts               # Auth hook
│   ├── useAPI.ts                # API wrapper
│   ├── useBible.ts              # Bible data
│   ├── useEvents.ts             # Events data
│   ├── useGroups.ts             # Groups data
│   ├── useGive.ts               # Giving data
│   └── useNotifications.ts      # Push notifications
│
├── stores/
│   ├── auth.ts                  # Zustand auth store
│   ├── ui.ts                    # UI state
│   └── bible.ts                 # Bible preferences
│
├── lib/
│   ├── axios.ts                 # Axios instance
│   ├── theme.ts                 # Theme config
│   ├── constants.ts             # App constants
│   └── utils.ts                 # Utilities
│
├── types/
│   ├── api.ts                   # API types
│   ├── models.ts                # Data models
│   └── navigation.ts            # Navigation types
│
├── assets/
│   ├── images/
│   ├── fonts/
│   └── icons/
│
├── app.json                     # Expo config
├── package.json
├── tsconfig.json
├── tailwind.config.js           # NativeWind config
└── metro.config.js              # Metro bundler
```

## Navigation Structure

### Bottom Tabs (5 tabs)
1. **Home** - Dashboard
2. **Events** - Browse & RSVP
3. **GIVE** - Animated FAB (center)
4. **Groups** - Browse & join
5. **More** - Profile, Prayer, Counseling, Settings

### Auth Flow
```
Splash → Login → Select Church → (Tabs)
```

### Tab Animations
- Custom animated tab bar with Moti
- Scale + translate on active tab
- Icon color transitions
- Center FAB with pulse/float animation

## API Integration

### Member Auth Endpoints
- `POST /api/member-auth/send-otp` - Send WhatsApp OTP
- `POST /api/member-auth/verify-otp` - Verify & get JWT

### Giving Endpoints
- `GET /api/giving/funds` - List offering funds
- `POST /api/giving/submit` - Submit offering
- `GET /api/giving/my-history` - Giving history

### Bible Endpoints (Public)
- `GET /api/bible/versions` - Bible versions
- `GET /api/bible/books` - Book list
- `GET /api/bible/{version}/{book}/{chapter}` - Chapter verses

### Events Endpoints
- `GET /api/events/` - List events
- `GET /api/events/{id}` - Event details
- `POST /api/events/{id}/rsvp` - Create RSVP
- `DELETE /api/events/{id}/rsvp/{memberId}` - Cancel RSVP

### Groups Endpoints (Public)
- `GET /api/public/groups/` - List groups
- `GET /api/public/groups/{id}` - Group details
- `POST /api/public/groups/{id}/join-request` - Request join

### Notifications
- `POST /api/notifications/register-device` - Register FCM token
- `GET /api/notifications/preferences` - Get preferences
- `PATCH /api/notifications/preferences` - Update preferences

## Theme & Styling

### Color Palette
```typescript
colors: {
  primary: '#6366F1',      // Indigo
  secondary: '#EC4899',    // Pink
  success: '#10B981',      // Green
  warning: '#F59E0B',      // Amber
  error: '#EF4444',        // Red
  background: '#FFFFFF',
  backgroundDark: '#1F2937',
  text: '#111827',
  textDark: '#F9FAFB',
}
```

### Typography Scale
```typescript
fontSize: {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
}
```

### Spacing Scale
```typescript
spacing: {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
}
```

## Animation Guidelines

### Moti Usage

**Screen Transitions:**
```typescript
<MotiView
  from={{ opacity: 0, translateY: 20 }}
  animate={{ opacity: 1, translateY: 0 }}
  transition={{ type: 'timing', duration: 300 }}
>
  {children}
</MotiView>
```

**FAB Animation:**
```typescript
<MotiPressable
  animate={useMemo(() => ({
    scale: [1, 1.05, 1],
  }), [])}
  transition={{
    type: 'timing',
    duration: 1500,
    loop: true,
  }}
>
  <GiveButton />
</MotiPressable>
```

**Skeleton Loader:**
```typescript
<MotiView
  from={{ opacity: 0.3 }}
  animate={{ opacity: 1 }}
  transition={{
    type: 'timing',
    duration: 1000,
    loop: true,
  }}
/>
```

## Performance Optimizations

1. **FlashList** for all long lists (Bible, Events, History)
2. **React.memo** for expensive components
3. **useMemo/useCallback** for stable references
4. **Expo Image** for optimized image loading
5. **Query caching** with React Query
6. **Lazy loading** for heavy screens

## Security

1. **JWT** stored in Expo SecureStore
2. **Token** auto-attached via axios interceptor
3. **1-year expiry** - stay logged in forever
4. **Biometric** auth (future enhancement)
5. **Certificate pinning** (production)

## Offline Support (Future)

1. React Query persistence
2. AsyncStorage for Bible favorites
3. Offline indicator
4. Queue failed requests

## Dark Mode

- System-aware via NativeWind
- Manual toggle in settings
- Smooth transition with Moti
- Persisted preference

---

**Status:** Ready for implementation
**Next Steps:** Initialize Expo project with all dependencies
