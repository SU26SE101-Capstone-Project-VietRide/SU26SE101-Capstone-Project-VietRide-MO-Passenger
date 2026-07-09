import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { X } from 'phosphor-react-native';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import { fontFamilies, fontSizes, spacing, borderRadius, type AppTheme } from '@shared/theme';
import { useBookingStore } from '../store/useBookingStore';

interface ContactInfoModalProps {
  visible: boolean;
  onClose: () => void;
}

export function ContactInfoModal({ visible, onClose }: ContactInfoModalProps): React.JSX.Element {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { contactInfo, setContactInfo } = useBookingStore();

  const [fullName, setFullName] = useState(contactInfo.fullName);
  const [phone, setPhone] = useState(contactInfo.phone);
  const [email, setEmail] = useState(contactInfo.email);
  const [idNumber, setIdNumber] = useState(contactInfo.idNumber);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      return;
    }

    setFullName(contactInfo.fullName);
    setPhone(contactInfo.phone);
    setEmail(contactInfo.email);
    setIdNumber(contactInfo.idNumber);
    setValidationError(null);
  }, [
    contactInfo.email,
    contactInfo.fullName,
    contactInfo.idNumber,
    contactInfo.phone,
    visible,
  ]);

  const hasRequiredFields = useMemo(
    () => Boolean(fullName.trim() && phone.trim() && idNumber.trim()),
    [fullName, idNumber, phone],
  );

  const handleSave = useCallback(() => {
    if (!hasRequiredFields) {
      setValidationError('Full name, phone number and ID number are required.');
      return;
    }

    setContactInfo({
      fullName: fullName.trim(),
      phone: phone.trim(),
      email: email.trim(),
      idNumber: idNumber.trim(),
    });
    onClose();
  }, [email, fullName, hasRequiredFields, idNumber, onClose, phone, setContactInfo]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>Edit Contact Info</Text>
              <Text style={styles.subtitle}>ID number is required by the booking service.</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close contact information"
              onPress={onClose}
              style={({ pressed }) => [styles.closeButton, pressed ? styles.closeButtonPressed : null]}
            >
              <X size={20} color={theme.colors.textPrimary} weight="bold" />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.formContent}
          >
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={(text) => {
                setFullName(text);
                setValidationError(null);
              }}
              placeholder="Nguyen Van A"
              placeholderTextColor={theme.colors.textTertiary}
              autoCapitalize="words"
              returnKeyType="next"
            />

            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={(text) => {
                setPhone(text);
                setValidationError(null);
              }}
              keyboardType="phone-pad"
              placeholder="0901234567"
              placeholderTextColor={theme.colors.textTertiary}
              returnKeyType="next"
            />

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              placeholder="email@example.com"
              autoCapitalize="none"
              autoCorrect={false}
              placeholderTextColor={theme.colors.textTertiary}
              returnKeyType="next"
            />

            <View style={styles.requiredLabelRow}>
              <Text style={styles.label}>ID Number (CCCD/CMND)</Text>
              <Text style={styles.requiredBadge}>Required</Text>
            </View>
            <TextInput
              style={styles.input}
              value={idNumber}
              onChangeText={(text) => {
                setIdNumber(text);
                setValidationError(null);
              }}
              keyboardType="number-pad"
              placeholder="012345678901"
              placeholderTextColor={theme.colors.textTertiary}
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />

            {validationError ? (
              <Text style={styles.errorText}>{validationError}</Text>
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Save contact information"
              style={({ pressed }) => [
                styles.saveButton,
                pressed ? styles.saveButtonPressed : null,
              ]}
              onPress={handleSave}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const createStyles = (theme: AppTheme) => ({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: theme.isDark ? 'rgba(1, 10, 10, 0.66)' : 'rgba(19, 33, 31, 0.42)',
  },
  modalContent: {
    maxHeight: '90%',
    backgroundColor: theme.colors.background,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.effects.isLiquid ? theme.effects.glassBorder : theme.colors.divider,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    color: theme.colors.textPrimary,
  },
  subtitle: {
    marginTop: spacing.xs,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurfaceSoft : theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.effects.isLiquid ? theme.effects.glassBorder : theme.colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.96 }],
  },
  formContent: {
    paddingBottom: spacing.xxl,
  },
  label: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: spacing.xs,
  },
  requiredLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  requiredBadge: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.xs,
    color: theme.colors.primary,
    marginBottom: spacing.xs,
  },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: theme.effects.isLiquid ? theme.effects.fieldBorder : theme.colors.border,
    backgroundColor: theme.effects.isLiquid ? theme.effects.fieldSurface : theme.colors.surface,
    color: theme.colors.textPrimary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.md,
    marginBottom: spacing.lg,
  },
  errorText: {
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.error,
    lineHeight: 18,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  saveButtonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  saveButtonText: {
    color: theme.colors.textInverse,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
  },
});
