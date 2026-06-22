import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, LockKey, ShieldCheck } from 'phosphor-react-native';

import { Button, Input } from '@shared/components';
import { CUSTOM_TAB_BAR_BASE_HEIGHT } from '@shared/components/CustomTabBar';
import { getApiErrorMessage, toApiError } from '@shared/api/errors';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useTabBarScrollBehavior, useThemedStyles } from '@shared/hooks';
import { borderRadius, fontFamilies, fontSizes, spacing } from '@shared/theme';
import type { AppTheme } from '@shared/theme';
import { changePassword } from '../api/profileApi';
import {
  apiProfileFieldErrors,
  changePasswordFieldErrors,
  changePasswordSchema,
  type ChangePasswordField,
} from '../validation/profileValidation';

const PROFILE_BOTTOM_CONTENT_GAP = spacing.huge;

export function ChangePasswordScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const handleTabBarScroll = useTabBarScrollBehavior();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Partial<Record<ChangePasswordField, string>>>({});

  const bottomTabClearance =
    CUSTOM_TAB_BAR_BASE_HEIGHT + Math.max(insets.bottom, spacing.sm) + PROFILE_BOTTOM_CONTENT_GAP;

  const mutation = useMutation({
    mutationFn: async () => {
      const parsed = changePasswordSchema.safeParse({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      if (!parsed.success) {
        setErrors(changePasswordFieldErrors(parsed.error));
        return null;
      }

      setErrors({});

      return changePassword({
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
      });
    },
    onSuccess: (response) => {
      if (!response) {
        return;
      }

      Alert.alert(
        'Đã đổi mật khẩu',
        'Mật khẩu của bạn đã được cập nhật.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    },
    onError: (error) => {
      const apiError = toApiError(error);

      if (apiError.fields.length > 0) {
        setErrors(apiProfileFieldErrors<ChangePasswordField>(apiError.fields));
      }

      Alert.alert('Không thể đổi mật khẩu', getApiErrorMessage(apiError));
    },
  });

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top']}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <View style={styles.topBar}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <ArrowLeft size={24} color={theme.colors.textPrimary} />
          </Pressable>
          <Text style={styles.topBarTitle}>Đổi mật khẩu</Text>
          <View style={styles.topBarRightPlaceholder} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomTabClearance }]}
          scrollIndicatorInsets={{ bottom: bottomTabClearance }}
          onScroll={handleTabBarScroll}
          scrollEventThrottle={16}
        >
          <View style={styles.infoCard}>
            <View style={styles.infoIcon}>
              <ShieldCheck size={22} color={theme.colors.primary} weight="fill" />
            </View>
            <View style={styles.infoTextWrap}>
              <Text style={styles.infoTitle}>Bảo vệ tài khoản</Text>
              <Text style={styles.infoText}>
                Dùng mật khẩu khác mật khẩu cũ, tối thiểu 8 ký tự và có cả chữ lẫn số.
              </Text>
            </View>
          </View>

          <View style={styles.formCard}>
            <Input
              label="Mật khẩu hiện tại"
              value={currentPassword}
              onChangeText={(text) => {
                setCurrentPassword(text);
                if (errors.currentPassword) {
                  setErrors((prev) => ({ ...prev, currentPassword: undefined }));
                }
              }}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              error={errors.currentPassword}
              required
            />

            <Input
              label="Mật khẩu mới"
              value={newPassword}
              onChangeText={(text) => {
                setNewPassword(text);
                if (errors.newPassword) {
                  setErrors((prev) => ({ ...prev, newPassword: undefined }));
                }
              }}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              error={errors.newPassword}
              required
            />

            <Input
              label="Nhập lại mật khẩu mới"
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                if (errors.confirmPassword) {
                  setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                }
              }}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              error={errors.confirmPassword}
              required
            />
          </View>

          <Button
            title="Cập nhật mật khẩu"
            onPress={() => mutation.mutate()}
            loading={mutation.isPending}
            fullWidth
            style={styles.submitButton}
          />

          <View style={styles.backendNote}>
            <LockKey size={16} color={theme.colors.textTertiary} />
            <Text style={styles.backendNoteText}>
              Mobile đã chuẩn bị sẵn request POST /v1/auth/change-password. Nếu BE chưa mở endpoint,
              app sẽ báo chưa hỗ trợ thay vì cập nhật giả.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) => ({
  safeContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  topBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.effects.isLiquid ? theme.effects.glassBorder : theme.colors.divider,
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurfaceStrong : theme.colors.surface,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.lg,
    color: theme.colors.textPrimary,
  },
  topBarRightPlaceholder: {
    width: 40,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  infoCard: {
    ...theme.components.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    marginBottom: spacing.xl,
  },
  infoIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primaryFaded,
    marginRight: spacing.md,
  },
  infoTextWrap: {
    flex: 1,
  },
  infoTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
  },
  infoText: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    lineHeight: 18,
    color: theme.colors.textSecondary,
    marginTop: spacing.xs,
  },
  formCard: {
    ...theme.components.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  submitButton: {
    marginTop: spacing.xl,
  },
  backendNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  backendNoteText: {
    flex: 1,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    lineHeight: 16,
    color: theme.colors.textTertiary,
    marginLeft: spacing.sm,
  },
});
