import React, { useCallback, useEffect, useState } from 'react';
import { TextInput, View } from 'react-native';
import { User } from 'phosphor-react-native';
import { fontFamilies, fontSizes, spacing } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';
import { normalizeBookingSeatCount } from '../constants/bookingLimits';

interface PassengerCountInputProps {
  value: number;
  onChange: (value: number) => void;
}

const normalizePassengerCount = (value: string): number => {
  const parsed = Number.parseInt(value, 10);
  return normalizeBookingSeatCount(parsed);
};

export function PassengerCountInput({
  value,
  onChange,
}: PassengerCountInputProps): React.JSX.Element {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const [inputValue, setInputValue] = useState(String(value));

  useEffect(() => {
    setInputValue(String(value));
  }, [value]);

  const commitValue = useCallback(() => {
    const nextValue = normalizePassengerCount(inputValue);
    setInputValue(String(nextValue));
    if (nextValue !== value) {
      onChange(nextValue);
    }
  }, [inputValue, onChange, value]);

  const handleChangeText = useCallback(
    (text: string) => {
      const digits = text.replace(/\D/g, '').slice(0, 1);
      setInputValue(digits);

      if (digits) {
        const nextValue = normalizePassengerCount(digits);
        if (nextValue !== value) {
          onChange(nextValue);
        }
      }
    },
    [onChange, value],
  );

  return (
    <View style={styles.container}>
      <User size={16} color={theme.colors.primary} weight="fill" />
      <TextInput
        value={inputValue}
        onChangeText={handleChangeText}
        onBlur={commitValue}
        onSubmitEditing={commitValue}
        keyboardType="number-pad"
        inputMode="numeric"
        returnKeyType="done"
        maxLength={1}
        selectTextOnFocus
        style={styles.input}
        accessibilityLabel="Passenger count"
      />
    </View>
  );
}

const createStyles = (theme: AppTheme) => ({
  container: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    ...theme.components.field,
    borderRadius: 16,
    height: 44,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  input: {
    width: 20,
    padding: 0,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
});
