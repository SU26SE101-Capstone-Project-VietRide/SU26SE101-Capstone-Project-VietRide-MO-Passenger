/**
 * App Providers — Composes all application-level providers
 *
 * Wraps the entire app in:
 * - React Query (server state)
 * - SafeAreaProvider (safe insets)
 * - NavigationContainer (routing)
 * - i18n (already initialized as side-effect import)
 */

import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';

import { queryClient } from '@shared/api/queryClient';
import { RootNavigator } from '@app/navigation/RootNavigator';

// Side-effect: initializes i18next
import '@shared/i18n';

interface AppProvidersProps {
  children?: React.ReactNode;
}

export function AppProviders({ children }: AppProvidersProps): React.JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <NavigationContainer>
          <StatusBar
            barStyle="dark-content"
            backgroundColor="transparent"
            translucent
          />
          <RootNavigator />
          {children}
        </NavigationContainer>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
