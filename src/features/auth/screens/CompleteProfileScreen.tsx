import React, { useCallback, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { completeProfile } from '@features/profile/api/profileApi';
import { Button, Input } from '@shared/components';
import { useTheme } from '@shared/contexts/ThemeContext';
import { fontFamilies, fontSizes, spacing } from '@shared/theme';
import { isValidVietnamPhone } from '../validation/authValidation';
import { useAuthStore } from '../store/useAuthStore';

export function CompleteProfileScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const theme = useTheme();
  const user = useAuthStore((state) => state.user);
  const refreshSession = useAuthStore((state) => state.refreshSession);
  const [phone, setPhone] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const normalizedPhone = phone.trim();
      if (!isValidVietnamPhone(normalizedPhone)) {
        throw new Error(t('auth.completeProfile.invalidPhone'));
      }

      await completeProfile({ phone: normalizedPhone });
      const refreshedSession = await refreshSession();
      if (!refreshedSession?.user.phone) {
        throw new Error(t('auth.completeProfile.sessionRefreshFailed'));
      }
    },
    onError: (error) => {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : t('auth.completeProfile.updateFailed'),
      );
    },
  });

  const handleSubmit = useCallback(() => {
    setErrorMessage(null);
    mutation.mutate();
  }, [mutation]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.divider }]}>
          <Text style={[styles.eyebrow, { color: theme.colors.primary }]}>
            {t('auth.completeProfile.eyebrow')}
          </Text>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
            {t('auth.completeProfile.title')}
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
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
            onChangeText={setPhone}
            placeholder="+84901234567"
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            error={errorMessage ?? undefined}
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  keyboardView: { flex: 1, justifyContent: 'center', padding: spacing.xl },
  card: { borderRadius: 24, borderWidth: 1, padding: spacing.xl },
  eyebrow: { fontFamily: fontFamilies.semiBold, fontSize: fontSizes.sm, marginBottom: spacing.sm },
  title: { fontFamily: fontFamilies.bold, fontSize: fontSizes.xxl, marginBottom: spacing.sm },
  subtitle: { fontFamily: fontFamilies.regular, fontSize: fontSizes.md, lineHeight: 22, marginBottom: spacing.xl },
  button: { marginTop: spacing.md },
});
