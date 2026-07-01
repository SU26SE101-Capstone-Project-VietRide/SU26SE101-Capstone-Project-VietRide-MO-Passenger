import React, { useState } from 'react';
import { View, Text, TextInput, Modal, Pressable } from 'react-native';
import { X } from 'phosphor-react-native';
import { useBookingStore } from '../store/useBookingStore';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import { fontFamilies, fontSizes, spacing, borderRadius, type AppTheme } from '@shared/theme';

interface ContactInfoModalProps {
  visible: boolean;
  onClose: () => void;
}

export function ContactInfoModal({ visible, onClose }: ContactInfoModalProps) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { contactInfo, setContactInfo } = useBookingStore();
  
  const [fullName, setFullName] = useState(contactInfo.fullName);
  const [phone, setPhone] = useState(contactInfo.phone);
  const [email, setEmail] = useState(contactInfo.email);
  const [idNumber, setIdNumber] = useState(contactInfo.idNumber || '');

  const handleSave = () => {
    setContactInfo({ fullName, phone, email, idNumber });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Edit Contact Info</Text>
            <Pressable onPress={onClose}>
              <X size={24} color={theme.colors.textPrimary} />
            </Pressable>
          </View>

          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={fullName}
            onChangeText={setFullName}
            placeholder="Nguyen Van A"
            placeholderTextColor={theme.colors.textTertiary}
          />

          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="0901234567"
            placeholderTextColor={theme.colors.textTertiary}
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            placeholder="email@example.com"
            autoCapitalize="none"
            placeholderTextColor={theme.colors.textTertiary}
          />

          <Text style={styles.label}>ID Number (CCCD/CMND)</Text>
          <TextInput
            style={styles.input}
            value={idNumber}
            onChangeText={setIdNumber}
            keyboardType="numeric"
            placeholder="012345678901"
            placeholderTextColor={theme.colors.textTertiary}
          />

          <Pressable style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Save</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (theme: AppTheme) => ({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    padding: spacing.xl,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    color: theme.colors.textPrimary,
  },
  label: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    color: theme.colors.textPrimary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.md,
    marginBottom: spacing.lg,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  saveButtonText: {
    color: theme.colors.textInverse,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
  },
});
