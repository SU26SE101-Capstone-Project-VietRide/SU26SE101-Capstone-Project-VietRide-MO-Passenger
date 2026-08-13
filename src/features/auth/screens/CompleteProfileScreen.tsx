import React, { useCallback, useRef, useState } from 'react';
import {
  StatusBar,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { completeProfile } from '@features/profile/api/profileApi';
import { ApiRequestError, toApiError } from '@shared/api/errors';
import { AppKeyboardAwareScrollView, Button, Input } from '@shared/components';
import { useTheme } from '@shared/contexts/ThemeContext';
import {
  fontFamilies,
  fontSizes,
  spacing,
  type AppTheme,
} from '@shared/theme';
import { useApiError, useThemedStyles } from '@shared/hooks';
import { AUTH_ERROR_TRANSLATION_KEYS } from '../authErrorKeys';
import {
  isValidVietnamPhone,
  normalizeVietnamPhone,
} from '../validation/authValidation';
import { useAuthStore } from '../store/useAuthStore';

export function CompleteProfileScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const user = useAuthStore((state) => state.user);
  const refreshSession = useAuthStore((state) => state.refreshSession);
  const completionAcceptedRef = useRef(false);
  const [phone, setPhone] = useState('');
  const [localErrorKey, setLocalErrorKey] = useState<string | null>(null);
  const { clearError, errorMessage, handleError } = useApiError(
    AUTH_ERROR_TRANSLATION_KEYS,
  );

  const mutation = useMutation({
    mutationFn: async (normalizedPhone: string) => {
      if (!completionAcceptedRef.current) {
        try {
          await completeProfile({ phone: normalizedPhone });
          completionAcceptedRef.current = true;
        } catch (error) {
          const apiError = toApiError(error);
          // BE returns 422 when the phone was already persisted. This can
          // happen after a previous 200 whose required token refresh failed.
          if (apiError.statusCode !== 422 || apiError.code !== 'VALIDATION_ERROR') {
            throw error;
          }
          completionAcceptedRef.current = true;
        }
      }

      const refreshedSession = await refreshSession();
      if (!refreshedSession?.user.phone) {
        throw new ApiRequestError({
          code: 'COMPLETE_PROFILE_SESSION_REFRESH_FAILED',
          message: 'The secure session did not contain the updated phone number.',
        });
      }
      completionAcceptedRef.current = true;
    },
    onError: handleError,
  });

  const handleSubmit = useCallback(() => {
    clearError();
    setLocalErrorKey(null);

    if (!isValidVietnamPhone(phone)) {
      setLocalErrorKey('auth.completeProfile.invalidPhone');
      return;
    }

    mutation.mutate(normalizeVietnamPhone(phone));
  }, [clearError, mutation, phone]);

  const handlePhoneChange = useCallback((value: string) => {
    setPhone(value);
    setLocalErrorKey(null);
    clearError();
  }, [clearError]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} />
      <View
        style={styles.keyboardView}
      >
        <AppKeyboardAwareScrollView
          contentContainerStyle={styles.scrollContent}
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <Text style={styles.eyebrow}>
              {t('auth.completeProfile.eyebrow')}
            </Text>
            <Text style={styles.title}>
              {t('auth.completeProfile.title')}
            </Text>
            <Text style={styles.subtitle}>
              {t('auth.completeProfile.description', {
                name:
                  user?.displayName
                  || user?.email
                  || t('auth.completeProfile.defaultName'),
              })}
            </Text>
            <Input
              label={t('auth.fields.vietnamPhone')}
              value={phone}
              onChangeText={handlePhoneChange}
              placeholder="+84901234567"
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              error={localErrorKey ? t(localErrorKey) : errorMessage ?? undefined}
              required
            />
            <Button
              title={t('common.continue')}
              onPress={handleSubmit}
              loading={mutation.isPending}
              disabled={!phone.trim()}
              fullWidth
              style={styles.button}
            />
          </View>
        </AppKeyboardAwareScrollView>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) => ({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardView: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    padding: spacing.xl,
    ...theme.components.elevatedCard,
  },
  eyebrow: {
    color: theme.colors.primary,
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    marginBottom: spacing.sm,
  },
  title: {
    color: theme.colors.textPrimary,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xxl,
    marginBottom: spacing.sm,
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.md,
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  button: { marginTop: spacing.md },
});
