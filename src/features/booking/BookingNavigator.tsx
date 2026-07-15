/**
 * BookingNavigator — Manages the ticket booking flow
 *
 * Stack: BusSearch -> CityPicker/DatePicker -> TripResults -> SeatSelection -> Checkout -> Payment -> DigitalTicket
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { BookingStackParamList } from '@app/navigation/types';

import { BusSearchScreen } from './screens/BusSearchScreen';
import { PopularRoutesScreen } from './screens/PopularRoutesScreen';
import { CityPickerScreen } from './screens/CityPickerScreen';
import { DatePicker } from './screens/DatePickerScreen';
import { CreateTicketBookingScreen } from './screens/CreateTicketBookingScreen';
import { DigitalTicketScreen } from './screens/DigitalTicketScreen';
import { useTheme } from '@shared/contexts/ThemeContext';

const Stack = createNativeStackNavigator<BookingStackParamList>();

export function BookingNavigator(): React.JSX.Element {
  const theme = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen name="SearchRoutes" component={BusSearchScreen} />
      <Stack.Screen name="PopularRoutes" component={PopularRoutesScreen} />
      <Stack.Screen name="CityPicker" component={CityPickerScreen} />
      <Stack.Screen name="DatePicker" component={DatePicker} />
      <Stack.Screen
        name="CreateTicketBooking"
        component={CreateTicketBookingScreen}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen
        name="DigitalTicket"
        component={DigitalTicketScreen}
        options={{ gestureEnabled: false }}
      />
    </Stack.Navigator>
  );
}
