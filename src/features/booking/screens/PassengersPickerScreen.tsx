/** PassengersPicker — chọn số hành khách (1–9).
 * Visual style: matches Parcel flow (gradient bg, mint palette, card surfaces)
 */

import React, { useState } from 'react';
import { View, Text, Pressable, FlatList, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { ArrowLeft, User } from 'phosphor-react-native';
import { fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';
import { useBookingStore } from '../store/useBookingStore';
import type { BookingStackParamList } from '@app/navigation/types';

type NavProp = NativeStackNavigationProp<BookingStackParamList, 'PassengersPicker'>;

const OPTIONS = Array.from({ length: 9 }, (_, i) => i + 1);

export function PassengersPicker(): React.JSX.Element {
  const navigation = useNavigation<NavProp>();
  const { searchParams, setSearchParams } = useBookingStore();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const [count, setCount] = useState(typeof searchParams.passengers === 'number' ? searchParams.passengers : 1);

  const onConfirm = () => {
    setSearchParams({ passengers: count });
    navigation.goBack();
  };

  const onMinus = () => setCount((c) => Math.max(1, c - 1));
  const onPlus = () => setCount((c) => Math.min(9, c + 1));

  return (
    <View style={styles.root}>
      {/* Gradient background */}
      <View style={styles.gradientContainer} pointerEvents="none">
        <Svg height="300" width="100%">
          <Defs>
            <LinearGradient id="passGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={theme.colors.primaryLight} stopOpacity={theme.isDark ? 0.18 : 0.14} />
              <Stop offset="100%" stopColor={theme.colors.background} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#passGrad)" />
        </Svg>
      </View>

      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
        {/* Header with back bubble */}
        <View style={styles.header}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [styles.backBtn, pressed ? styles.pressed : null]}
          >
            <View style={styles.backBubble}>
              <ArrowLeft size={20} color={theme.colors.primary} weight="bold" />
            </View>
          </Pressable>
          <Text style={styles.headerTitle}>Passengers</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Big number + stepper */}
        <View style={styles.heroRow}>
          <View style={styles.heroCircle}>
            <User size={28} color={theme.colors.primary} weight="fill" />
            <Text style={styles.heroNum}>{count}</Text>
            <Text style={styles.heroLabel}>Passenger{count > 1 ? 's' : ''}</Text>
          </View>
        </View>

        {/* Stepper */}
        <View style={styles.stepper}>
          <Pressable
            style={({ pressed }) => [styles.stepBtn, count <= 1 && styles.stepBtnDisabled, pressed && count > 1 ? styles.pressed : null]}
            onPress={onMinus}
            disabled={count <= 1}
          >
            <Text style={[styles.stepBtnText, count <= 1 && styles.stepBtnTextDisabled]}>−</Text>
          </Pressable>
          <View style={styles.stepDivider} />
          <Pressable
            style={({ pressed }) => [styles.stepBtn, count >= 9 && styles.stepBtnDisabled, pressed && count < 9 ? styles.pressed : null]}
            onPress={onPlus}
            disabled={count >= 9}
          >
            <Text style={[styles.stepBtnText, count >= 9 && styles.stepBtnTextDisabled]}>+</Text>
          </Pressable>
        </View>

        {/* Grid of numbers */}
        <Text style={styles.quickLabel}>Quick select</Text>
        <FlatList
          data={OPTIONS}
          numColumns={5}
          keyExtractor={(n) => String(n)}
          contentContainerStyle={styles.grid}
          renderItem={({ item }) => {
            const active = item === count;
            return (
              <Pressable
                style={({ pressed }) => [
                  styles.gridCell,
                  active && styles.gridCellActive,
                  pressed ? styles.pressed : null,
                ]}
                onPress={() => setCount(item)}
              >
                <Text style={[styles.gridCellText, active && styles.gridCellTextActive]}>{item}</Text>
              </Pressable>
            );
          }}
        />

        {/* Confirm */}
        <View style={styles.footer}>
          <Pressable style={({ pressed }) => [styles.confirmBtn, pressed ? styles.pressed : null]} onPress={onConfirm}>
            <Text style={styles.confirmText}>Confirm - {count} Passenger{count > 1 ? 's' : ''}</Text>
            <ArrowLeft size={18} color={theme.colors.textInverse} weight="bold" style={{ transform: [{ rotate: '180deg' }] }} />
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const createStyles = (theme: AppTheme) => ({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  gradientContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
    zIndex: 0,
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  backBtn: {
    ...theme.components.headerButton,
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.98 }],
  },
  backBubble: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    color: theme.colors.textPrimary,
  },
  heroRow: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  heroCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.colors.primaryFaded,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  heroNum: {
    fontFamily: fontFamilies.bold,
    fontSize: 48,
    color: theme.colors.primary,
    lineHeight: 52,
  },
  heroLabel: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: theme.colors.textSecondary,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.xxl,
    marginTop: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.effects.isLiquid ? theme.effects.glassBorder : theme.colors.divider,
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurface : theme.colors.surface,
    overflow: 'hidden',
    height: 52,
    ...theme.effects.cardShadow,
  },
  stepBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnDisabled: {
    opacity: 0.4,
  },
  stepBtnText: {
    fontFamily: fontFamilies.bold,
    fontSize: 28,
    color: theme.colors.textPrimary,
    lineHeight: 32,
  },
  stepBtnTextDisabled: {
    color: theme.colors.textTertiary,
  },
  stepDivider: {
    width: 1,
    height: 32,
    backgroundColor: theme.colors.divider,
  },
  quickLabel: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: theme.colors.textSecondary,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.xxl,
    marginBottom: spacing.md,
  },
  grid: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 120,
  },
  gridCell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: borderRadius.lg,
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurface : theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.effects.isLiquid ? theme.effects.glassBorder : theme.colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 4,
    ...theme.effects.cardShadow,
  },
  gridCellActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
    ...theme.effects.floatingShadow,
  },
  gridCellText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    color: theme.colors.textPrimary,
  },
  gridCellTextActive: {
    color: theme.colors.textInverse,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurfaceStrong : theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.effects.isLiquid ? theme.effects.glassBorderStrong : theme.colors.divider,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    ...theme.components.primaryButton,
    borderRadius: borderRadius.lg,
    height: 52,
  },
  confirmText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textInverse,
  },
});
