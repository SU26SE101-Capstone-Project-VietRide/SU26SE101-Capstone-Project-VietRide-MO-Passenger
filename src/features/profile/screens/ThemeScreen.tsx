import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, CheckCircle } from 'phosphor-react-native';
import { useNavigation } from '@react-navigation/native';
import { fontFamilies, fontSizes, spacing } from '@shared/theme';
import { useThemeStore } from '@shared/store/useThemeStore';
import { themes } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import { CUSTOM_TAB_BAR_BASE_HEIGHT } from '@shared/components/CustomTabBar';
import type { AppTheme, ThemeVariant } from '@shared/theme';

const THEME_OPTIONS = Object.entries(themes) as Array<[ThemeVariant, AppTheme]>;
const THEME_SCREEN_BOTTOM_GAP = spacing.huge;

const themeCaptions: Record<ThemeVariant, string> = {
  classic: 'Clean, crisp VietRide interface',
  liquid_light: 'Bright glass with soft refraction',
  liquid_dark: 'Dark glass with teal glow',
};

const themeTags: Record<ThemeVariant, string> = {
  classic: 'Classic',
  liquid_light: 'Light',
  liquid_dark: 'Dark',
};

export function ThemeScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const currentThemeVariant = useThemeStore((state) => state.currentTheme);
  const setTheme = useThemeStore((state) => state.setTheme);
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const bottomTabClearance =
    CUSTOM_TAB_BAR_BASE_HEIGHT + Math.max(insets.bottom, spacing.sm) + THEME_SCREEN_BOTTOM_GAP;

  const renderThemePreview = (themeOption: AppTheme, isSelected: boolean): React.JSX.Element => {
    const previewSurface = themeOption.effects.isLiquid
      ? themeOption.effects.glassSurfaceStrong
      : themeOption.colors.surfaceElevated;
    const previewSoftSurface = themeOption.effects.isLiquid
      ? themeOption.effects.glassSurfaceSoft
      : themeOption.colors.surfaceAlt;
    const previewBorder = themeOption.effects.isLiquid
      ? themeOption.effects.glassBorderStrong
      : themeOption.colors.divider;

    return (
      <View
        style={[
          styles.previewPhone,
          {
            backgroundColor: themeOption.colors.background,
            borderColor: isSelected ? theme.colors.primary : previewBorder,
          },
        ]}
      >
        <View style={[styles.previewGlowPrimary, { backgroundColor: themeOption.effects.ambientGlow }]} />
        <View style={[styles.previewGlowSecondary, { backgroundColor: themeOption.effects.glassTint }]} />

        <View style={styles.previewStatusRow}>
          <View style={[styles.previewStatusPill, { backgroundColor: themeOption.colors.textPrimary }]} />
          <View style={[styles.previewStatusDot, { backgroundColor: themeOption.colors.primary }]} />
        </View>

        <View
          style={[
            styles.previewHeroCard,
            {
              backgroundColor: previewSurface,
              borderColor: previewBorder,
            },
          ]}
        >
          <View style={styles.previewHeroHeader}>
            <View style={[styles.previewAvatar, { backgroundColor: themeOption.colors.primaryFaded }]} />
            <View style={styles.previewTitleGroup}>
              <View style={[styles.previewTitleLine, { backgroundColor: themeOption.colors.textPrimary }]} />
              <View style={[styles.previewSubtitleLine, { backgroundColor: themeOption.colors.textTertiary }]} />
            </View>
          </View>

          <View style={[styles.previewRouteCard, { backgroundColor: previewSoftSurface, borderColor: previewBorder }]}>
            <View style={styles.previewRouteRow}>
              <Text style={[styles.previewCityText, { color: themeOption.colors.textPrimary }]}>SGN</Text>
              <View style={[styles.previewRouteLine, { backgroundColor: themeOption.colors.divider }]}>
                <View style={[styles.previewRouteDot, { backgroundColor: themeOption.colors.primary }]} />
              </View>
              <Text style={[styles.previewCityText, { color: themeOption.colors.textPrimary }]}>DLI</Text>
            </View>
            <View style={styles.previewMetaRow}>
              <View style={[styles.previewMetaPill, { backgroundColor: themeOption.colors.primaryFaded }]} />
              <View style={[styles.previewMetaPillShort, { backgroundColor: themeOption.colors.warningLight }]} />
            </View>
          </View>

          <View style={[styles.previewCta, { backgroundColor: themeOption.colors.primary }]} />
        </View>

        <View
          style={[
            styles.previewTabBar,
            {
              backgroundColor: themeOption.effects.isLiquid
                ? themeOption.effects.tabBarSurface
                : themeOption.colors.surface,
              borderColor: previewBorder,
            },
          ]}
        >
          <View style={[styles.previewTabActive, { backgroundColor: themeOption.colors.primary }]} />
          <View style={[styles.previewTabDot, { backgroundColor: themeOption.colors.textTertiary }]} />
          <View style={[styles.previewTabDot, { backgroundColor: themeOption.colors.textTertiary }]} />
        </View>
      </View>
    );
  };

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
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomTabClearance }]}
        contentInsetAdjustmentBehavior="automatic"
        scrollIndicatorInsets={{ bottom: bottomTabClearance }}
      >
        {THEME_OPTIONS.map(([key, themeOption]) => {
          const isSelected = currentThemeVariant === key;

          return (
            <Pressable
              key={key}
              style={({ pressed }) => [
                styles.themeCard,
                isSelected ? styles.activeTheme : null,
                pressed ? styles.pressed : null,
              ]}
              onPress={() => setTheme(key)}
            >
              {renderThemePreview(themeOption, isSelected)}

              <View style={styles.themeInfo}>
                <View style={styles.themeTitleRow}>
                  <Text style={styles.themeName}>{themeOption.name}</Text>
                  <View style={[styles.themeTag, isSelected ? styles.themeTagActive : null]}>
                    <Text style={[styles.themeTagText, isSelected ? styles.themeTagTextActive : null]}>
                      {themeTags[key]}
                    </Text>
                  </View>
                </View>
                <Text style={styles.themeCaption}>{themeCaptions[key]}</Text>
              </View>

              {isSelected ? (
                <CheckCircle size={24} color={theme.colors.primary} weight="fill" />
              ) : (
                <View style={styles.checkPlaceholder} />
              )}
            </Pressable>
          );
        })}
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
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    gap: spacing.md,
  },
  themeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    gap: spacing.md,
    ...theme.components.card,
  },
  activeTheme: {
    borderColor: theme.colors.primary,
    borderWidth: 2,
  },
  previewPhone: {
    width: 92,
    height: 124,
    borderRadius: 26,
    borderWidth: 1.4,
    padding: spacing.sm,
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  previewGlowPrimary: {
    position: 'absolute',
    top: -24,
    right: -20,
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  previewGlowSecondary: {
    position: 'absolute',
    bottom: 18,
    left: -28,
    width: 74,
    height: 74,
    borderRadius: 37,
  },
  previewStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 1,
  },
  previewStatusPill: {
    width: 20,
    height: 4,
    borderRadius: 2,
    opacity: 0.64,
  },
  previewStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  previewHeroCard: {
    zIndex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 6,
    gap: 6,
  },
  previewHeroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  previewAvatar: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  previewTitleGroup: {
    flex: 1,
    gap: 3,
  },
  previewTitleLine: {
    width: '68%',
    height: 4,
    borderRadius: 2,
    opacity: 0.72,
  },
  previewSubtitleLine: {
    width: '48%',
    height: 3,
    borderRadius: 2,
    opacity: 0.42,
  },
  previewRouteCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 5,
    gap: 5,
  },
  previewRouteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  previewCityText: {
    fontFamily: fontFamilies.bold,
    fontSize: 8,
  },
  previewRouteLine: {
    flex: 1,
    height: 2,
    borderRadius: 1,
    justifyContent: 'center',
  },
  previewRouteDot: {
    alignSelf: 'center',
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  previewMetaRow: {
    flexDirection: 'row',
    gap: 4,
  },
  previewMetaPill: {
    width: 24,
    height: 5,
    borderRadius: 3,
  },
  previewMetaPillShort: {
    width: 16,
    height: 5,
    borderRadius: 3,
  },
  previewCta: {
    height: 8,
    borderRadius: 4,
  },
  previewTabBar: {
    zIndex: 1,
    height: 20,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewTabActive: {
    width: 20,
    height: 6,
    borderRadius: 3,
  },
  previewTabDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    opacity: 0.44,
  },
  themeInfo: { flex: 1 },
  themeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  themeName: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
    flexShrink: 1,
  },
  themeTag: {
    borderRadius: 7,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurfaceSoft : theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.effects.isLiquid ? theme.effects.glassBorder : theme.colors.divider,
  },
  themeTagActive: {
    backgroundColor: theme.colors.primaryFaded,
    borderColor: theme.colors.primary,
  },
  themeTagText: {
    fontFamily: fontFamilies.bold,
    fontSize: 9,
    color: theme.colors.textTertiary,
  },
  themeTagTextActive: {
    color: theme.colors.primary,
  },
  themeCaption: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  checkPlaceholder: {
    width: 24,
    height: 24,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
});
