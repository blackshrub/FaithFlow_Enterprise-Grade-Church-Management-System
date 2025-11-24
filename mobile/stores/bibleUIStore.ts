/**
 * Bible UI State Store
 *
 * Manages global UI state for Bible features that need to be controlled
 * from anywhere in the app (especially modals that need portal rendering):
 * - Note Editor Modal state
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

  // Actions
  openNoteEditor: (params: {
    verseReference: string;
    initialNote?: string;
    onSave: (note: string) => void;
  }) => void;
  closeNoteEditor: () => void;
}

export const useBibleUIStore = create<BibleUIState>()((set) => ({
  // Initial state
  noteEditor: {
    isOpen: false,
    verseReference: '',
    initialNote: '',
    onSave: null,
  },

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
}));
