import { useCallback, useRef } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

import { useTabBarStore } from '@shared/store/useTabBarStore';

const SCROLL_DELTA_THRESHOLD = 10;
const TOP_RESET_OFFSET = 16;

export function useTabBarScrollBehavior(): (
  event: NativeSyntheticEvent<NativeScrollEvent>,
) => void {
  const lastOffsetY = useRef(0);
  const setCompact = useTabBarStore((state) => state.setCompact);

  return useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = Math.max(event.nativeEvent.contentOffset.y, 0);
      const deltaY = offsetY - lastOffsetY.current;

      if (offsetY <= TOP_RESET_OFFSET) {
        setCompact(false);
      } else if (deltaY > SCROLL_DELTA_THRESHOLD) {
        setCompact(true);
      } else if (deltaY < -SCROLL_DELTA_THRESHOLD) {
        setCompact(false);
      }

      lastOffsetY.current = offsetY;
    },
    [setCompact],
  );
}
