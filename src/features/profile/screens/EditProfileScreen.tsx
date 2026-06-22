import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useMutation } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { Camera, ArrowLeft, CheckCircle } from 'phosphor-react-native';

import { fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useTabBarScrollBehavior, useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';
import { useAuthStore } from '@features/auth/store/useAuthStore';
import { Button, Input } from '@shared/components';
import { CUSTOM_TAB_BAR_BASE_HEIGHT } from '@shared/components/CustomTabBar';
import { getApiErrorMessage, toApiError } from '@shared/api/errors';
import {
  apiProfileFieldErrors,
  editProfileFieldErrors,
  editProfileSchema,
  type EditProfileField,
} from '../validation/profileValidation';
import {
  completeProfile,
  updateProfile,
  uploadAvatar,
  type AvatarUploadFile,
} from '../api/profileApi';

interface SelectedAvatar {
  uri: string;
  file: AvatarUploadFile;
}

const PROFILE_BOTTOM_CONTENT_GAP = spacing.huge;

const getAssetName = (asset: ImagePicker.ImagePickerAsset): string => {
  if (asset.fileName?.trim()) {
    return asset.fileName.trim();
  }

  const extension = asset.mimeType?.split('/')[1] || 'jpg';
  return `vietride-avatar.${extension}`;
};

export function EditProfileScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const handleTabBarScroll = useTabBarScrollBehavior();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const [displayName, setDisplayName] = useState(user?.displayName || user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [selectedAvatar, setSelectedAvatar] = useState<SelectedAvatar | null>(null);
  const [errors, setErrors] = useState<Partial<Record<EditProfileField, string>>>({});

  const bottomTabClearance =
    CUSTOM_TAB_BAR_BASE_HEIGHT + Math.max(insets.bottom, spacing.sm) + PROFILE_BOTTOM_CONTENT_GAP;
  const avatarUri = selectedAvatar?.uri || user?.avatarUrl;
  const avatarInitial = (displayName.trim() || user?.email || 'V').charAt(0).toUpperCase();
  const canCompletePhone = !user?.phone;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const parsed = editProfileSchema.safeParse({ displayName, phone });

      if (!parsed.success) {
        setErrors(editProfileFieldErrors(parsed.error));
        return null;
      }

      setErrors({});

      let nextUser = user;
      const nextDisplayName = parsed.data.displayName;
      const displayNameChanged = Boolean(user && nextDisplayName !== user.displayName);
      const phoneChanged = Boolean(canCompletePhone && parsed.data.phone);

      if (displayNameChanged) {
        nextUser = await updateProfile({ displayName: nextDisplayName });
      }

      if (phoneChanged) {
        nextUser = await completeProfile({ phone: parsed.data.phone });
      }

      if (selectedAvatar) {
        nextUser = await uploadAvatar(selectedAvatar.file);
      }

      return nextUser;
    },
    onSuccess: (nextUser) => {
      if (nextUser) {
        setUser(nextUser);
        navigation.goBack();
      }
    },
    onError: (error) => {
      const apiError = toApiError(error);

      if (apiError.fields.length > 0) {
        setErrors(apiProfileFieldErrors<EditProfileField>(apiError.fields));
      }

      Alert.alert('Không thể cập nhật hồ sơ', getApiErrorMessage(apiError));
    },
  });

  const hasUnsavedChanges = useMemo(
    () =>
      displayName.trim() !== (user?.displayName || user?.fullName || '') ||
      phone.trim() !== (user?.phone || '') ||
      Boolean(selectedAvatar),
    [displayName, phone, selectedAvatar, user?.displayName, user?.fullName, user?.phone],
  );

  const handlePickAvatar = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Cần quyền truy cập ảnh',
        'VietRide cần quyền mở thư viện ảnh để bạn chọn ảnh đại diện.',
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.82,
    });

    if (result.canceled || result.assets.length === 0) {
      return;
    }

    const asset = result.assets[0];

    setSelectedAvatar({
      uri: asset.uri,
      file: {
        uri: asset.uri,
        name: getAssetName(asset),
        type: asset.mimeType || 'image/jpeg',
      },
    });
  }, []);

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
          <Text style={styles.topBarTitle}>Chỉnh sửa hồ sơ</Text>
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
              style={styles.avatarContainer}
              onPress={handlePickAvatar}
            >
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <View style={styles.initialsAvatar}>
                  <Text style={styles.initialsText}>{avatarInitial}</Text>
                </View>
              )}
              <View style={styles.cameraIconBadge}>
                <Camera size={16} color={theme.colors.textInverse} weight="fill" />
              </View>
            </Pressable>
            <Text style={styles.changePhotoText}>Đổi ảnh đại diện</Text>
            {selectedAvatar ? (
              <View style={styles.pendingAvatarNote}>
                <CheckCircle size={14} color={theme.colors.primary} weight="fill" />
                <Text style={styles.pendingAvatarText}>Ảnh mới đang chờ lưu</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.formContainer}>
            <Input
              label="Họ và tên"
              value={displayName}
              onChangeText={(text) => {
                setDisplayName(text);
                if (errors.displayName) {
                  setErrors((prev) => ({ ...prev, displayName: undefined }));
                }
              }}
              placeholder="Nhập họ và tên"
              error={errors.displayName}
              autoCapitalize="words"
              required
            />

            <View style={styles.readOnlyContainer}>
              <Text style={styles.readOnlyLabel}>Email</Text>
              <View style={styles.readOnlyInput}>
                <Text style={styles.readOnlyText}>{user?.email || 'Chưa có email'}</Text>
              </View>
              <Text style={styles.readOnlyHint}>
                Email dùng để đăng nhập nên chưa thể thay đổi trên app.
              </Text>
            </View>

            <Input
              label="Số điện thoại"
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
              error={errors.phone}
              hint={
                canCompletePhone
                  ? 'Backend hiện chỉ hỗ trợ bổ sung số điện thoại một lần.'
                  : 'Backend hiện chưa cho đổi số điện thoại đã xác thực.'
              }
            />
          </View>

          <Button
            title="Lưu thay đổi"
            onPress={() => saveMutation.mutate()}
            loading={saveMutation.isPending}
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
