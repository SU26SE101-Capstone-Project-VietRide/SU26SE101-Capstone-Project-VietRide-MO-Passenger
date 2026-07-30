import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

import type { AppTheme } from '@shared/theme';

type StackAnimation = NonNullable<NativeStackNavigationOptions['animation']>;

interface NativeStackOptionsParams {
  theme: AppTheme;
  reduceMotion: boolean;
  animation?: StackAnimation;
  transparent?: boolean;
}

export const createNativeStackOptions = ({
  theme,
  reduceMotion,
  animation = 'slide_from_right',
  transparent = false,
}: NativeStackOptionsParams): NativeStackNavigationOptions => ({
  headerShown: false,
  contentStyle: {
    backgroundColor: transparent
      ? theme.colors.transparent
      : theme.colors.background,
  },
  animation: reduceMotion ? 'none' : animation,
});
