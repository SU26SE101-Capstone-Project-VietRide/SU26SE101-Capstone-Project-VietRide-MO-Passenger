/**
 * Dormant product shell for district delivery.
 *
 * The current Parcel backend only supports TERMINAL_PICKUP and exposes no
 * district endpoint. Keep this capability explicit and fail-closed instead of
 * presenting fixture districts as real service coverage.
 */
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, MapPinLine } from 'phosphor-react-native';

import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import {
  borderRadius,
  fontFamilies,
  fontSizes,
  spacing,
  type AppTheme,
} from '@shared/theme';

export function DistrictPicker(): React.JSX.Element {
  const navigation = useNavigation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={8}
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [
            styles.backButton,
            pressed ? styles.pressed : null,
          ]}
        >
          <ArrowLeft size={22} color={theme.colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>District delivery</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <MapPinLine size={34} color={theme.colors.primary} weight="duotone" />
        </View>
        <Text style={styles.title}>Not available yet</Text>
        <Text style={styles.description}>
          Parcel delivery currently supports terminal pickup only. District
          selection will be enabled when the backend provides service-area data.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backButton: {
    ...theme.components.headerButton,
    width: 40,
    height: 40,
  },
  headerSpacer: {
    width: 40,
  },
  headerTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    color: theme.colors.textPrimary,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primaryFaded,
    marginBottom: spacing.lg,
  },
  title: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xl,
    color: theme.colors.textPrimary,
    marginBottom: spacing.sm,
  },
  description: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.md,
    lineHeight: 22,
    textAlign: 'center',
    color: theme.colors.textSecondary,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.97 }],
  },
});
