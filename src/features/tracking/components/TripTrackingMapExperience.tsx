import React, {
  useCallback,
  useState,
  type ReactNode,
} from 'react';
import { View, type LayoutChangeEvent } from 'react-native';

import { useThemedStyles } from '@shared/hooks/useThemedStyles';
import type { AppTheme } from '@shared/theme';
import {
  UpcomingStopsSheet,
  type TrackingSupplementalListSection,
  type UpcomingStopSheetItem,
} from './UpcomingStopsSheet';
import { DEFAULT_UPCOMING_SHEET_COLLAPSED_HEIGHT } from './upcomingStopsSheetModel';

interface TripTrackingMapExperienceProps {
  featuredItems: readonly UpcomingStopSheetItem[];
  footer?: ReactNode;
  items: readonly UpcomingStopSheetItem[];
  onRefresh: () => void;
  refreshing: boolean;
  renderMap: (bottomContentInset: number) => ReactNode;
  supplementalListSection?: TrackingSupplementalListSection;
}

const INITIAL_BODY_HEIGHT = 600;

/**
 * Owns the map-first Trip/Parcel layout. The map remains mounted while the
 * sheet moves, so GPS updates only move the vehicle marker rather than
 * rebuilding the native map tree.
 */
export const TripTrackingMapExperience = React.memo(
  function TripTrackingMapExperienceComponent({
    featuredItems,
    footer,
    items,
    onRefresh,
    refreshing,
    renderMap,
    supplementalListSection,
  }: TripTrackingMapExperienceProps): React.JSX.Element {
    const styles = useThemedStyles(createStyles);
    const [containerHeight, setContainerHeight] = useState(INITIAL_BODY_HEIGHT);
    const [collapsedHeight, setCollapsedHeight] = useState(
      DEFAULT_UPCOMING_SHEET_COLLAPSED_HEIGHT,
    );

    const handleLayout = useCallback((event: LayoutChangeEvent) => {
      const nextHeight = Math.round(event.nativeEvent.layout.height);
      if (nextHeight > 0) {
        setContainerHeight((current) => current === nextHeight ? current : nextHeight);
      }
    }, []);
    const handleCollapsedHeightChange = useCallback((height: number) => {
      setCollapsedHeight((current) => current === height ? current : height);
    }, []);

    return (
      <View style={styles.container} onLayout={handleLayout}>
        <View style={styles.map}>{renderMap(collapsedHeight)}</View>
        <UpcomingStopsSheet
          containerHeight={containerHeight}
          featuredItems={featuredItems}
          footer={footer}
          items={items}
          onCollapsedHeightChange={handleCollapsedHeightChange}
          onRefresh={onRefresh}
          refreshing={refreshing}
          supplementalListSection={supplementalListSection}
        />
      </View>
    );
  },
);

const createStyles = (_theme: AppTheme) => ({
  container: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden' as const,
  },
  map: {
    flex: 1,
    minHeight: 0,
  },
});
