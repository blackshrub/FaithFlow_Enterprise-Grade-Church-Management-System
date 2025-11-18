import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, BookOpen, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useBibleVersions, useBibleBooks } from '@/hooks/useDevotions';
import { useMutation } from '@tanstack/react-query';
import { bibleAPI } from '@/services/api';
import { toast } from 'sonner';

function VersePicker({ verses, onVersesChange }) {
  const { t } = useTranslation();
  const { data: versions = [] } = useBibleVersions();
  const { data: books = [] } = useBibleBooks();

  const [newVerse, setNewVerse] = useState({
    bible_version: 'TB',
    book: '',
    chapter: '',
    start_verse: '',
    end_verse: '',
  });

  const [fetchedText, setFetchedText] = useState('');

  // Get book name field based on Bible version
  const getBookNameForVersion = (book, version) => {
    const versionCode = version.toUpperCase();
    if (versionCode === 'TB') {
      return book.name_local || book.name; // Indonesian
    } else if (versionCode === 'CHS') {
      return book.name_zh || book.name; // Chinese
    } else {
      return book.name; // English (NIV, NKJV, NLT, ESV)
    }
  };

  const fetchVerseMutation = useMutation({
    mutationFn: async () => {
      const response = await bibleAPI.getVerse(
        newVerse.bible_version,
        newVerse.book,
        parseInt(newVerse.chapter),
        parseInt(newVerse.start_verse),
        newVerse.end_verse ? parseInt(newVerse.end_verse) : null
      );
      return response.data;
    },
    onSuccess: (data) => {
      setFetchedText(data.text || data.verses?.map(v => v.text).join(' ') || '');
      toast.success(t('devotions.form.verseFetched'));
    },
    onError: () => {
      toast.error(t('devotions.form.verseFetchError'));
    },
  });

  const handleFetchVerse = () => {
    if (!newVerse.book || !newVerse.chapter || !newVerse.start_verse) {
      toast.error('Please fill in all required fields');
      return;
    }
    fetchVerseMutation.mutate();
  };

  const handleAddVerse = () => {
    if (!fetchedText) {
      toast.error('Please fetch the verse first');
      return;
    }

    const verseToAdd = {
      book: newVerse.book,
      chapter: parseInt(newVerse.chapter),
      start_verse: parseInt(newVerse.start_verse),
      end_verse: newVerse.end_verse ? parseInt(newVerse.end_verse) : null,
      bible_version: newVerse.bible_version,
      verse_text: fetchedText,
    };

    onVersesChange([...verses, verseToAdd]);
    
    // Reset form
    setNewVerse({
      ...newVerse,
      book: '',
      chapter: '',
      start_verse: '',
      end_verse: '',
    });
    setFetchedText('');
    
    toast.success(t('devotions.versePicker.verseAdded'));
  };

  const removeVerse = (index) => {
    onVersesChange(verses.filter((_, i) => i !== index));
  };

  const getVerseReference = (verse) => {
    if (verse.end_verse && verse.end_verse !== verse.start_verse) {
      return t('devotions.versePicker.verseRange', {
        book: verse.book,
        chapter: verse.chapter,
        start: verse.start_verse,
        end: verse.end_verse
      });
    }
    return t('devotions.versePicker.singleVerse', {
      book: verse.book,
      chapter: verse.chapter,
      verse: verse.start_verse
    });
  };

  return (
    <div className="space-y-4">
      {/* Added Verses List */}
      {verses.length > 0 && (
        <div className="space-y-2">
          {verses.map((verse, index) => (
            <div
              key={index}
              className="bg-gray-50 border border-gray-200 rounded-lg p-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-medium text-gray-900 text-sm">
                    {getVerseReference(verse)} ({verse.bible_version})
                  </p>
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                    {verse.verse_text}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeVerse(index)}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {verses.length === 0 && (
        <p className="text-center text-gray-500 text-sm py-4">
          {t('devotions.form.noVerses')}
        </p>
      )}

      {/* Add New Verse Form */}
      <div className="border-t border-gray-200 pt-4 space-y-4">
        <h4 className="font-medium text-gray-900">{t('devotions.versePicker.title')}</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Bible Version */}
          <div className="space-y-2">
            <Label>{t('devotions.versePicker.selectVersion')}</Label>
            <select
              value={newVerse.bible_version}
              onChange={(e) => setNewVerse({ ...newVerse, bible_version: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              {versions.map((v) => (
                <option key={v.code} value={v.code}>
                  {t(`devotions.bible.version${v.code}`)}
                </option>
              ))}
            </select>
          </div>

          {/* Book */}
          <div className="space-y-2">
            <Label>{t('devotions.versePicker.selectBook')}</Label>
            <select
              value={newVerse.book}
              onChange={(e) => setNewVerse({ ...newVerse, book: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">{t('devotions.versePicker.selectBook')}</option>
              {books.map((book) => (
                <option key={book.book_number} value={getBookNameForVersion(book, newVerse.bible_version)}>
                  {getBookNameForVersion(book, newVerse.bible_version)}
                </option>
              ))}
            </select>
          </div>

          {/* Chapter */}
          <div className="space-y-2">
            <Label>{t('devotions.versePicker.selectChapter')}</Label>
            <Input
              type="number"
              min="1"
              value={newVerse.chapter}
              onChange={(e) => setNewVerse({ ...newVerse, chapter: e.target.value })}
              placeholder="1"
            />
          </div>

          {/* Start Verse */}
          <div className="space-y-2">
            <Label>{t('devotions.versePicker.selectStartVerse')}</Label>
            <Input
              type="number"
              min="1"
              value={newVerse.start_verse}
              onChange={(e) => setNewVerse({ ...newVerse, start_verse: e.target.value })}
              placeholder="1"
            />
          </div>

          {/* End Verse */}
          <div className="space-y-2 md:col-span-2">
            <Label>{t('devotions.versePicker.selectEndVerse')}</Label>
            <Input
              type="number"
              min="1"
              value={newVerse.end_verse}
              onChange={(e) => setNewVerse({ ...newVerse, end_verse: e.target.value })}
              placeholder={t('devotions.versePicker.selectEndVerse')}
            />
          </div>
        </div>

        {/* Fetch Button */}
        <Button
          type="button"
          onClick={handleFetchVerse}
          disabled={fetchVerseMutation.isPending || !newVerse.book || !newVerse.chapter || !newVerse.start_verse}
          className="w-full"
          variant="outline"
        >
          {fetchVerseMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {t('devotions.versePicker.fetchingVerse')}
            </>
          ) : (
            <>
              <BookOpen className="h-4 w-4 mr-2" />
              {t('devotions.form.fetchVerse')}
            </>
          )}
        </Button>

        {/* Verse Preview */}
        {fetchedText && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h5 className="font-medium text-gray-900 mb-2">{t('devotions.form.versePreview')}</h5>
            <p className="text-sm text-gray-700 italic">"{fetchedText}"</p>
            <Button
              type="button"
              onClick={handleAddVerse}
              className="mt-3 w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('devotions.versePicker.addToList')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default VersePicker;
