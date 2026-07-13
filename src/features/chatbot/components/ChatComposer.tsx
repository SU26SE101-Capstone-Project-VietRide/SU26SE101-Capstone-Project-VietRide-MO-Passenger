import React, { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import { PaperPlaneRight, Stop } from 'phosphor-react-native';
import { useTranslation } from 'react-i18next';

import { Input } from '@shared/components';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import { borderRadius, spacing, type AppTheme } from '@shared/theme';

interface ChatComposerProps {
  disabled: boolean;
  isStreaming: boolean;
  placeholder: string;
  onSend: (message: string) => void;
  onStop: () => void;
}

export const ChatComposer = React.memo(function ChatComposerComponent({
  disabled,
  isStreaming,
  placeholder,
  onSend,
  onStop,
}: ChatComposerProps): React.JSX.Element {
  const [inputText, setInputText] = useState('');
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const canSend = Boolean(inputText.trim()) && !disabled && !isStreaming;

  const handleSend = useCallback(() => {
    const message = inputText.trim();
    if (!message || disabled || isStreaming) return;
    setInputText('');
    onSend(message);
  }, [disabled, inputText, isStreaming, onSend]);

  return (
    <View style={styles.container}>
      <Input
        value={inputText}
        onChangeText={setInputText}
        editable={!disabled && !isStreaming}
        placeholder={placeholder}
        containerStyle={styles.inputContainer}
        maxLength={4_000}
        onSubmitEditing={handleSend}
        returnKeyType="send"
        accessibilityLabel={placeholder}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isStreaming ? t('chatbot.stopResponse') : t('chatbot.sendMessage')}
        disabled={!isStreaming && !canSend}
        onPress={isStreaming ? onStop : handleSend}
        style={({ pressed }) => [
          styles.sendButton,
          isStreaming ? styles.stopButton : null,
          !isStreaming && !canSend ? styles.disabledButton : null,
          pressed ? styles.pressed : null,
        ]}
      >
        {isStreaming ? (
          <Stop size={18} color={theme.colors.textInverse} weight="fill" />
        ) : (
          <PaperPlaneRight size={20} color={theme.colors.textInverse} weight="fill" />
        )}
      </Pressable>
    </View>
  );
});

const createStyles = (theme: AppTheme) => ({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: theme.effects.glassSurfaceStrong,
    borderTopWidth: 1,
    borderTopColor: theme.effects.glassBorder,
  },
  inputContainer: {
    flex: 1,
    marginBottom: 0,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: theme.colors.primary,
    ...theme.effects.floatingShadow,
  },
  stopButton: {
    backgroundColor: theme.colors.error,
  },
  disabledButton: {
    backgroundColor: theme.colors.border,
    shadowOpacity: 0,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.96 }],
  },
});
