import React from 'react';
import { useFonts } from 'expo-font';
import { AppProviders } from '@app/providers';
import { useNetworkStatus } from '@shared/hooks';
import { LoadingOverlay } from '@shared/components/LoadingOverlay';
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
  // Load Be Vietnam Pro font weights asynchronously
  const [fontsLoaded, fontError] = useFonts({
    'BeVietnamPro-Regular': require('../assets/fonts/BeVietnamPro-Regular.ttf'),
    'BeVietnamPro-Medium': require('../assets/fonts/BeVietnamPro-Medium.ttf'),
    'BeVietnamPro-SemiBold': require('../assets/fonts/BeVietnamPro-SemiBold.ttf'),
    'BeVietnamPro-Bold': require('../assets/fonts/BeVietnamPro-Bold.ttf'),
  });

  return (
    <AppProviders isAppReady={fontsLoaded || Boolean(fontError)}>
      <AppContent />
    </AppProviders>
  );
}
