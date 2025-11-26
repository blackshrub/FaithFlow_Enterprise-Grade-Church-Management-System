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

import React from 'react';
import { Text, View, TextStyle, StyleSheet, ViewStyle } from 'react-native';
import { ExploreColors, ExploreTypography, ExploreSpacing } from '@/constants/explore/designSystem';

interface MarkdownTextProps {
  children: string | null | undefined;
  style?: TextStyle;
  containerStyle?: ViewStyle;
}

export function MarkdownText({ children, style, containerStyle }: MarkdownTextProps) {
  // Handle null, undefined, or non-string children
  if (!children || typeof children !== 'string') return null;

  // Split content into paragraphs
  const paragraphs = children.split(/\n\n+/);

  return (
    <View style={containerStyle}>
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
            <Text key={pIndex} style={[styles.heading1, style]}>
              {renderInlineMarkdown(h1Match[1])}
            </Text>
          );
        }
        if (h2Match) {
          return (
            <Text key={pIndex} style={[styles.heading2, style]}>
              {renderInlineMarkdown(h2Match[1])}
            </Text>
          );
        }
        if (h3Match) {
          return (
            <Text key={pIndex} style={[styles.heading3, style]}>
              {renderInlineMarkdown(h3Match[1])}
            </Text>
          );
        }
        if (h4Match) {
          return (
            <Text key={pIndex} style={[styles.heading4, style]}>
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
            <View key={pIndex} style={styles.bulletList}>
              {lines.map((line, lIndex) => {
                const trimmedLine = line.trim();
                if (!trimmedLine) return null;
                const bulletText = trimmedLine.replace(/^[-•]\s*/, '');
                return (
                  <View key={lIndex} style={styles.bulletItem}>
                    <Text style={styles.bullet}>•</Text>
                    <Text style={[styles.bulletText, style]}>
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
          <Text key={pIndex} style={[styles.paragraph, style]}>
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
}

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
        <Text key={key++} style={styles.bold}>
          {boldText}
        </Text>
      );
    }
    // Handle *italic*
    else if (matchedText.startsWith('*') && matchedText.endsWith('*')) {
      const italicText = matchedText.slice(1, -1);
      parts.push(
        <Text key={key++} style={styles.italic}>
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
        <Text key={key++} style={styles.quoted}>
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

const styles = StyleSheet.create({
  paragraph: {
    ...ExploreTypography.body,
    color: ExploreColors.neutral[800],
    lineHeight: 28,
    marginBottom: ExploreSpacing.md,
  },
  heading1: {
    ...ExploreTypography.h1,
    color: ExploreColors.neutral[900],
    marginBottom: ExploreSpacing.md,
    marginTop: ExploreSpacing.lg,
  },
  heading2: {
    ...ExploreTypography.h2,
    color: ExploreColors.neutral[900],
    marginBottom: ExploreSpacing.md,
    marginTop: ExploreSpacing.lg,
  },
  heading3: {
    ...ExploreTypography.h3,
    color: ExploreColors.neutral[900],
    marginBottom: ExploreSpacing.sm,
    marginTop: ExploreSpacing.md,
  },
  heading4: {
    ...ExploreTypography.h4,
    color: ExploreColors.neutral[900],
    marginBottom: ExploreSpacing.sm,
    marginTop: ExploreSpacing.md,
  },
  bold: {
    fontWeight: '700',
  },
  italic: {
    fontStyle: 'italic',
  },
  quoted: {
    fontStyle: 'italic',
    color: ExploreColors.neutral[700],
  },
  bulletList: {
    marginBottom: ExploreSpacing.md,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: ExploreSpacing.xs,
  },
  bullet: {
    ...ExploreTypography.body,
    color: ExploreColors.primary[500],
    marginRight: ExploreSpacing.sm,
    lineHeight: 28,
  },
  bulletText: {
    ...ExploreTypography.body,
    color: ExploreColors.neutral[800],
    lineHeight: 28,
    flex: 1,
  },
});

export default MarkdownText;
