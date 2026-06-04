import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { ParcelStackParamList } from '@app/navigation/types';
import { colors } from '@shared/theme';

import {
  ParcelHomeScreen,
  CreateParcelScreen,
  ParcelDetailScreen,
  ParcelTrackingScreen,
  ParcelCityPicker,
  DistrictPicker,
} from './screens';

const Stack = createNativeStackNavigator<ParcelStackParamList>();

export function ParcelNavigator(): React.JSX.Element {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="ParcelList" component={ParcelHomeScreen} />
      <Stack.Screen name="CityPicker" component={ParcelCityPicker} />
      <Stack.Screen name="DistrictPicker" component={DistrictPicker} />
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
