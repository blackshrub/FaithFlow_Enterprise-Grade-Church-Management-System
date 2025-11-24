# FaithFlow Mobile - Assets Needed

The following asset files are currently placeholders and should be replaced with actual FaithFlow branding:

## App Icons & Branding

### 1. **icon.png**
- **Location**: `mobile/assets/icon.png`
- **Size**: 1024x1024 px
- **Format**: PNG with transparency
- **Purpose**: Main app icon for iOS and Android
- **Design**: FaithFlow logo/icon on solid or gradient background
- **Brand Color**: Should use #6366F1 (indigo) as primary color

### 2. **adaptive-icon.png**
- **Location**: `mobile/assets/adaptive-icon.png`
- **Size**: 1024x1024 px
- **Format**: PNG with transparency
- **Purpose**: Android adaptive icon (foreground layer)
- **Design**: FaithFlow logo centered, leaving 25% safe zone from edges
- **Background**: Transparent or single color

### 3. **splash.png**
- **Location**: `mobile/assets/splash.png`
- **Size**: 1284x2778 px (iPhone 14 Pro Max resolution)
- **Format**: PNG
- **Purpose**: Splash screen shown during app launch
- **Design**: FaithFlow logo centered on #6366F1 background
- **Elements**: Logo + "FaithFlow" text + optional tagline

### 4. **favicon.png**
- **Location**: `mobile/assets/favicon.png`
- **Size**: 48x48 px (or 512x512 px for better quality)
- **Format**: PNG
- **Purpose**: Web version favicon
- **Design**: Simplified FaithFlow icon/logo

## Notification Assets

### 5. **notification-icon.png**
- **Location**: `mobile/assets/notification-icon.png`
- **Size**: 96x96 px (Android) or 192x192 px
- **Format**: PNG with transparency
- **Purpose**: Icon shown in push notifications (Android)
- **Design**: Monochrome or simple FaithFlow icon
- **Color**: White icon on transparent background (for Android notification tray)

### 6. **notification.wav**
- **Location**: `mobile/assets/notification.wav`
- **Format**: WAV (iOS/Android compatible)
- **Duration**: 1-3 seconds
- **Purpose**: Custom notification sound
- **Design**: Gentle, non-intrusive sound (optional - can use system defaults)
- **Alternative**: Can also use MP3 format

## Design Guidelines

### Brand Colors
- **Primary**: #6366F1 (Indigo 500)
- **Background**: Can use gradient from indigo to purple
- **Text**: White on colored backgrounds

### Style Recommendations
1. **Modern & Clean**: Minimalist design, avoid clutter
2. **Professional**: Enterprise-grade appearance
3. **Spiritual**: Subtle religious elements (cross, dove, hands in prayer)
4. **Recognizable**: Easily identifiable at small sizes

### File Requirements
- All PNGs should be optimized (use tools like TinyPNG)
- Maintain aspect ratios specified
- Use PNG-24 for images requiring transparency
- Icons should be sharp and clear at all sizes

## How to Replace Assets

1. Create your branded assets following the specifications above
2. Replace the placeholder files in `mobile/assets/`
3. Ensure file names match exactly
4. Clear Expo cache: `npx expo start --clear`
5. Test on both iOS and Android devices

## Optional Additional Assets

Consider adding these for enhanced branding:
- **App Store Screenshots**: Required for App Store/Play Store listings
- **Promo Graphics**: 1024x500 px for Google Play
- **Background Images**: For login screen, welcome screen
- **Logo Variations**: Light/dark mode versions
- **Icon Set**: Custom icons for tabs, features

## Testing Checklist

After replacing assets:
- [ ] App icon appears correctly on home screen (iOS & Android)
- [ ] Splash screen displays properly during launch
- [ ] Notification icon is visible in notification tray
- [ ] Icons look sharp on various screen densities
- [ ] No pixelation or distortion
- [ ] Colors match brand guidelines
- [ ] Dark mode compatibility (if applicable)

---

**Note**: Current placeholder assets are minimal 1x1 pixel PNGs. They work functionally but should be replaced with professional branding before production release.

## PENDING TASKS

When you ask "is there any pending tasks?" or similar, I will remind you of:

1. **Replace Placeholder Assets** (HIGH PRIORITY)
   - All 6 asset files listed above need professional FaithFlow branding
   - Current assets are 1px placeholders that work but look unprofessional

2. **Mobile App Testing**
   - Test app on Expo Go SDK 54
   - Verify all screens work correctly
   - Test bilingual support (EN/ID)

3. **Backend Integration**
   - Connect mobile app to FastAPI backend
   - Test API endpoints with mobile app
   - Configure API base URL in mobile app constants
