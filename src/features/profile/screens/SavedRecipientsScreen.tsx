import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import {
  AddressBook,
  ArrowLeft,
  MagnifyingGlass,
  PencilSimple,
  Plus,
  Star,
  Trash,
  X,
} from 'phosphor-react-native';

import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';
import { borderRadius, fontFamilies, fontSizes, spacing } from '@shared/theme';
import { Button } from '@shared/components/Button';
import { SavedRecipientsModal } from '@features/parcel/components/SavedRecipientsModal';
import {
  selectSortedRecipients,
  useSavedRecipientsStore,
} from '@features/parcel/store/useSavedRecipientsStore';
import type { SavedRecipient } from '@features/parcel/types/savedRecipient';

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'VR';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export function SavedRecipientsScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { t } = useTranslation();

  const recipients = useSavedRecipientsStore(state => state.recipients);
  const isLoaded = useSavedRecipientsStore(state => state.isLoaded);
  const loadRecipients = useSavedRecipientsStore(state => state.loadRecipients);
  const deleteRecipient = useSavedRecipientsStore(state => state.deleteRecipient);

  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    if (!isLoaded) {
      void loadRecipients();
    }
  }, [isLoaded, loadRecipients]);

  const sortedRecipients = useMemo(() => {
    return selectSortedRecipients(recipients);
  }, [recipients]);

  const filteredRecipients = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sortedRecipients;
    return sortedRecipients.filter(
      r =>
        r.fullName.toLowerCase().includes(q) ||
        r.phoneNumber.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        (r.customLabel && r.customLabel.toLowerCase().includes(q)),
    );
  }, [sortedRecipients, searchQuery]);

  const handleDeleteRecipient = useCallback(
    (recipient: SavedRecipient) => {
      Alert.alert(
        t('parcel.recipients.delete'),
        t('parcel.recipients.deleteConfirm'),
        [
          { text: t('parcel.recipients.cancel'), style: 'cancel' },
          {
            text: t('parcel.recipients.delete'),
            style: 'destructive',
            onPress: () => {
              void deleteRecipient(recipient.id);
            },
          },
        ],
      );
    },
    [deleteRecipient, t],
  );

  const renderItem = useCallback(
    ({ item }: { item: SavedRecipient }) => {
      const initials = getInitials(item.fullName);
      const labelText =
        item.label === 'other' && item.customLabel
          ? item.customLabel
          : item.label
            ? t(`parcel.recipients.label${item.label.charAt(0).toUpperCase() + item.label.slice(1)}`)
            : null;

      return (
        <View style={styles.recipientCard} testID={`saved-recipient-row-${item.id}`}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>

          <View style={styles.cardDetails}>
            <View style={styles.nameRow}>
              <Text style={styles.cardName} numberOfLines={1}>
                {item.fullName}
              </Text>
              {item.isDefault ? (
                <View style={styles.defaultBadge}>
                  <Star size={11} color={theme.colors.warningForeground} weight="fill" />
                  <Text style={styles.defaultBadgeText}>
                    {t('parcel.recipients.defaultTag')}
                  </Text>
                </View>
              ) : null}
            </View>

            <Text style={styles.cardPhone}>{item.phoneNumber}</Text>

            {item.email ? (
              <Text style={styles.cardEmail}>{item.email}</Text>
            ) : null}

            {labelText ? (
              <View style={styles.labelBadge}>
                <Text style={styles.labelBadgeText}>{labelText}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.cardActions}>
            <Pressable
              style={styles.iconButton}
              onPress={() => setModalVisible(true)}
              accessibilityLabel={t('parcel.recipients.editTitle')}
            >
              <PencilSimple size={18} color={theme.colors.textSecondary} />
            </Pressable>

            <Pressable
              style={styles.iconButton}
              onPress={() => handleDeleteRecipient(item)}
              accessibilityLabel={t('parcel.recipients.delete')}
            >
              <Trash size={18} color={theme.colors.error} />
            </Pressable>
          </View>
        </View>
      );
    },
    [handleDeleteRecipient, theme, styles, t],
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />

      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <ArrowLeft size={24} color={theme.colors.textPrimary} weight="bold" />
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{t('parcel.recipients.title')}</Text>
        </View>

        <Pressable
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
          accessibilityRole="button"
          accessibilityLabel={t('parcel.recipients.addNew')}
        >
          <Plus size={18} color={theme.colors.primary} weight="bold" />
          <Text style={styles.addButtonText}>{t('parcel.recipients.addNew')}</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView style={styles.keyboardContainer} behavior="padding">
        {/* Search Input */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <MagnifyingGlass
              size={18}
              color={theme.colors.textTertiary}
              weight="bold"
            />
            <TextInput
              style={styles.searchInput}
              placeholder={t('parcel.recipients.searchPlaceholder')}
              placeholderTextColor={theme.colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              autoCorrect={false}
            />
            {searchQuery ? (
              <Pressable onPress={() => setSearchQuery('')}>
                <X size={16} color={theme.colors.textSecondary} />
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* List */}
        <FlatList
          data={filteredRecipients}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <AddressBook
                  size={44}
                  color={theme.colors.primary}
                  weight="duotone"
                />
              </View>
              <Text style={styles.emptyTitle}>
                {t('parcel.recipients.emptyTitle')}
              </Text>
              <Text style={styles.emptySubtitle}>
                {t('parcel.recipients.emptySubtitle')}
              </Text>
              <Button
                title={t('parcel.recipients.addNew')}
                onPress={() => setModalVisible(true)}
                variant="primary"
                size="md"
                style={styles.emptyAddButton}
              />
            </View>
          }
        />
      </KeyboardAvoidingView>

      {/* Modal for adding/editing */}
      <SavedRecipientsModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        mode="manage"
      />
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) => ({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    paddingHorizontal: spacing.sm,
  },
  headerTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    color: theme.colors.textPrimary,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.primaryFaded,
  },
  addButtonText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs,
    color: theme.colors.primary,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    height: 42,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchInput: {
    flex: 1,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
    paddingVertical: 0,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    flexGrow: 1,
  },
  recipientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primaryFaded,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: theme.colors.primary,
  },
  cardDetails: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  cardName: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
    flexShrink: 1,
  },
  defaultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
    backgroundColor: theme.colors.warningLight,
  },
  defaultBadgeText: {
    fontFamily: fontFamilies.bold,
    fontSize: 9,
    color: theme.colors.warningForeground,
  },
  cardPhone: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
  },
  cardEmail: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
  },
  labelBadge: {
    alignSelf: 'flex-start',
    marginTop: 2,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 3,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  labelBadgeText: {
    fontFamily: fontFamilies.medium,
    fontSize: 10,
    color: theme.colors.textSecondary,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primaryFaded,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  emptyTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
    lineHeight: fontSizes.xs * 1.4,
  },
  emptyAddButton: {
    marginTop: spacing.md,
    minWidth: 160,
  },
});
