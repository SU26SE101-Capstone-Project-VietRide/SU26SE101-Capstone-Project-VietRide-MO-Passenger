import React, { useMemo } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { ParcelStackParamList } from '@app/navigation/types';
import { useTheme } from '@shared/contexts/ThemeContext';
import { createNativeStackOptions, useMotion } from '@shared/motion';

import {
  CreateParcelScreen,
  ParcelDetailScreen,
  ParcelTrackingScreen,
  ParcelCityPicker,
} from './screens';

const Stack = createNativeStackNavigator<ParcelStackParamList>();

export function ParcelNavigator(): React.JSX.Element {
  const theme = useTheme();
  const { reduceMotion } = useMotion();
  const screenOptions = useMemo(
    () => createNativeStackOptions({ theme, reduceMotion }),
    [reduceMotion, theme],
  );

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="CityPicker" component={ParcelCityPicker} />
      <Stack.Screen name="CreateParcel" component={CreateParcelScreen} />
      <Stack.Screen
        name="ParcelDetail"
        component={ParcelDetailScreen}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen name="ParcelTracking" component={ParcelTrackingScreen} />
    </Stack.Navigator>
  );
}
