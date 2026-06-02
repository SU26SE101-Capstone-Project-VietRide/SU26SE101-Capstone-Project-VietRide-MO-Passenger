/**
 * BookingNavigator — Manages the ticket booking flow
 *
 * Stack: BusSearch -> TripResults -> SeatSelection -> Checkout -> Payment -> DigitalTicket
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { BookingStackParamList } from '@app/navigation/types';

import { BusSearchScreen } from './screens/BusSearchScreen';
import { TripResultsScreen } from './screens/TripResultsScreen';
import { SeatSelectionScreen } from './screens/SeatSelectionScreen';
import { CheckoutScreen } from './screens/CheckoutScreen';
import { PaymentScreen } from './screens/PaymentScreen';
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
      <Stack.Screen name="RouteResults" component={TripResultsScreen} />
      <Stack.Screen name="SeatSelection" component={SeatSelectionScreen} />
      <Stack.Screen name="BookingConfirmation" component={CheckoutScreen} />
      <Stack.Screen name="Payment" component={PaymentScreen} />
      <Stack.Screen
        name="DigitalTicket"
        component={DigitalTicketScreen}
        options={{ gestureEnabled: false }}
      />
    </Stack.Navigator>
  );
}
