import React, { memo, useMemo } from 'react';
import { Text, View, type StyleProp, type TextStyle } from 'react-native';

import { useThemedStyles } from '@shared/hooks';
import { fontFamilies, fontSizes, type AppTheme } from '@shared/theme';
import {
  parseChatMarkdown,
  type ChatMarkdownSpan,
} from '../utils/chatMarkdown';

interface ChatMarkdownTextProps {
  text: string;
  style?: StyleProp<TextStyle>;
}

const renderSpans = (
  spans: readonly ChatMarkdownSpan[],
  styles: ReturnType<typeof createStyles>,
  keyPrefix: string,
): React.ReactNode[] =>
  spans.map((span, index) => (
    <Text
      key={`${keyPrefix}:${index}`}
      style={[
        span.bold ? styles.bold : null,
        span.italic ? styles.italic : null,
        span.code ? styles.code : null,
      ]}
    >
      {span.text}
    </Text>
  ));

function ChatMarkdownTextComponent({
  text,
  style,
}: ChatMarkdownTextProps): React.JSX.Element {
  const styles = useThemedStyles(createStyles);
  const blocks = useMemo(() => parseChatMarkdown(text), [text]);

  return (
    <View>
      {blocks.map((block, blockIndex) => {
        if (block.type === 'heading') {
          return (
            <Text
              key={`h:${blockIndex}`}
              style={[
                style,
                styles.heading,
                block.level === 1 ? styles.heading1 : null,
                block.level === 3 ? styles.heading3 : null,
              ]}
            >
              {renderSpans(block.spans, styles, `h${blockIndex}`)}
            </Text>
          );
        }

        if (block.type === 'list') {
          return (
            <View key={`l:${blockIndex}`} style={styles.list}>
              {block.items.map((item, itemIndex) => (
                <View key={`l:${blockIndex}:${itemIndex}`} style={styles.listRow}>
                  <Text style={[style, styles.bullet]}>
                    {block.ordered ? `${itemIndex + 1}.` : '•'}
                  </Text>
                  <Text style={[style, styles.listText]}>
                    {renderSpans(item, styles, `l${blockIndex}.${itemIndex}`)}
                  </Text>
                </View>
              ))}
            </View>
          );
        }

        return (
          <Text
            key={`p:${blockIndex}`}
            style={[style, blockIndex < blocks.length - 1 ? styles.paragraph : null]}
          >
            {renderSpans(block.spans, styles, `p${blockIndex}`)}
          </Text>
        );
      })}
    </View>
  );
}

export const ChatMarkdownText = memo(ChatMarkdownTextComponent);

const createStyles = (theme: AppTheme) => ({
  paragraph: {
    marginBottom: 6,
  },
  heading: {
    fontFamily: fontFamilies.semiBold,
    marginBottom: 6,
  },
  heading1: {
    fontSize: fontSizes.lg,
    lineHeight: fontSizes.lg * 1.4,
  },
  heading3: {
    fontSize: fontSizes.md,
  },
  list: {
    gap: 4,
    marginTop: 2,
    marginBottom: 6,
  },
  listRow: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: 8,
  },
  bullet: {
    minWidth: 16,
    fontFamily: fontFamilies.semiBold,
  },
  listText: {
    flex: 1,
    minWidth: 0,
  },
  bold: {
    fontFamily: fontFamilies.bold,
  },
  italic: {
    fontStyle: 'italic' as const,
  },
  code: {
    fontFamily: fontFamilies.medium,
    color: theme.colors.primary,
  },
});
