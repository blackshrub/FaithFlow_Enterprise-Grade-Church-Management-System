# Accessibility Implementation Guide
**Phase 9.2 - WCAG 2.1 AA Compliance**

## Overview

This guide ensures FaithFlow Explore is accessible to all users, including those with:
- Visual impairments (blind, low vision, color blind)
- Motor disabilities (limited dexterity, keyboard-only navigation)
- Cognitive disabilities (clear language, consistent UI)
- Hearing impairments (visual alternatives for audio)

**Target:** WCAG 2.1 Level AA compliance

---

## 🎯 Success Criteria

✅ Screen reader support (VoiceOver, TalkBack)
✅ Keyboard navigation (web admin)
✅ Color contrast ratios (4.5:1 minimum)
✅ Focus indicators
✅ Semantic HTML/components
✅ ARIA attributes where needed
✅ Text alternatives for images
✅ No keyboard traps
✅ Consistent navigation

---

## 📱 Mobile App Accessibility (React Native)

### 1. Screen Reader Support

#### Core Principles
- Every interactive element needs `accessibilityLabel`
- Group related elements with `accessible={true}`
- Provide context with `accessibilityHint`
- Announce dynamic changes with `accessibilityLiveRegion`

#### Implementation Checklist

**Buttons & Touchables:**
```tsx
// ❌ Bad - no accessibility
<TouchableOpacity onPress={handlePress}>
  <Icon name="heart" />
</TouchableOpacity>

// ✅ Good - descriptive label
<TouchableOpacity
  onPress={handlePress}
  accessibilityLabel="Like this devotion"
  accessibilityHint="Double tap to save to your favorites"
  accessibilityRole="button"
>
  <Icon name="heart" />
</TouchableOpacity>
```

**Images:**
```tsx
// ❌ Bad - no alternative text
<Image source={{ uri: devotion.imageUrl }} />

// ✅ Good - descriptive alt text
<Image
  source={{ uri: devotion.imageUrl }}
  accessibilityLabel={`Cover image for ${devotion.title}`}
  accessibilityIgnoresInvertColors={true} // Preserve image colors in dark mode
/>
```

**Text Input:**
```tsx
// ❌ Bad - unlabeled input
<TextInput placeholder="Search..." />

// ✅ Good - labeled and described
<View>
  <Text accessibilityRole="header" accessibilityLevel={2}>
    Search Devotions
  </Text>
  <TextInput
    placeholder="Search..."
    accessibilityLabel="Search devotions"
    accessibilityHint="Enter keywords to find devotions"
  />
</View>
```

**Lists:**
```tsx
// ✅ Good - announce list context
<FlatList
  data={devotions}
  accessibilityLabel={`Devotions list, ${devotions.length} items`}
  renderItem={({ item, index }) => (
    <TouchableOpacity
      accessibilityLabel={`Devotion ${index + 1} of ${devotions.length}: ${item.title}`}
      accessibilityHint="Double tap to read full devotion"
    >
      <Text>{item.title}</Text>
    </TouchableOpacity>
  )}
/>
```

**Dynamic Content:**
```tsx
// ✅ Announce changes
<View accessibilityLiveRegion="polite">
  <Text>{`Streak: ${streak} days`}</Text>
</View>

// For urgent announcements
<View accessibilityLiveRegion="assertive">
  <Text>{errorMessage}</Text>
</View>
```

### 2. Focus Management

```tsx
import { useRef, useEffect } from 'react';
import { AccessibilityInfo } from 'react-native';

// Auto-focus first input when screen opens
const MyScreen = () => {
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      inputRef.current?.focus();
      AccessibilityInfo.setAccessibilityFocus(findNodeHandle(inputRef.current));
    }, 100);

    return () => clearTimeout(timeout);
  }, []);

  return <TextInput ref={inputRef} />;
};
```

### 3. Color Contrast

**Minimum Ratios (WCAG 2.1 AA):**
- Normal text (< 18pt): 4.5:1
- Large text (≥ 18pt or 14pt bold): 3:1
- UI components: 3:1

**Check Colors:**
```tsx
// ❌ Bad - insufficient contrast
const styles = {
  text: {
    color: '#999', // Gray text
    backgroundColor: '#fff', // White background
    // Contrast: 2.85:1 - FAIL
  }
};

// ✅ Good - sufficient contrast
const styles = {
  text: {
    color: '#333', // Dark gray text
    backgroundColor: '#fff', // White background
    // Contrast: 12.63:1 - PASS
  }
};
```

**Color Blindness Support:**
- Don't rely on color alone to convey information
- Use icons + text labels
- Add patterns or shapes to distinguish elements

```tsx
// ❌ Bad - color only
<View style={{ backgroundColor: 'red' }}>
  <Text>Error</Text>
</View>

// ✅ Good - icon + color + text
<View style={{ backgroundColor: '#dc2626', padding: 12, borderRadius: 8 }}>
  <AlertCircle color="#fff" size={20} />
  <Text style={{ color: '#fff', fontWeight: 'bold' }}>
    Error: Could not load content
  </Text>
</View>
```

### 4. Touch Target Size

**Minimum:** 44x44 points (iOS) / 48x48 dp (Android)

```tsx
// ❌ Bad - too small
<TouchableOpacity style={{ width: 20, height: 20 }}>
  <Icon size={20} />
</TouchableOpacity>

// ✅ Good - adequate size
<TouchableOpacity
  style={{
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  }}
>
  <Icon size={24} />
</TouchableOpacity>

// ✅ Better - use hitSlop for small visual elements
<TouchableOpacity
  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
>
  <Icon size={20} />
</TouchableOpacity>
```

---

## 💻 Web Admin Accessibility (React)

### 1. Keyboard Navigation

**Tab Order:**
- Logical flow (top to bottom, left to right)
- Skip links for repeated content
- No keyboard traps

```tsx
// ✅ Skip navigation
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50 focus:p-4 focus:bg-blue-600 focus:text-white"
>
  Skip to main content
</a>

<nav>...</nav>

<main id="main-content">...</main>
```

**Focus Indicators:**
```css
/* ❌ Bad - remove outline */
button:focus {
  outline: none; /* Never do this! */
}

/* ✅ Good - visible focus */
button:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

/* ✅ Better - custom focus ring */
button:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5);
}
```

**Keyboard Shortcuts:**
```tsx
const useKeyboardShortcuts = () => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }

      // Escape to close modal
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
};
```

### 2. ARIA Attributes

**Buttons:**
```tsx
// Icon-only button
<button
  aria-label="Delete devotion"
  aria-describedby="delete-hint"
>
  <TrashIcon />
</button>
<span id="delete-hint" className="sr-only">
  This action cannot be undone
</span>

// Toggle button
<button
  aria-label="Toggle sidebar"
  aria-pressed={sidebarOpen}
>
  <MenuIcon />
</button>
```

**Forms:**
```tsx
// ✅ Associated label and error
<div>
  <label htmlFor="title" id="title-label">
    Title
  </label>
  <input
    id="title"
    aria-labelledby="title-label"
    aria-describedby="title-error"
    aria-invalid={hasError}
    aria-required="true"
  />
  {hasError && (
    <span id="title-error" role="alert">
      Title is required
    </span>
  )}
</div>
```

**Live Regions:**
```tsx
// Announce status updates
<div
  role="status"
  aria-live="polite"
  aria-atomic="true"
>
  {statusMessage}
</div>

// Announce errors
<div
  role="alert"
  aria-live="assertive"
>
  {errorMessage}
</div>
```

**Modal Dialogs:**
```tsx
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
  aria-describedby="modal-description"
>
  <h2 id="modal-title">Delete Confirmation</h2>
  <p id="modal-description">
    Are you sure you want to delete this devotion?
  </p>
  <button onClick={handleDelete}>Delete</button>
  <button onClick={handleCancel}>Cancel</button>
</div>
```

### 3. Semantic HTML

```tsx
// ❌ Bad - divs for everything
<div onClick={handleClick}>Click me</div>
<div className="heading">Title</div>

// ✅ Good - semantic elements
<button onClick={handleClick}>Click me</button>
<h2>Title</h2>

// ✅ Good - proper structure
<article>
  <header>
    <h2>Devotion Title</h2>
    <time datetime="2024-01-15">January 15, 2024</time>
  </header>
  <main>
    <p>Content...</p>
  </main>
  <footer>
    <button>Like</button>
    <button>Share</button>
  </footer>
</article>
```

---

## 🧪 Testing Checklist

### Mobile App Testing

**iOS VoiceOver:**
1. Enable: Settings → Accessibility → VoiceOver
2. Navigate: Swipe right/left
3. Activate: Double-tap
4. Rotor: Rotate two fingers
5. Test: All screens and features

**Android TalkBack:**
1. Enable: Settings → Accessibility → TalkBack
2. Navigate: Swipe right/left
3. Activate: Double-tap
4. Test: All screens and features

**Color Contrast:**
- Use [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- Test in grayscale mode
- Test with color blindness simulators

### Web Admin Testing

**Keyboard Navigation:**
```
Tab       → Navigate forward
Shift+Tab → Navigate backward
Enter     → Activate
Space     → Toggle (checkbox, button)
Escape    → Close (modal, menu)
Arrow     → Navigate (menu, list)
```

**Screen Readers:**
- NVDA (Windows): Free
- JAWS (Windows): Commercial
- VoiceOver (Mac): Built-in

**Browser DevTools:**
- Chrome Lighthouse Accessibility Audit
- axe DevTools extension
- WAVE browser extension

---

## 📋 Implementation Priority

### High Priority (Must Have)
1. ✅ Screen reader labels for all interactive elements
2. ✅ Keyboard navigation (web)
3. ✅ Color contrast compliance
4. ✅ Focus indicators
5. ✅ Semantic HTML/components

### Medium Priority (Should Have)
6. ⏳ ARIA live regions for dynamic content
7. ⏳ Keyboard shortcuts (web)
8. ⏳ Skip links (web)
9. ⏳ Form error handling
10. ⏳ Focus management (modals)

### Low Priority (Nice to Have)
11. ⏳ High contrast mode support
12. ⏳ Reduced motion support
13. ⏳ Font size customization
14. ⏳ Dyslexia-friendly fonts

---

## 🛠️ Tools & Resources

**Testing Tools:**
- [axe DevTools](https://www.deque.com/axe/devtools/) - Browser extension
- [WAVE](https://wave.webaim.org/) - Web accessibility evaluation
- [Accessibility Insights](https://accessibilityinsights.io/) - Microsoft tool
- [Color Contrast Analyzer](https://www.tpgi.com/color-contrast-checker/)

**Guidelines:**
- [WCAG 2.1](https://www.w3.org/WAI/WCAG21/quickref/)
- [React Native Accessibility](https://reactnative.dev/docs/accessibility)
- [React Accessibility](https://react.dev/learn/accessibility)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)

**Screen Reader Testing:**
- [VoiceOver User Guide](https://support.apple.com/guide/iphone/voiceover-iph3e2e415f)
- [TalkBack User Guide](https://support.google.com/accessibility/android/answer/6283677)
- [NVDA User Guide](https://www.nvaccess.org/files/nvda/documentation/userGuide.html)

---

## Status

**Phase 9.2 Status:** Ready to implement
**Next Steps:**
1. Add accessibility labels to mobile screens
2. Implement keyboard navigation (web)
3. Audit color contrast
4. Add ARIA attributes (web)
5. Test with screen readers
