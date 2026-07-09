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
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { ThemeProvider } from '@shared/contexts/ThemeContext';
import { StatusBarDynamic } from '@shared/components/StatusBarDynamic';
import { QueryClientProvider } from '@tanstack/react-query';

import { queryClient } from '@shared/api/queryClient';
import { RootNavigator } from '@app/navigation/RootNavigator';
import { useLocations } from '@features/location/hooks/useLocations';

// Side-effect: initializes i18next
import '@shared/i18n';

interface AppProvidersProps {
  children?: React.ReactNode;
}

function LocationCatalogBootstrap(): null {
  useLocations();
  return null;
}

export function AppProviders({ children }: AppProvidersProps): React.JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <LocationCatalogBootstrap />
      <SafeAreaProvider>
        <ThemeProvider>
          <NavigationContainer>
            <StatusBarDynamic />
            <RootNavigator />
            {children}
          </NavigationContainer>
        </ThemeProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
