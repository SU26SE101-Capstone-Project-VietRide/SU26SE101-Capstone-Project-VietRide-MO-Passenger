import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { ParcelStackParamList } from '@app/navigation/types';
import { useTheme } from '@shared/contexts/ThemeContext';

import {
  CreateParcelScreen,
  ParcelDetailScreen,
  ParcelTrackingScreen,
  ParcelCityPicker,
} from './screens';

const Stack = createNativeStackNavigator<ParcelStackParamList>();

export function ParcelNavigator(): React.JSX.Element {
  const theme = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
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
