/**
 * Bible UI State Store
 *
 * Manages global UI state for Bible features that need to be controlled
 * from anywhere in the app (especially modals that need portal rendering):
 * - Note Editor Modal state
 * - Focus mode tab bar visibility
 * - Other global Bible UI modals in future
 */

import { create } from 'zustand';

interface NoteEditorState {
  isOpen: boolean;
  verseReference: string;
  initialNote: string;
  onSave: ((note: string) => void) | null;
}

interface BibleUIState {
  noteEditor: NoteEditorState;

  // Focus mode - controls tab bar visibility when Bible is in focus mode
  focusModeActive: boolean; // Is focus mode enabled in Bible reader
  tabBarVisible: boolean; // Should tab bar be visible (controlled by scroll in focus mode)

  // Actions
  openNoteEditor: (params: {
    verseReference: string;
    initialNote?: string;
    onSave: (note: string) => void;
  }) => void;
  closeNoteEditor: () => void;

  // Focus mode actions
  setFocusModeActive: (active: boolean) => void;
  setTabBarVisible: (visible: boolean) => void;
}

export const useBibleUIStore = create<BibleUIState>()((set) => ({
  // Initial state
  noteEditor: {
    isOpen: false,
    verseReference: '',
    initialNote: '',
    onSave: null,
  },

  // Focus mode initial state - tab bar visible by default, only hides on scroll down
  focusModeActive: false,
  tabBarVisible: true, // Always visible by default

  // Actions
  openNoteEditor: ({ verseReference, initialNote = '', onSave }) => {
    console.log('📝 Opening note editor:', { verseReference, initialNote });
    set({
      noteEditor: {
        isOpen: true,
        verseReference,
        initialNote,
        onSave,
      },
    });
  },

  closeNoteEditor: () => {
    console.log('📝 Closing note editor');
    set({
      noteEditor: {
        isOpen: false,
        verseReference: '',
        initialNote: '',
        onSave: null,
      },
    });
  },

  setFocusModeActive: (active) => {
    // When focus mode is enabled, tab bar stays visible by default
    // It only hides when user scrolls down
    // When focus mode is disabled, tab bar is always visible
    set({ focusModeActive: active, tabBarVisible: true });
  },

  setTabBarVisible: (visible) => {
    set({ tabBarVisible: visible });
  },
}));
