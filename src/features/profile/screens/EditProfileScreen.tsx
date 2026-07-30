import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useMutation } from '@tanstack/react-query';
import { Camera, ArrowLeft, CheckCircle } from 'phosphor-react-native';
import { useTranslation } from 'react-i18next';

import { fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useTabBarScrollBehavior, useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';
import { useAuthStore } from '@features/auth/store/useAuthStore';
import { Button, Input, UserAvatar } from '@shared/components';
import { CUSTOM_TAB_BAR_BASE_HEIGHT } from '@shared/components/CustomTabBar';
import {
  ApiRequestError,
  getApiErrorMessage,
  toApiError,
} from '@shared/api/errors';
import { pickLocalImages } from '@shared/services/localImagePicker';
import {
  apiProfileFieldErrors,
  editProfileFieldErrors,
  editProfileSchema,
  localizeProfileFieldError,
  type EditProfileField,
} from '../validation/profileValidation';
import {
  completeProfile,
} from '../api/profileApi';
import {
  validateAvatarAsset,
  type AvatarPickerAsset,
} from '../validation/avatarUploadValidation';
import { useUpdateAvatar } from '../hooks/useUpdateAvatar';

interface SelectedAvatar {
  uri: string;
  asset: AvatarPickerAsset;
}

const PROFILE_BOTTOM_CONTENT_GAP = spacing.huge;

export function EditProfileScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const handleTabBarScroll = useTabBarScrollBehavior();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const refreshSession = useAuthStore((state) => state.refreshSession);
  const { uploadAvatar, isUploading } = useUpdateAvatar();
  const displayName = user?.displayName || user?.fullName || '';
  const [phone, setPhone] = useState(user?.phone || '');
  const [selectedAvatar, setSelectedAvatar] = useState<SelectedAvatar | null>(null);
  const [errors, setErrors] = useState<Partial<Record<EditProfileField, string>>>({});

  const bottomTabClearance =
    CUSTOM_TAB_BAR_BASE_HEIGHT + Math.max(insets.bottom, spacing.sm) + PROFILE_BOTTOM_CONTENT_GAP;
  const avatarUri = selectedAvatar?.uri || user?.avatarUrl;
  const canCompletePhone = !user?.phone;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const parsed = editProfileSchema.safeParse({ displayName, phone });

      if (!parsed.success) {
        setErrors(editProfileFieldErrors(parsed.error));
        return null;
      }

      setErrors({});

      const phoneChanged = Boolean(canCompletePhone && parsed.data.phone);

      if (phoneChanged) {
        await completeProfile({ phone: parsed.data.phone });
        const refreshedSession = await refreshSession();
        if (!refreshedSession) {
          throw new ApiRequestError({
            code: 'PROFILE_SESSION_REFRESH_FAILED',
            message: 'profile.edit.errors.sessionRefresh',
          });
        }
      }

      if (selectedAvatar) {
        await uploadAvatar(selectedAvatar.asset);
      }
    },
    onSuccess: () => {
      navigation.goBack();
    },
    onError: (error) => {
      const apiError = toApiError(error);

      if (apiError.fields.length > 0) {
        setErrors(apiProfileFieldErrors<EditProfileField>(apiError.fields));
      }

      const errorMessage = getApiErrorMessage(apiError);
      Alert.alert(
        t('profile.edit.errorTitle'),
        errorMessage.startsWith('profile.')
          ? t(errorMessage)
          : errorMessage,
      );
    },
  });

  const hasUnsavedChanges = useMemo(
    () =>
      (canCompletePhone && phone.trim() !== '') ||
      Boolean(selectedAvatar),
    [canCompletePhone, phone, selectedAvatar],
  );

  const handlePickAvatar = useCallback(async () => {
    try {
      const result = await pickLocalImages({
        source: 'library',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.82,
        selectionLimit: 1,
      });

      if (result.status === 'permission-denied') {
        Alert.alert(
          t('profile.avatar.permissionTitle'),
          t('profile.avatar.permissionDescription'),
        );
        return;
      }

      if (result.status !== 'selected') {
        return;
      }

      const asset = result.assets[0];
      const validation = validateAvatarAsset(asset);

      if (!validation.success) {
        Alert.alert(
          t('profile.avatar.invalidTitle'),
          t(validation.messageKey),
        );
        return;
      }

      setSelectedAvatar({
        uri: asset.uri,
        asset,
      });
    } catch {
      Alert.alert(
        t('profile.avatar.pickerErrorTitle'),
        t('profile.avatar.pickerErrorDescription'),
      );
    }
  }, [t]);

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
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <ArrowLeft size={24} color={theme.colors.textPrimary} />
          </Pressable>
          <Text style={styles.topBarTitle}>{t('profile.edit.title')}</Text>
          <View style={styles.topBarRightPlaceholder} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomTabClearance }]}
          scrollIndicatorInsets={{ bottom: bottomTabClearance }}
          onScroll={handleTabBarScroll}
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.avatarSection}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('profile.avatar.change')}
              style={styles.avatarContainer}
              onPress={handlePickAvatar}
            >
              <UserAvatar url={avatarUri} name={displayName || user?.email} size={104} />
              <View style={styles.cameraIconBadge}>
                <Camera size={16} color={theme.colors.textInverse} weight="fill" />
              </View>
            </Pressable>
            <Text style={styles.changePhotoText}>{t('profile.avatar.change')}</Text>
            {selectedAvatar ? (
              <View style={styles.pendingAvatarNote}>
                <CheckCircle size={14} color={theme.colors.primary} weight="fill" />
                <Text style={styles.pendingAvatarText}>
                  {t('profile.avatar.pendingSave')}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.formContainer}>
            <Input
              label={t('profile.edit.fullName')}
              value={displayName}
              editable={false}
              hint={t('profile.edit.fullNameReadOnlyHint')}
              error={localizeProfileFieldError(errors.displayName, t)}
              autoCapitalize="words"
            />

            <View style={styles.readOnlyContainer}>
              <Text style={styles.readOnlyLabel}>{t('profile.edit.email')}</Text>
              <View style={styles.readOnlyInput}>
                <Text style={styles.readOnlyText}>
                  {user?.email || t('profile.edit.emailUnavailable')}
                </Text>
              </View>
              <Text style={styles.readOnlyHint}>
                {t('profile.edit.emailReadOnlyHint')}
              </Text>
            </View>

            <Input
              label={t('profile.edit.phone')}
              value={phone}
              onChangeText={(text) => {
                setPhone(text);
                if (errors.phone) {
                  setErrors((prev) => ({ ...prev, phone: undefined }));
                }
              }}
              placeholder="+84901234567"
              keyboardType="phone-pad"
              editable={canCompletePhone}
              error={localizeProfileFieldError(errors.phone, t)}
              hint={
                canCompletePhone
                  ? t('profile.edit.phoneCompleteHint')
                  : t('profile.edit.phoneReadOnlyHint')
              }
            />
          </View>

          <Button
            title={t('profile.edit.save')}
            onPress={() => saveMutation.mutate()}
            loading={saveMutation.isPending || isUploading}
            disabled={!hasUnsavedChanges}
            fullWidth
            style={styles.saveButton}
          />
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
  avatarSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  avatarContainer: {
    position: 'relative',
    width: 104,
    height: 104,
    borderRadius: borderRadius.full,
    ...theme.effects.cardShadow,
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurfaceSoft : theme.colors.surfaceAlt,
    borderWidth: 2,
    borderColor: theme.effects.isLiquid ? theme.effects.glassBorderStrong : theme.colors.divider,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: borderRadius.full,
  },
  initialsAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primaryFaded,
  },
  initialsText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.h2,
    color: theme.colors.primary,
  },
  cameraIconBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: theme.colors.primary,
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.effects.isLiquid ? theme.effects.glassSurfaceStrong : theme.colors.surface,
  },
  changePhotoText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: theme.colors.primary,
    marginTop: spacing.md,
  },
  pendingAvatarNote: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.primaryFaded,
  },
  pendingAvatarText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.primary,
    marginLeft: spacing.xs,
  },
  formContainer: {
    marginBottom: spacing.xl,
  },
  readOnlyContainer: {
    marginBottom: spacing.lg,
  },
  readOnlyLabel: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
    marginBottom: spacing.xs,
  },
  readOnlyInput: {
    backgroundColor: theme.effects.isLiquid ? theme.effects.fieldSurface : theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.effects.isLiquid ? theme.effects.fieldBorder : theme.colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 48,
    justifyContent: 'center',
  },
  readOnlyText: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.md,
    color: theme.colors.textSecondary,
  },
  readOnlyHint: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
    marginTop: spacing.xs,
  },
  saveButton: {
    marginTop: spacing.sm,
  },
});
