import React, { useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';

import { AppLaunchScreen } from '@shared/components';
import i18n from '@shared/i18n';
import { useAppStore, type Locale } from '@shared/store/useAppStore';
import { useThemeStore } from '@shared/store/useThemeStore';

interface AppPreferencesProviderProps {
  children: React.ReactNode;
}

const resolveLocale = (language?: string): Locale =>
  language?.toLowerCase().startsWith('en') ? 'en' : 'vi';

function PreferencesHydrationGate({
  children,
}: AppPreferencesProviderProps): React.JSX.Element {
  const locale = useAppStore(state => state.locale);
  const appPreferencesHydrated = useAppStore(state => state.hasHydrated);
  const themePreferencesHydrated = useThemeStore(state => state.hasHydrated);
  const [syncedLocale, setSyncedLocale] = useState<Locale>(() =>
    resolveLocale(i18n.resolvedLanguage),
  );

  useEffect(() => {
    let isActive = true;

    void i18n
      .changeLanguage(locale)
      .then(() => {
        if (isActive) {
          setSyncedLocale(resolveLocale(i18n.resolvedLanguage));
        }
      })
      .catch(() => {
        if (isActive) {
          console.warn('[Preferences] Could not apply the saved language.');
          setSyncedLocale(locale);
        }
      });

    return () => {
      isActive = false;
    };
  }, [locale]);

  const isReady =
    appPreferencesHydrated &&
    themePreferencesHydrated &&
    syncedLocale === locale;

  if (!isReady) {
    return <AppLaunchScreen message={i18n.t('app.preparing')} />;
  }

  return <>{children}</>;
}

export function AppPreferencesProvider({
  children,
}: AppPreferencesProviderProps): React.JSX.Element {
  return (
    <I18nextProvider i18n={i18n}>
      <PreferencesHydrationGate>{children}</PreferencesHydrationGate>
    </I18nextProvider>
  );
}
