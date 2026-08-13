import React, { forwardRef } from 'react';
import { Platform, type ScrollView } from 'react-native';
import {
  KeyboardAwareScrollView,
  type KeyboardAwareScrollViewProps,
} from 'react-native-keyboard-controller';

import { spacing } from '@shared/theme';

export type AppKeyboardAwareScrollViewProps = Omit<
  KeyboardAwareScrollViewProps,
  'automaticallyAdjustKeyboardInsets'
>;

/**
 * App-wide form scroller. Keyboard Controller owns keyboard insets and keeps
 * the focused field visible, so native automatic keyboard insets stay off to
 * avoid applying the keyboard height twice.
 */
export const AppKeyboardAwareScrollView = forwardRef<
  ScrollView,
  AppKeyboardAwareScrollViewProps
>(function AppKeyboardAwareScrollViewComponent(
  {
    bottomOffset = spacing.xxl,
    keyboardDismissMode,
    keyboardShouldPersistTaps = 'handled',
    ...props
  },
  ref,
): React.JSX.Element {
  return (
    <KeyboardAwareScrollView
      {...props}
      ref={ref}
      automaticallyAdjustKeyboardInsets={false}
      bottomOffset={bottomOffset}
      keyboardDismissMode={
        keyboardDismissMode ??
        (Platform.OS === 'ios' ? 'interactive' : 'on-drag')
      }
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
    />
  );
});
