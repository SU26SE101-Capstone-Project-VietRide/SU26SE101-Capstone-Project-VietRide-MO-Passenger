import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, CheckCircle } from 'phosphor-react-native';
import { useNavigation } from '@react-navigation/native';
import { fontFamilies, fontSizes, spacing } from '@shared/theme';
import { useThemeStore } from '@shared/store/useThemeStore';
import { themes, ThemeVariant } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';

export function ThemeScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const currentThemeVariant = useThemeStore((state) => state.currentTheme);
  const setTheme = useThemeStore((state) => state.setTheme);
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.backButton, pressed ? styles.pressed : null]}
        >
          <ArrowLeft size={24} color={theme.colors.textPrimary} />
        </Pressable>
        <Text style={styles.topBarTitle}>Appearance</Text>
        <View style={styles.topBarRightPlaceholder} />
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {Object.entries(themes).map(([key, themeOption]) => (
          <Pressable
            key={key} 
            style={[
              styles.themeCard, 
              currentThemeVariant === key ? styles.activeTheme : null,
            ]} 
            onPress={() => setTheme(key as ThemeVariant)}
          >
            <View style={[styles.previewRail, { backgroundColor: themeOption.colors.background }]}>
              <View
                style={[
                  styles.previewCard,
                  {
                    backgroundColor: themeOption.colors.surfaceElevated,
                    borderColor: themeOption.effects.glassBorder,
                  },
                ]}
              />
            </View>
            <View style={styles.themeInfo}>
              <Text style={styles.themeName}>{themeOption.name}</Text>
              <Text style={styles.themeCaption}>
                {themeOption.variant === 'liquid_light'
                  ? 'Glass surfaces for light mode'
                  : themeOption.isDark
                    ? 'Nocturne glass surfaces'
                    : 'Original VietRide palette'}
              </Text>
            </View>
            {currentThemeVariant === key && (
              <CheckCircle size={24} color={theme.colors.primary} weight="fill" />
            )}
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) => ({
  safeContainer: { ...theme.components.screen },
  topBar: {
    height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    ...theme.components.actionBar,
  },
  backButton: { ...theme.components.headerButton },
  topBarTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.lg,
    color: theme.colors.textPrimary,
  },
  topBarRightPlaceholder: { width: 40 },
  scrollContent: { padding: spacing.xl, gap: spacing.md },
  themeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    gap: spacing.md,
    ...theme.components.card,
  },
  activeTheme: {
    borderColor: theme.colors.primary,
    borderWidth: 2,
  },
  previewRail: {
    width: 54,
    height: 54,
    borderRadius: 18,
    padding: 8,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  previewCard: {
    height: 24,
    borderRadius: 10,
    borderWidth: 1,
  },
  themeInfo: { flex: 1 },
  themeName: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
  },
  themeCaption: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
});
