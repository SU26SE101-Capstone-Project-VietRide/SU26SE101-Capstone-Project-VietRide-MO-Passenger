import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  Image,
  ScrollView,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Camera, ArrowLeft, Check } from 'phosphor-react-native';

import { fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';
import { useAuthStore } from '@features/auth/store/useAuthStore';
import { Input, Button, LoadingOverlay } from '@shared/components';

// 6 Curated high-fidelity mock avatar illustration URLs
const PRESET_AVATARS = [
  'https://i.pravatar.cc/150?img=11',
  'https://i.pravatar.cc/150?img=12',
  'https://i.pravatar.cc/150?img=26',
  'https://i.pravatar.cc/150?img=33',
  'https://i.pravatar.cc/150?img=47',
  'https://i.pravatar.cc/150?img=60',
];

export function EditProfileScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  // States
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || PRESET_AVATARS[0]);
  const [isAvatarModalVisible, setIsAvatarModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ fullName?: string; email?: string }>({});

  const validateForm = useCallback(() => {
    const newErrors: { fullName?: string; email?: string } = {};
    if (!fullName.trim()) {
      newErrors.fullName = t('profile.errNameRequired', 'Full Name is required');
    }
    if (email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        newErrors.email = t('profile.errEmailInvalid', 'Invalid email address');
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [fullName, email, t]);

  const handleSave = useCallback(async () => {
    if (!validateForm()) return;

    setLoading(true);

    // Simulate server update delay
    await new Promise<void>((resolve) => setTimeout(resolve, 800));

    if (user) {
      setUser({
        ...user,
        fullName,
        email: email.trim() ? email : null,
        avatarUrl,
      });
    }

    setLoading(false);
    navigation.goBack();
  }, [fullName, email, avatarUrl, user, setUser, navigation, validateForm]);

  const selectPresetAvatar = (url: string) => {
    setAvatarUrl(url);
    setIsAvatarModalVisible(false);
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        {/* Navigation Top Bar */}
        <View style={styles.topBar}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <ArrowLeft size={24} color={theme.colors.textPrimary} />
          </Pressable>
          <Text style={styles.topBarTitle}>{t('profile.editProfile', 'Edit Profile')}</Text>
          <View style={styles.topBarRightPlaceholder} />
        </View>

        {/* Scrollable Form */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <Pressable
              style={styles.avatarContainer}
              onPress={() => setIsAvatarModalVisible(true)}
            >
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
              <View style={styles.cameraIconBadge}>
                <Camera size={16} color={theme.colors.textInverse} weight="fill" />
              </View>
            </Pressable>
            <Text style={styles.changePhotoText}>
              {t('profile.changePhoto', 'Change Profile Picture')}
            </Text>
          </View>

          {/* Form Fields */}
          <View style={styles.formContainer}>
            <Input
              label={t('profile.fullNameLabel', 'Full Name')}
              value={fullName}
              onChangeText={(text) => {
                setFullName(text);
                if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: undefined }));
              }}
              placeholder={t('profile.fullNamePlaceholder', 'Enter full name')}
              error={errors.fullName}
              required
            />

            <Input
              label={t('profile.emailLabel', 'Email Address')}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
              }}
              placeholder={t('profile.emailPlaceholder', 'Enter email address')}
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
            />

            {/* Read-only Phone Field */}
            <View style={styles.readOnlyContainer}>
              <Text style={styles.readOnlyLabel}>{t('auth.phone', 'Phone Number')}</Text>
              <View style={styles.readOnlyInput}>
                <Text style={styles.readOnlyText}>{user?.phone || '+84 987 654 321'}</Text>
              </View>
              <Text style={styles.readOnlyHint}>
                {t('profile.phoneChangeHint', 'Phone number cannot be changed directly.')}
              </Text>
            </View>
          </View>

          {/* Action Button */}
          <Button
            title={t('common.save', 'Save Changes')}
            onPress={handleSave}
            fullWidth
            style={styles.saveButton}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Preset Avatar Selection Modal */}
      <Modal
        visible={isAvatarModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsAvatarModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setIsAvatarModalVisible(false)}
        >
          <Pressable style={styles.modalContent} onPress={(event) => event.stopPropagation()}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderBar} />
              <Text style={styles.modalTitle}>
                {t('profile.selectAvatar', 'Select Profile Picture')}
              </Text>
            </View>

            <FlatList
              data={PRESET_AVATARS}
              keyExtractor={(item) => item}
              numColumns={3}
              contentContainerStyle={styles.avatarListContent}
              renderItem={({ item }) => {
                const isSelected = item === avatarUrl;
                return (
                  <Pressable
                    style={styles.avatarOptionWrapper}
                    onPress={() => selectPresetAvatar(item)}
                  >
                    <View style={styles.avatarOptionBorder}>
                      <Image source={{ uri: item }} style={styles.presetAvatarImage} />
                      {isSelected ? (
                        <View style={styles.selectedBadge}>
                          <Check size={12} color={theme.colors.textInverse} weight="bold" />
                        </View>
                      ) : null}
                    </View>
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>

      {/* Loading Overlay */}
      {loading ? <LoadingOverlay visible /> : null}
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
    paddingBottom: spacing.xxl,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  avatarContainer: {
    position: 'relative',
    width: 100,
    height: 100,
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
  // Preset Avatar Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.effects.scrim,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurfaceStrong : theme.colors.surface,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    paddingBottom: Platform.OS === 'ios' ? spacing.xxl : spacing.xl,
    maxHeight: '60%',
    borderWidth: 1,
    borderColor: theme.effects.isLiquid ? theme.effects.glassBorderStrong : theme.colors.divider,
    borderBottomWidth: 0,
    ...theme.effects.floatingShadow,
  },
  modalHeader: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.effects.isLiquid ? theme.effects.glassBorder : theme.colors.divider,
  },
  modalHeaderBar: {
    width: 36,
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: borderRadius.full,
    marginBottom: spacing.sm,
  },
  modalTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
  },
  avatarListContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  avatarOptionWrapper: {
    margin: spacing.md,
  },
  avatarOptionBorder: {
    position: 'relative',
    width: 80,
    height: 80,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: theme.effects.isLiquid ? theme.effects.glassBorder : theme.colors.border,
    overflow: 'hidden',
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurfaceSoft : theme.colors.surfaceAlt,
  },
  presetAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: borderRadius.full,
  },
  selectedBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: theme.colors.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
