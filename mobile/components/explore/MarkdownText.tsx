/**
 * MarkdownText Component
 *
 * Renders markdown text with support for:
 * - **bold** text
 * - *italic* text
 * - # Headings (h1-h4)
 * - Paragraph breaks (double newlines)
 * - Line breaks (single newlines)
 * - - Bullet lists
 * - "quoted text" emphasis
 */

import React, { memo, useMemo } from 'react';
import { Text, View, TextStyle, ViewStyle } from 'react-native';
import { ExploreColors, ExploreTypography, ExploreSpacing } from '@/constants/explore/designSystem';

export interface MarkdownTextProps {
  children: string | null | undefined;
  style?: TextStyle;
  containerStyle?: ViewStyle;
  /** NativeWind className - applied to outer View container. For text styling, use style prop. */
  className?: string;
}

export const MarkdownText = memo(function MarkdownText({ children, style, containerStyle, className }: MarkdownTextProps) {
  // Memoize parsed paragraphs to avoid expensive regex on every render
  const paragraphs = useMemo(() => {
    if (!children || typeof children !== 'string') return null;
    return children.split(/\n\n+/);
  }, [children]);

  // Handle null, undefined, or non-string children
  if (!paragraphs) return null;

  return (
    <View style={containerStyle} className={className}>
      {paragraphs.map((paragraph, pIndex) => {
        const trimmedParagraph = paragraph.trim();
        if (!trimmedParagraph) return null;

        // Check for headings
        const h1Match = trimmedParagraph.match(/^# (.+)$/);
        const h2Match = trimmedParagraph.match(/^## (.+)$/);
        const h3Match = trimmedParagraph.match(/^### (.+)$/);
        const h4Match = trimmedParagraph.match(/^#### (.+)$/);

        if (h1Match) {
          return (
            <Text
              key={pIndex}
              style={[
                {
                  ...ExploreTypography.h1,
                  color: ExploreColors.neutral[900],
                  marginBottom: ExploreSpacing.md,
                  marginTop: ExploreSpacing.lg,
                },
                style,
              ]}
            >
              {renderInlineMarkdown(h1Match[1])}
            </Text>
          );
        }
        if (h2Match) {
          return (
            <Text
              key={pIndex}
              style={[
                {
                  ...ExploreTypography.h2,
                  color: ExploreColors.neutral[900],
                  marginBottom: ExploreSpacing.md,
                  marginTop: ExploreSpacing.lg,
                },
                style,
              ]}
            >
              {renderInlineMarkdown(h2Match[1])}
            </Text>
          );
        }
        if (h3Match) {
          return (
            <Text
              key={pIndex}
              style={[
                {
                  ...ExploreTypography.h3,
                  color: ExploreColors.neutral[900],
                  marginBottom: ExploreSpacing.sm,
                  marginTop: ExploreSpacing.md,
                },
                style,
              ]}
            >
              {renderInlineMarkdown(h3Match[1])}
            </Text>
          );
        }
        if (h4Match) {
          return (
            <Text
              key={pIndex}
              style={[
                {
                  ...ExploreTypography.h4,
                  color: ExploreColors.neutral[900],
                  marginBottom: ExploreSpacing.sm,
                  marginTop: ExploreSpacing.md,
                },
                style,
              ]}
            >
              {renderInlineMarkdown(h4Match[1])}
            </Text>
          );
        }

        // Check for bullet list items
        const lines = trimmedParagraph.split('\n');
        const isBulletList = lines.every(line =>
          line.trim().startsWith('- ') ||
          line.trim().startsWith('• ') ||
          line.trim() === ''
        );

        if (isBulletList && lines.some(line => line.trim().startsWith('- ') || line.trim().startsWith('• '))) {
          return (
            <View key={pIndex} style={{ marginBottom: ExploreSpacing.md }}>
              {lines.map((line, lIndex) => {
                const trimmedLine = line.trim();
                if (!trimmedLine) return null;
                const bulletText = trimmedLine.replace(/^[-•]\s*/, '');
                return (
                  <View
                    key={lIndex}
                    className="flex-row items-start"
                    style={{ marginBottom: ExploreSpacing.xs }}
                  >
                    <Text
                      style={{
                        ...ExploreTypography.body,
                        color: ExploreColors.primary[500],
                        marginRight: ExploreSpacing.sm,
                        lineHeight: 28,
                      }}
                    >
                      •
                    </Text>
                    <Text
                      className="flex-1"
                      style={[
                        {
                          ...ExploreTypography.body,
                          color: ExploreColors.neutral[800],
                          lineHeight: 28,
                        },
                        style,
                      ]}
                    >
                      {renderInlineMarkdown(bulletText)}
                    </Text>
                  </View>
                );
              })}
            </View>
          );
        }

        // Regular paragraph with line breaks
        const linesWithBreaks = trimmedParagraph.split('\n');

        return (
          <Text
            key={pIndex}
            style={[
              {
                ...ExploreTypography.body,
                color: ExploreColors.neutral[800],
                lineHeight: 28,
                marginBottom: ExploreSpacing.md,
              },
              style,
            ]}
          >
            {linesWithBreaks.map((line, lIndex) => (
              <React.Fragment key={lIndex}>
                {renderInlineMarkdown(line)}
                {lIndex < linesWithBreaks.length - 1 && '\n'}
              </React.Fragment>
            ))}
          </Text>
        );
      })}
    </View>
  );
});

MarkdownText.displayName = 'MarkdownText';

// Parse inline markdown: **bold**, *italic*, "quotes"
function renderInlineMarkdown(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let key = 0;

  // Pattern matches: **bold**, *italic*, "quoted text", or plain text
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|"[^"]+"|"[^"]+"|„[^"]+"|«[^»]+»)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Add plain text before the match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const matchedText = match[0];

    // Handle **bold**
    if (matchedText.startsWith('**') && matchedText.endsWith('**')) {
      const boldText = matchedText.slice(2, -2);
      parts.push(
        <Text key={key++} className="font-bold">
          {boldText}
        </Text>
      );
    }
    // Handle *italic*
    else if (matchedText.startsWith('*') && matchedText.endsWith('*')) {
      const italicText = matchedText.slice(1, -1);
      parts.push(
        <Text key={key++} className="italic">
          {italicText}
        </Text>
      );
    }
    // Handle "quoted text" (various quote styles)
    else if (
      (matchedText.startsWith('"') && matchedText.endsWith('"')) ||
      (matchedText.startsWith('"') && matchedText.endsWith('"')) ||
      (matchedText.startsWith('„') && matchedText.endsWith('"')) ||
      (matchedText.startsWith('«') && matchedText.endsWith('»'))
    ) {
      parts.push(
        <Text
          key={key++}
          className="italic"
          style={{ color: ExploreColors.neutral[700] }}
        >
          {matchedText}
        </Text>
      );
    }
    else {
      parts.push(matchedText);
    }

    lastIndex = match.index + matchedText.length;
  }

  // Add remaining plain text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

export default MarkdownText;
