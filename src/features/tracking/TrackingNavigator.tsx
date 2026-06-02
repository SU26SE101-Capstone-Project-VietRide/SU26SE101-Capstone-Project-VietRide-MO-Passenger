import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { TrackingStackParamList } from '@app/navigation/types';
import { colors } from '@shared/theme';

import {
  TrackingOverviewScreen,
  TripTrackerScreen,
} from './screens';

const Stack = createNativeStackNavigator<TrackingStackParamList>();

export function TrackingNavigator(): React.JSX.Element {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="TrackingOverview" component={TrackingOverviewScreen} />
      <Stack.Screen name="TripTracker" component={TripTrackerScreen} />
    </Stack.Navigator>
  );
}
