/**
 * BibleNoteEditorHost - Bridge Component
 *
 * Bridges the bibleUIStore note editor state to the unified overlay system.
 * When noteEditor.isOpen becomes true, opens the NoteEditorSheet via overlay.
 *
 * This component should be rendered in the root layout alongside UnifiedOverlayHost.
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { useBibleUIStore } from '@/stores/bibleUIStore';
import { useOverlay, useOverlayStore } from '@/components/overlay';
import { NoteEditorSheet } from '@/components/overlay/modals/NoteEditorSheet';

export const BibleNoteEditorHost: React.FC = () => {
  const overlay = useOverlay();
  const overlayType = useOverlayStore((state) => state.type);
  const noteEditor = useBibleUIStore((state) => state.noteEditor);
  const closeNoteEditor = useBibleUIStore((state) => state.closeNoteEditor);
  const hasOpenedRef = useRef(false);

  // Memoize the onSave callback to include it in deps
  const onSaveRef = useRef(noteEditor.onSave);
  onSaveRef.current = noteEditor.onSave;

  useEffect(() => {
    // When noteEditor.isOpen becomes true and we haven't opened yet
    if (noteEditor.isOpen && !hasOpenedRef.current) {
      hasOpenedRef.current = true;

      // Parse verse reference for NoteEditorSheet payload
      // Format: "Book Chapter:Verse" -> { book, chapter, verse }
      const match = noteEditor.verseReference.match(/^(.+)\s+(\d+):(\d+)$/);
      const book = match?.[1] || noteEditor.verseReference;
      const chapter = match?.[2] || '1';
      const verse = match?.[3] || '1';

      console.log('📝 BibleNoteEditorHost: Opening overlay with', { book, chapter, verse });

      overlay.showBottomSheet(
        (props) => <NoteEditorSheet {...props} />,
        {
          book,
          chapter,
          verse,
          existingNote: noteEditor.initialNote,
          onSave: (note: string) => {
            console.log('📝 BibleNoteEditorHost: Saving note', note);
            // Call the original onSave callback
            if (onSaveRef.current) {
              onSaveRef.current(note);
            }
            // Close the store state
            closeNoteEditor();
          },
        }
      );
    }

    // Reset flag when noteEditor closes
    if (!noteEditor.isOpen) {
      hasOpenedRef.current = false;
    }
  }, [noteEditor.isOpen, noteEditor.verseReference, noteEditor.initialNote, overlay, closeNoteEditor]);

  // Close store when overlay is dismissed (backdrop tap or close button)
  useEffect(() => {
    // When overlay closes (type becomes null) and noteEditor is still open in store
    if (!overlayType && noteEditor.isOpen && hasOpenedRef.current) {
      console.log('📝 BibleNoteEditorHost: Overlay dismissed, closing store');
      closeNoteEditor();
      hasOpenedRef.current = false;
    }
  }, [overlayType, noteEditor.isOpen, closeNoteEditor]);

  // This component renders nothing - it just bridges state
  return null;
};

export default BibleNoteEditorHost;
