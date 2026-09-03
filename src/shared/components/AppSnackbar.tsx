import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardStickyView } from 'react-native-keyboard-controller';

import { useMotion } from '@shared/motion';
import { spacing } from '@shared/theme';
import {
  dismissSnackbar,
  useSnackbarStore,
} from '@shared/store/useSnackbarStore';
import { useResponsiveLayout } from '@shared/hooks';
import {
  getSnackbarBottomOffset,
  SNACKBAR_MAX_WIDTH,
} from '@shared/layout/snackbarLayout';
import { SnackbarCard } from './SnackbarCard';

const DEFAULT_DURATION_MS = 3600;
const ACTION_DURATION_MS = 6000;

interface AppSnackbarProps {
  isMainTabActive: boolean;
}

export function AppSnackbar({
  isMainTabActive,
}: AppSnackbarProps): React.JSX.Element | null {
  const current = useSnackbarStore(state => state.current);
  const insets = useSafeAreaInsets();
  const { isCompact } = useResponsiveLayout();
  const { reduceMotion } = useMotion();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    if (!current) return;

    if (reduceMotion) {
      opacity.setValue(1);
      translateY.setValue(0);
    } else {
      opacity.setValue(0);
      translateY.setValue(12);
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }

    const duration = current.durationMs
      ?? (current.action ? ACTION_DURATION_MS : DEFAULT_DURATION_MS);
    const timer = setTimeout(
      () => dismissSnackbar(current.id),
      Math.max(1400, duration),
    );
    return () => clearTimeout(timer);
  }, [current, opacity, reduceMotion, translateY]);

  if (!current) return null;

  const bottom = getSnackbarBottomOffset({
    bottomInset: insets.bottom,
    isCompact,
    isMainTabActive,
  });
  const handleAction = () => {
    const action = current.action;
    dismissSnackbar(current.id);
    action?.onPress();
  };

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <KeyboardStickyView
        pointerEvents="box-none"
        offset={{ closed: 0, opened: bottom - spacing.md }}
        style={[styles.positioner, { bottom }]}
      >
        <Animated.View
          style={[
            styles.card,
            { opacity, transform: [{ translateY }] },
          ]}
        >
          <SnackbarCard
            message={current.message}
            tone={current.tone}
            action={current.action}
            onAction={handleAction}
            onDismiss={() => dismissSnackbar(current.id)}
          />
        </Animated.View>
      </KeyboardStickyView>
    </View>
  );
}

const styles = StyleSheet.create({
  positioner: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    zIndex: 90,
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: SNACKBAR_MAX_WIDTH,
  },
});
