/**
 * WhatsAppText Component
 *
 * Renders text with WhatsApp-style formatting:
 * - *bold* → bold text
 * - _italic_ → italic text
 * - ~strikethrough~ → strikethrough text
 * - ```monospace``` → monospace text
 * - `code` → inline code
 * - URLs → clickable links with preview
 *
 * Styling: NativeWind-first for basic text formatting
 */

import React, { useMemo } from 'react';
import { Text, Linking, TextStyle } from 'react-native';
import { colors } from '@/constants/theme';

// =============================================================================
// TYPES
// =============================================================================

interface WhatsAppTextProps {
  children: string;
  style?: TextStyle;
  selectable?: boolean;
  onLinkPress?: (url: string) => void;
}

interface TextPart {
  type: 'text' | 'bold' | 'italic' | 'strikethrough' | 'monospace' | 'code' | 'link';
  content: string;
  url?: string;
}

// =============================================================================
// URL REGEX
// =============================================================================

const URL_REGEX = /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)/gi;

// =============================================================================
// PARSER
// =============================================================================

function parseWhatsAppText(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let remaining = text;

  // First, extract all URLs and replace with placeholders
  const urls: { placeholder: string; url: string }[] = [];
  let urlIndex = 0;

  remaining = remaining.replace(URL_REGEX, (match) => {
    const placeholder = `__URL_PLACEHOLDER_${urlIndex}__`;
    urls.push({ placeholder, url: match });
    urlIndex++;
    return placeholder;
  });

  // Parse WhatsApp formatting patterns
  // Order matters: triple backticks before single, bold before italic
  const patterns = [
    { regex: /```([^`]+)```/g, type: 'monospace' as const },
    { regex: /`([^`]+)`/g, type: 'code' as const },
    { regex: /\*([^*]+)\*/g, type: 'bold' as const },
    { regex: /_([^_]+)_/g, type: 'italic' as const },
    { regex: /~([^~]+)~/g, type: 'strikethrough' as const },
  ];

  // Process each pattern
  let processed = remaining;
  const replacements: { start: number; end: number; part: TextPart }[] = [];

  for (const { regex, type } of patterns) {
    let match;
    const regexCopy = new RegExp(regex.source, regex.flags);

    while ((match = regexCopy.exec(remaining)) !== null) {
      // Check if this range is already processed
      const start = match.index;
      const end = start + match[0].length;

      const overlaps = replacements.some(
        (r) => (start >= r.start && start < r.end) || (end > r.start && end <= r.end)
      );

      if (!overlaps) {
        replacements.push({
          start,
          end,
          part: { type, content: match[1] },
        });
      }
    }
  }

  // Sort replacements by position
  replacements.sort((a, b) => a.start - b.start);

  // Build parts array
  let lastIndex = 0;
  for (const { start, end, part } of replacements) {
    // Add text before this replacement
    if (start > lastIndex) {
      const textBefore = remaining.slice(lastIndex, start);
      if (textBefore) {
        parts.push({ type: 'text', content: textBefore });
      }
    }
    parts.push(part);
    lastIndex = end;
  }

  // Add remaining text
  if (lastIndex < remaining.length) {
    parts.push({ type: 'text', content: remaining.slice(lastIndex) });
  }

  // Restore URLs in all parts
  const finalParts: TextPart[] = [];
  for (const part of parts) {
    let content = part.content;
    let hasUrl = false;

    for (const { placeholder, url } of urls) {
      if (content.includes(placeholder)) {
        hasUrl = true;
        // Split by placeholder
        const segments = content.split(placeholder);
        for (let i = 0; i < segments.length; i++) {
          if (segments[i]) {
            finalParts.push({ ...part, content: segments[i] });
          }
          if (i < segments.length - 1) {
            finalParts.push({ type: 'link', content: url, url });
          }
        }
        break;
      }
    }

    if (!hasUrl) {
      finalParts.push(part);
    }
  }

  return finalParts.length > 0 ? finalParts : [{ type: 'text', content: text }];
}

// =============================================================================
// COMPONENT
// =============================================================================

export function WhatsAppText({
  children,
  style,
  selectable = true,
  onLinkPress,
}: WhatsAppTextProps) {
  const parts = useMemo(() => parseWhatsAppText(children), [children]);

  const handleLinkPress = (url: string) => {
    if (onLinkPress) {
      onLinkPress(url);
    } else {
      Linking.openURL(url).catch(() => {
        // Silently fail if URL can't be opened
      });
    }
  };

  return (
    <Text
      className="text-base leading-[22px]"
      style={[{ color: colors.gray[900] }, style]}
      selectable={selectable}
    >
      {parts.map((part, index) => {
        switch (part.type) {
          case 'bold':
            return (
              <Text key={index} className="font-bold">
                {part.content}
              </Text>
            );
          case 'italic':
            return (
              <Text key={index} className="italic">
                {part.content}
              </Text>
            );
          case 'strikethrough':
            return (
              <Text key={index} className="line-through">
                {part.content}
              </Text>
            );
          case 'monospace':
          case 'code':
            return (
              <Text
                key={index}
                className="text-sm px-1 rounded"
                style={{ fontFamily: 'monospace', backgroundColor: 'rgba(0,0,0,0.05)' }}
              >
                {part.content}
              </Text>
            );
          case 'link':
            return (
              <Text
                key={index}
                className="underline"
                style={{ color: '#0066CC' }}
                onPress={() => handleLinkPress(part.url!)}
              >
                {part.content}
              </Text>
            );
          default:
            return <Text key={index}>{part.content}</Text>;
        }
      })}
    </Text>
  );
}

export default WhatsAppText;
