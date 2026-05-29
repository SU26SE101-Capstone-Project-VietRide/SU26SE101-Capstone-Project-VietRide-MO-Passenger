/**
 * App — Root application component
 *
 * Mounts all providers and initializes global hooks
 * (network monitoring, etc.)
 */

import React from 'react';
import { AppProviders } from '@app/providers';
import { useNetworkStatus } from '@shared/hooks';
import { LoadingOverlay } from '@shared/components';
import { useAppStore } from '@shared/store';

function AppContent(): React.JSX.Element {
  // Initialize network monitoring
  useNetworkStatus();

  const isGlobalLoading = useAppStore((state) => state.isGlobalLoading);

  return (
    <>
      <LoadingOverlay visible={isGlobalLoading} />
    </>
  );
}

export default function App(): React.JSX.Element {
  return (
    <AppProviders>
      <AppContent />
    </AppProviders>
  );
}
