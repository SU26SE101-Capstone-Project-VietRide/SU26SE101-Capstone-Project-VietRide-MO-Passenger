/**
 * BookingNavigator — Manages the ticket booking flow
 *
 * Stack: BusSearch -> CityPicker/DatePicker/PassengersPicker -> TripResults -> SeatSelection -> Checkout -> Payment -> DigitalTicket
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { BookingStackParamList } from '@app/navigation/types';

import { BusSearchScreen } from './screens/BusSearchScreen';
import { PopularRoutesScreen } from './screens/PopularRoutesScreen';
import { CityPickerScreen } from './screens/CityPickerScreen';
import { DatePicker } from './screens/DatePickerScreen';
import { PassengersPicker } from './screens/PassengersPickerScreen';
import { CreateTicketBookingScreen } from './screens/CreateTicketBookingScreen';
import { DigitalTicketScreen } from './screens/DigitalTicketScreen';
import { colors } from '@shared/theme';

const Stack = createNativeStackNavigator<BookingStackParamList>();

export function BookingNavigator(): React.JSX.Element {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="SearchRoutes" component={BusSearchScreen} />
      <Stack.Screen name="PopularRoutes" component={PopularRoutesScreen} />
      <Stack.Screen name="CityPicker" component={CityPickerScreen} />
      <Stack.Screen name="DatePicker" component={DatePicker} />
      <Stack.Screen name="PassengersPicker" component={PassengersPicker} />
      <Stack.Screen name="CreateTicketBooking" component={CreateTicketBookingScreen} />
      <Stack.Screen
        name="DigitalTicket"
        component={DigitalTicketScreen}
        options={{ gestureEnabled: false }}
      />
    </Stack.Navigator>
  );
}
