import React, { useMemo } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { motionTokens } from './motionTokens';
import { useMotion } from './MotionProvider';

interface MotionFadeProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function MotionFade({
  children,
  style,
}: MotionFadeProps): React.JSX.Element {
  const { reduceMotion } = useMotion();
  const entering = useMemo(
    () =>
      reduceMotion
        ? undefined
        : FadeIn.duration(motionTokens.duration.standard),
    [reduceMotion],
  );

  return (
    <Animated.View entering={entering} style={style}>
      {children}
    </Animated.View>
  );
}
