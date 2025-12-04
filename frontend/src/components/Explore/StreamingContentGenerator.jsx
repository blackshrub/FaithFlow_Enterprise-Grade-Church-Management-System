/**
 * StreamingContentGenerator Component
 *
 * Real-time AI content generation with SSE streaming.
 * Shows content as it's being generated (ChatGPT-like UX).
 *
 * Features:
 * - Real-time streaming display
 * - JSON parsing with live preview
 * - Abort/cancel generation
 * - Error handling
 * - Progress indication
 * - Integrated coherent image generation
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import {
  Loader2, Sparkles, StopCircle, Check, X, Edit, RefreshCw,
  AlertCircle, CheckCircle2, Image as ImageIcon, Download
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';

const API_BASE = import.meta.env.VITE_API_URL || '';

/**
 * States: idle | connecting | streaming | complete | generating_image | image_complete | error
 */
const StreamState = {
  IDLE: 'idle',
  CONNECTING: 'connecting',
  STREAMING: 'streaming',
  COMPLETE: 'complete',
  GENERATING_IMAGE: 'generating_image',
  IMAGE_COMPLETE: 'image_complete',
  ERROR: 'error',
};

/**
 * StreamingContentGenerator - Main component for streaming AI generation with image support
 */
export function StreamingContentGenerator({
  contentType,
  model = 'claude-sonnet-4-5-20250929',
  customPrompt = '',
  generateBothLanguages = true,
  topic = '',
  scriptureReference = '',
  figureName = '',
  quizDifficulty = 'medium',
  numQuestions = 5,
  studyDuration = 7,
  // Image generation options
  enableImageGeneration = false,
  imageStyle = 'spiritual_art',
  imageWidth = 1024,
  imageHeight = 1024,
  onComplete,
  onAccept,
  onEdit,
  onReject,
  className,
}) {
  const { t } = useTranslation();
  const { token } = useAuth();

  const [streamState, setStreamState] = useState(StreamState.IDLE);
  const [rawContent, setRawContent] = useState('');
  const [parsedContent, setParsedContent] = useState(null);
  const [error, setError] = useState(null);
  const [chunkCount, setChunkCount] = useState(0);
  const [startTime, setStartTime] = useState(null);

  // Image generation state
  const [generateImage, setGenerateImage] = useState(enableImageGeneration);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [imageError, setImageError] = useState(null);
  const [imagePromptUsed, setImagePromptUsed] = useState(null);
  const [extractedThemes, setExtractedThemes] = useState([]);

  const abortControllerRef = useRef(null);
  const contentRef = useRef(null);

  // Auto-scroll to bottom during streaming
  useEffect(() => {
    if (contentRef.current && streamState === StreamState.STREAMING) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [rawContent, streamState]);

  /**
   * Start streaming generation
   */
  const startGeneration = useCallback(async () => {
    // Reset state
    setRawContent('');
    setParsedContent(null);
    setError(null);
    setChunkCount(0);
    setStreamState(StreamState.CONNECTING);
    setStartTime(Date.now());
    setGeneratedImage(null);
    setImageError(null);
    setImagePromptUsed(null);
    setExtractedThemes([]);

    // Create abort controller
    abortControllerRef.current = new AbortController();

    // Map frontend content type to backend API type
    const apiContentType = {
      devotion: 'daily_devotion',
      verse: 'verse_of_the_day',
      figure: 'bible_figure',
      quiz: 'daily_quiz',
      bible_study: 'bible_study',
      devotion_plan: 'devotion_plan',
      topical_category: 'topical_category',
      topical_verse: 'topical_verse',
    }[contentType] || contentType;

    try {
      const response = await fetch(`${API_BASE}/api/ai/stream/explore/${apiContentType}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          content_type: apiContentType,
          model,
          custom_prompt: customPrompt || undefined,
          generate_both_languages: generateBothLanguages,
          topic: topic || undefined,
          scripture_reference: scriptureReference || undefined,
          figure_name: figureName || undefined,
          quiz_difficulty: quizDifficulty,
          num_questions: numQuestions,
          study_duration: studyDuration,
          // Image generation options
          generate_image: generateImage,
          image_style: imageStyle,
          image_width: imageWidth,
          image_height: imageHeight,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      setStreamState(StreamState.STREAMING);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';
      let currentParsedContent = null;

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();

          if (line.startsWith('event:')) {
            const eventType = line.slice(6).trim();

            // Get data from next line
            if (i + 1 < lines.length && lines[i + 1].startsWith('data:')) {
              const dataLine = lines[i + 1];
              const jsonStr = dataLine.slice(5).trim();

              try {
                const data = JSON.parse(jsonStr);

                if (eventType === 'chunk' && data.content) {
                  fullContent += data.content;
                  setRawContent(fullContent);
                  setChunkCount((prev) => prev + 1);

                  // Try to parse JSON as we go
                  try {
                    const parsed = JSON.parse(fullContent);
                    setParsedContent(parsed);
                    currentParsedContent = parsed;
                  } catch {
                    // Not valid JSON yet, keep streaming
                  }
                } else if (eventType === 'complete') {
                  if (data.content) {
                    setParsedContent(data.content);
                    currentParsedContent = data.content;
                  }
                  // If generating image, wait for it; otherwise mark complete
                  if (!generateImage) {
                    setStreamState(StreamState.COMPLETE);
                    onComplete?.(data.content || currentParsedContent);
                  }
                } else if (eventType === 'image_start') {
                  setStreamState(StreamState.GENERATING_IMAGE);
                } else if (eventType === 'image_complete') {
                  setGeneratedImage(data.image_base64);
                  setImagePromptUsed(data.prompt_used);
                  setExtractedThemes(data.extracted_themes || []);
                  setStreamState(StreamState.IMAGE_COMPLETE);
                  onComplete?.({
                    content: currentParsedContent,
                    image: data.image_base64,
                    imagePrompt: data.prompt_used,
                  });
                } else if (eventType === 'image_error') {
                  setImageError(data.error);
                  setStreamState(StreamState.COMPLETE); // Fall back to text-only
                  onComplete?.(currentParsedContent);
                } else if (eventType === 'error') {
                  throw new Error(data.error || 'Generation failed');
                }
              } catch (parseError) {
                if (parseError.message && !parseError.message.includes('JSON')) {
                  throw parseError;
                }
              }

              i++; // Skip data line
            }
          }
        }
      }

      // If we exited without complete event, mark as complete
      if (streamState !== StreamState.COMPLETE && streamState !== StreamState.IMAGE_COMPLETE) {
        setStreamState(StreamState.COMPLETE);
        // Try final parse
        try {
          const finalParsed = JSON.parse(fullContent);
          setParsedContent(finalParsed);
          onComplete?.(finalParsed);
        } catch {
          onComplete?.(null);
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        setStreamState(StreamState.IDLE);
        return;
      }
      setError(err.message || 'Generation failed');
      setStreamState(StreamState.ERROR);
    } finally {
      abortControllerRef.current = null;
    }
  }, [
    token, contentType, model, customPrompt, generateBothLanguages,
    topic, scriptureReference, figureName, quizDifficulty, numQuestions,
    studyDuration, generateImage, imageStyle, imageWidth, imageHeight, onComplete,
  ]);

  /**
   * Abort current generation
   */
  const abortGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setStreamState(StreamState.IDLE);
    }
  }, []);

  /**
   * Handle accept action
   */
  const handleAccept = useCallback(() => {
    if (parsedContent) {
      onAccept?.({
        content: parsedContent,
        image: generatedImage,
        imagePrompt: imagePromptUsed,
      });
    }
  }, [parsedContent, generatedImage, imagePromptUsed, onAccept]);

  /**
   * Handle edit action
   */
  const handleEdit = useCallback(() => {
    if (parsedContent) {
      onEdit?.({
        content: parsedContent,
        image: generatedImage,
      });
    }
  }, [parsedContent, generatedImage, onEdit]);

  /**
   * Handle reject action
   */
  const handleReject = useCallback(() => {
    setRawContent('');
    setParsedContent(null);
    setGeneratedImage(null);
    setStreamState(StreamState.IDLE);
    onReject?.();
  }, [onReject]);

  /**
   * Download generated image
   */
  const downloadImage = useCallback(() => {
    if (generatedImage) {
      const link = document.createElement('a');
      link.href = `data:image/png;base64,${generatedImage}`;
      link.download = `${contentType}-${Date.now()}.png`;
      link.click();
    }
  }, [generatedImage, contentType]);

  /**
   * Calculate elapsed time
   */
  const elapsedTime = startTime ? Math.round((Date.now() - startTime) / 1000) : 0;

  const isComplete = streamState === StreamState.COMPLETE || streamState === StreamState.IMAGE_COMPLETE;

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            AI Content Generator
          </CardTitle>
          <StreamStateBadge state={streamState} />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Image generation toggle (only show when idle) */}
        {streamState === StreamState.IDLE && (
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-gray-600" />
              <Label htmlFor="generate-image" className="text-sm font-medium">
                Generate Coherent Image
              </Label>
            </div>
            <Switch
              id="generate-image"
              checked={generateImage}
              onCheckedChange={setGenerateImage}
            />
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {streamState === StreamState.IDLE && (
            <Button
              onClick={startGeneration}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {generateImage ? 'Generate Content & Image' : 'Generate Content'}
            </Button>
          )}

          {(streamState === StreamState.CONNECTING ||
            streamState === StreamState.STREAMING ||
            streamState === StreamState.GENERATING_IMAGE) && (
            <Button
              variant="destructive"
              onClick={abortGeneration}
            >
              <StopCircle className="h-4 w-4 mr-2" />
              Stop Generation
            </Button>
          )}

          {streamState === StreamState.ERROR && (
            <Button
              onClick={startGeneration}
              variant="outline"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          )}

          {isComplete && (
            <>
              <Button
                onClick={handleAccept}
                className="bg-green-600 hover:bg-green-700"
              >
                <Check className="h-4 w-4 mr-2" />
                Accept & Publish
              </Button>
              <Button
                variant="outline"
                onClick={handleEdit}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit First
              </Button>
              <Button
                variant="outline"
                onClick={startGeneration}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Regenerate
              </Button>
              <Button
                variant="ghost"
                onClick={handleReject}
              >
                <X className="h-4 w-4 mr-1 text-red-600" />
              </Button>
            </>
          )}
        </div>

        {/* Progress indicator */}
        {(streamState === StreamState.CONNECTING || streamState === StreamState.STREAMING) && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {streamState === StreamState.CONNECTING ? 'Connecting...' : 'Generating text...'}
              </span>
              <span>{chunkCount} chunks • {elapsedTime}s</span>
            </div>
            <Progress value={undefined} className="h-1" />
          </div>
        )}

        {/* Image generation progress */}
        {streamState === StreamState.GENERATING_IMAGE && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-purple-600">
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating coherent image...
              </span>
              <span className="text-gray-500">{elapsedTime}s</span>
            </div>
            <Progress value={undefined} className="h-1 bg-purple-100" />
            <p className="text-xs text-gray-500">
              Building image from content: {extractedThemes.slice(0, 3).join(', ')}...
            </p>
          </div>
        )}

        {/* Error display */}
        {streamState === StreamState.ERROR && error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Generation Failed</p>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
        )}

        {/* Image error (non-fatal) */}
        {imageError && (
          <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-800">Image Generation Failed</p>
              <p className="text-sm text-yellow-600">{imageError}</p>
              <p className="text-xs text-gray-500 mt-1">Text content was generated successfully.</p>
            </div>
          </div>
        )}

        {/* Streaming content display */}
        {(streamState === StreamState.STREAMING || isComplete || streamState === StreamState.GENERATING_IMAGE) && (
          <div
            ref={contentRef}
            className="max-h-96 overflow-y-auto border rounded-lg p-4 bg-gray-50 font-mono text-sm"
          >
            {rawContent ? (
              <pre className="whitespace-pre-wrap break-words">{rawContent}</pre>
            ) : (
              <span className="text-gray-400">Waiting for content...</span>
            )}
          </div>
        )}

        {/* Generated image display */}
        {generatedImage && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-purple-600" />
                Generated Image
              </h4>
              <Button variant="outline" size="sm" onClick={downloadImage}>
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
            </div>
            <div className="relative rounded-lg overflow-hidden border bg-gray-100">
              <img
                src={`data:image/png;base64,${generatedImage}`}
                alt="AI Generated"
                className="w-full h-auto max-h-96 object-contain"
              />
            </div>
            {imagePromptUsed && (
              <details className="text-xs text-gray-500">
                <summary className="cursor-pointer hover:text-gray-700">
                  View image prompt used
                </summary>
                <p className="mt-2 p-2 bg-gray-50 rounded border">{imagePromptUsed}</p>
              </details>
            )}
            {extractedThemes.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {extractedThemes.map((theme, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {theme}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Parsed content preview */}
        {isComplete && parsedContent && (
          <ContentPreview content={parsedContent} contentType={contentType} />
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Stream state badge component
 */
function StreamStateBadge({ state }) {
  const config = {
    [StreamState.IDLE]: { label: 'Ready', className: 'bg-gray-500' },
    [StreamState.CONNECTING]: { label: 'Connecting', className: 'bg-blue-500' },
    [StreamState.STREAMING]: { label: 'Streaming', className: 'bg-purple-500 animate-pulse' },
    [StreamState.COMPLETE]: { label: 'Complete', className: 'bg-green-500' },
    [StreamState.GENERATING_IMAGE]: { label: 'Generating Image', className: 'bg-indigo-500 animate-pulse' },
    [StreamState.IMAGE_COMPLETE]: { label: 'Complete', className: 'bg-green-500' },
    [StreamState.ERROR]: { label: 'Error', className: 'bg-red-500' },
  };

  const { label, className } = config[state] || config[StreamState.IDLE];

  return (
    <Badge className={cn('text-white', className)}>
      {(state === StreamState.STREAMING || state === StreamState.GENERATING_IMAGE) && (
        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
      )}
      {(state === StreamState.COMPLETE || state === StreamState.IMAGE_COMPLETE) && (
        <CheckCircle2 className="h-3 w-3 mr-1" />
      )}
      {label}
    </Badge>
  );
}

/**
 * Content preview component - renders parsed JSON nicely
 */
function ContentPreview({ content, contentType }) {
  if (!content) return null;

  return (
    <div className="border rounded-lg p-4 bg-white space-y-3">
      <h4 className="font-semibold text-gray-900 flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        Generated Content Preview
      </h4>

      {/* Title */}
      {content.title && (
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase">Title</label>
          <p className="text-lg font-semibold text-gray-900">
            {content.title?.en || content.title}
          </p>
        </div>
      )}

      {/* Name (for Bible figures) */}
      {content.name && (
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase">Name</label>
          <p className="text-lg font-semibold text-gray-900">
            {content.name?.en || content.name}
          </p>
        </div>
      )}

      {/* Bible Reference */}
      {content.bible_reference && (
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase">Scripture</label>
          <p className="text-gray-700">{content.bible_reference}</p>
        </div>
      )}

      {/* Content/Description */}
      {(content.content || content.description || content.summary) && (
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase">Content</label>
          <p className="text-gray-700 line-clamp-4">
            {(content.content?.en || content.description?.en || content.summary?.en || content.content || content.description || content.summary)}
          </p>
        </div>
      )}

      {/* Questions count (for quizzes) */}
      {content.questions && (
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase">Questions</label>
          <p className="text-gray-700">{content.questions.length} questions generated</p>
        </div>
      )}

      {/* Lessons count (for Bible studies) */}
      {content.lessons && (
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase">Lessons</label>
          <p className="text-gray-700">{content.lessons.length} lessons generated</p>
        </div>
      )}

      {/* Days count (for devotion plans) */}
      {content.days && (
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase">Days</label>
          <p className="text-gray-700">{content.days.length} days generated</p>
        </div>
      )}
    </div>
  );
}

export default StreamingContentGenerator;
