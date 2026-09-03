import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import {
  AddressBook,
  ArrowLeft,
  Check,
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
import { AppKeyboardAwareScrollView } from '@shared/components/AppKeyboardAwareScrollView';
import { SnackbarCard } from '@shared/components/SnackbarCard';
import { Button } from '@shared/components/Button';
import { Input } from '@shared/components/Input';
import {
  showSnackbar,
  type SnackbarPayload,
} from '@shared/store/useSnackbarStore';
import {
  isValidEmail,
  isValidVietnamPhone,
  normalizeVietnamPhone,
} from '@features/auth/validation/authValidation';
import {
  getSavedRecipientsErrorKey,
  selectSortedRecipients,
  useSavedRecipientsStore,
} from '../store/useSavedRecipientsStore';
import type {
  RecipientLabel,
  SavedRecipient,
} from '../types/savedRecipient';

export interface SavedRecipientsModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectRecipient?: (recipient: SavedRecipient) => void;
  selectedRecipientId?: string | null;
  mode?: 'picker' | 'manage';
  initialEditRecipientId?: string | null;
}

const LABELS: { key: RecipientLabel; i18nKey: string }[] = [
  { key: 'home', i18nKey: 'parcel.recipients.labelHome' },
  { key: 'office', i18nKey: 'parcel.recipients.labelOffice' },
  { key: 'family', i18nKey: 'parcel.recipients.labelFamily' },
  { key: 'customer', i18nKey: 'parcel.recipients.labelCustomer' },
  { key: 'other', i18nKey: 'parcel.recipients.labelOther' },
];

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'VR';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const recipientKeyExtractor = (item: SavedRecipient): string => item.id;

function SavedRecipientsModalComponent({
  visible,
  onClose,
  onSelectRecipient,
  selectedRecipientId,
  mode = 'picker',
  initialEditRecipientId = null,
}: SavedRecipientsModalProps): React.JSX.Element {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const recipients = useSavedRecipientsStore(state => state.recipients);
  const hydrationStatus = useSavedRecipientsStore(state => state.hydrationStatus);
  const loadRecipients = useSavedRecipientsStore(state => state.loadRecipients);
  const addRecipient = useSavedRecipientsStore(state => state.addRecipient);
  const updateRecipient = useSavedRecipientsStore(state => state.updateRecipient);
  const deleteRecipient = useSavedRecipientsStore(state => state.deleteRecipient);
  const restoreRecipient = useSavedRecipientsStore(state => state.restoreRecipient);
  const touchRecipient = useSavedRecipientsStore(state => state.touchRecipient);

  const [searchQuery, setSearchQuery] = useState('');
  const [formMode, setFormMode] = useState<'list' | 'add' | 'edit'>('list');
  const [editingRecipient, setEditingRecipient] = useState<SavedRecipient | null>(null);
  const [localFeedback, setLocalFeedback] = useState<SnackbarPayload | null>(null);
  const initialEditAppliedRef = useRef(false);

  // Form states
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formLabel, setFormLabel] = useState<RecipientLabel | undefined>(undefined);
  const [formCustomLabel, setFormCustomLabel] = useState('');
  const [formIsDefault, setFormIsDefault] = useState(false);
  const [formErrors, setFormErrors] = useState<{
    name?: string;
    phone?: string;
    email?: string;
  }>({});

  const showLocalError = useCallback((error: unknown) => {
    setLocalFeedback({
      message: t(getSavedRecipientsErrorKey(error)),
      tone: 'error',
    });
  }, [t]);

  useEffect(() => {
    if (visible && hydrationStatus === 'idle') {
      loadRecipients().catch(showLocalError);
    }
  }, [visible, hydrationStatus, loadRecipients, showLocalError]);

  // Reset view state when modal closes
  useEffect(() => {
    if (!visible) {
      initialEditAppliedRef.current = false;
      setSearchQuery('');
      setFormMode('list');
      setEditingRecipient(null);
      setFormErrors({});
      setLocalFeedback(null);
    }
  }, [visible]);

  useEffect(() => {
    if (!localFeedback) return;
    const timer = setTimeout(
      () => setLocalFeedback(null),
      localFeedback.durationMs ?? (localFeedback.action ? 6000 : 3600),
    );
    return () => clearTimeout(timer);
  }, [localFeedback]);

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

  const handleOpenAddForm = useCallback(() => {
    setFormName('');
    setFormPhone('');
    setFormEmail('');
    setFormLabel(undefined);
    setFormCustomLabel('');
    setFormIsDefault(false);
    setFormErrors({});
    setEditingRecipient(null);
    setFormMode('add');
  }, []);

  const handleOpenEditForm = useCallback((recipient: SavedRecipient) => {
    setFormName(recipient.fullName);
    setFormPhone(recipient.phoneNumber);
    setFormEmail(recipient.email);
    setFormLabel(recipient.label);
    setFormCustomLabel(recipient.customLabel ?? '');
    setFormIsDefault(Boolean(recipient.isDefault));
    setFormErrors({});
    setEditingRecipient(recipient);
    setFormMode('edit');
  }, []);

  useEffect(() => {
    if (
      !visible
      || !initialEditRecipientId
      || hydrationStatus !== 'ready'
      || initialEditAppliedRef.current
    ) return;

    const recipient = recipients.find(item => item.id === initialEditRecipientId);
    initialEditAppliedRef.current = true;
    if (recipient) {
      handleOpenEditForm(recipient);
    }
  }, [
    handleOpenEditForm,
    initialEditRecipientId,
    hydrationStatus,
    recipients,
    visible,
  ]);

  const handleSaveForm = useCallback(async () => {
    const nextErrors: { name?: string; phone?: string; email?: string } = {};

    if (!formName.trim()) {
      nextErrors.name = t('parcel.validation.recipientNameRequired');
    }

    if (!formPhone.trim()) {
      nextErrors.phone = t('parcel.validation.recipientPhoneRequired');
    } else if (!isValidVietnamPhone(formPhone)) {
      nextErrors.phone = t('parcel.validation.invalidVietnamPhone');
    }

    if (formEmail.trim() && !isValidEmail(formEmail)) {
      nextErrors.email = t('parcel.validation.invalidRecipientEmail');
    }

    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors);
      return;
    }

    try {
      if (formMode === 'add') {
        const created = await addRecipient({
          fullName: formName.trim(),
          phoneNumber: normalizeVietnamPhone(formPhone),
          email: formEmail.trim(),
          label: formLabel,
          customLabel: formLabel === 'other' ? formCustomLabel.trim() : undefined,
          isDefault: formIsDefault,
        });

        if (mode === 'picker' && onSelectRecipient) {
          onSelectRecipient(created);
          onClose();
          showSnackbar({
            message: t('parcel.recipients.savedSuccess'),
            tone: 'success',
          });
          return;
        }

        setLocalFeedback({
          message: t('parcel.recipients.savedSuccess'),
          tone: 'success',
        });
      } else if (formMode === 'edit' && editingRecipient) {
        await updateRecipient(editingRecipient.id, {
          fullName: formName.trim(),
          phoneNumber: normalizeVietnamPhone(formPhone),
          email: formEmail.trim(),
          label: formLabel,
          customLabel: formLabel === 'other' ? formCustomLabel.trim() : undefined,
          isDefault: formIsDefault,
        });
        setLocalFeedback({
          message: t('parcel.recipients.savedSuccess'),
          tone: 'success',
        });
      }
    } catch (error) {
      showLocalError(error);
      return;
    }

    setFormMode('list');
    setEditingRecipient(null);
  }, [
    formName,
    formPhone,
    formEmail,
    formLabel,
    formCustomLabel,
    formIsDefault,
    formMode,
    editingRecipient,
    addRecipient,
    updateRecipient,
    mode,
    onSelectRecipient,
    onClose,
    showLocalError,
    t,
  ]);

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
              deleteRecipient(recipient.id).then(deleted => {
                if (!deleted) return;
                setLocalFeedback({
                  message: t('parcel.recipients.deletedSuccess'),
                  tone: 'neutral',
                  durationMs: 6000,
                  action: {
                    label: t('parcel.recipients.undo'),
                    onPress: () => {
                      restoreRecipient(recipient)
                        .then(() => setLocalFeedback(null))
                        .catch(showLocalError);
                    },
                  },
                });
              }).catch(showLocalError);
            },
          },
        ],
      );
    },
    [deleteRecipient, restoreRecipient, showLocalError, t],
  );

  const handleSelect = useCallback(
    (recipient: SavedRecipient) => {
      touchRecipient(recipient.id).catch(error => {
        showSnackbar({
          message: t(getSavedRecipientsErrorKey(error)),
          tone: 'error',
        });
      });
      if (onSelectRecipient) {
        onSelectRecipient(recipient);
      }
      onClose();
    },
    [touchRecipient, onSelectRecipient, onClose, t],
  );

  const renderRecipientItem = useCallback(
    ({ item }: { item: SavedRecipient }) => {
      const isSelected = item.id === selectedRecipientId;
      const initials = getInitials(item.fullName);
      const labelObj = LABELS.find(l => l.key === item.label);
      const labelText =
        item.label === 'other' && item.customLabel
          ? item.customLabel
          : labelObj
            ? t(labelObj.i18nKey)
            : null;

      return (
        <Pressable
          testID={`saved-recipient-item-${item.id}`}
          style={[
            styles.recipientCard,
            isSelected && styles.recipientCardSelected,
          ]}
          onPress={() => (mode === 'picker' ? handleSelect(item) : handleOpenEditForm(item))}
          accessibilityRole="button"
          accessibilityLabel={`${item.fullName}, ${item.phoneNumber}`}
        >
          {/* Avatar Initials */}
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>

          {/* Details */}
          <View style={styles.cardDetails}>
            <View style={styles.nameRow}>
              <Text
                style={styles.cardName}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
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

            <Text style={styles.cardPhone} numberOfLines={1}>
              {item.phoneNumber}
            </Text>

            {item.email ? (
              <Text style={styles.cardEmail} numberOfLines={1}>
                {item.email}
              </Text>
            ) : null}

            {labelText ? (
              <View style={styles.labelBadge}>
                <Text style={styles.labelBadgeText}>{labelText}</Text>
              </View>
            ) : null}
          </View>

          {/* Actions */}
          <View style={styles.cardActions}>
            {mode === 'picker' ? (
              <Pressable
                testID={`saved-recipient-select-${item.id}`}
                style={[
                  styles.selectButton,
                  isSelected && styles.selectButtonActive,
                ]}
                onPress={event => {
                  event.stopPropagation();
                  handleSelect(item);
                }}
                accessibilityLabel={t('parcel.recipients.useThisRecipient')}
              >
                {isSelected ? (
                  <Check size={16} color={theme.colors.textInverse} weight="bold" />
                ) : (
                  <Text style={styles.selectButtonText}>
                    {t('parcel.recipients.useThisRecipient')}
                  </Text>
                )}
              </Pressable>
            ) : null}

            <Pressable
              testID={`saved-recipient-edit-${item.id}`}
              style={({ pressed }) => [
                styles.iconButton,
                pressed ? styles.iconButtonPressed : null,
              ]}
              onPress={event => {
                event.stopPropagation();
                handleOpenEditForm(item);
              }}
              accessibilityLabel={t('parcel.recipients.editTitle')}
            >
              <PencilSimple size={18} color={theme.colors.textSecondary} />
            </Pressable>

            <Pressable
              testID={`saved-recipient-delete-${item.id}`}
              style={({ pressed }) => [
                styles.iconButton,
                pressed ? styles.iconButtonPressed : null,
              ]}
              onPress={event => {
                event.stopPropagation();
                handleDeleteRecipient(item);
              }}
              accessibilityLabel={t('parcel.recipients.delete')}
            >
              <Trash size={18} color={theme.colors.error} />
            </Pressable>
          </View>
        </Pressable>
      );
    },
    [
      selectedRecipientId,
      mode,
      handleSelect,
      handleOpenEditForm,
      handleDeleteRecipient,
      theme,
      styles,
      t,
    ],
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <KeyboardAvoidingView
          behavior="translate-with-padding"
          style={styles.avoidingView}
        >
          <Pressable
            accessibilityViewIsModal
            onAccessibilityEscape={onClose}
            style={[
              styles.sheetContainer,
              { paddingBottom: Math.max(insets.bottom, spacing.lg) },
            ]}
            onPress={e => e.stopPropagation()}
            testID="saved-recipients-modal"
          >
            {/* Header */}
            <View style={styles.headerRow}>
              {formMode !== 'list' ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.iconButton,
                    pressed ? styles.iconButtonPressed : null,
                  ]}
                  onPress={() => setFormMode('list')}
                  accessibilityLabel={t('parcel.recipients.cancel')}
                >
                  <ArrowLeft size={22} color={theme.colors.textPrimary} weight="bold" />
                </Pressable>
              ) : null}

              <View style={styles.headerTitleCol}>
                <Text style={styles.sheetTitle}>
                  {formMode === 'add'
                    ? t('parcel.recipients.addNew')
                    : formMode === 'edit'
                      ? t('parcel.recipients.editTitle')
                      : t('parcel.recipients.title')}
                </Text>
                {formMode === 'list' ? (
                  <Text style={styles.sheetSubtitle}>
                    {t('parcel.recipients.subtitle')}
                  </Text>
                ) : null}
              </View>

              {formMode === 'list' ? (
                <View style={styles.headerActions}>
                  <Pressable
                    testID="saved-recipients-add-button"
                    style={({ pressed }) => [
                      styles.addHeaderButton,
                      pressed ? styles.iconButtonPressed : null,
                    ]}
                    onPress={handleOpenAddForm}
                    accessibilityLabel={t('parcel.recipients.addNew')}
                  >
                    <Plus size={16} color={theme.colors.primary} weight="bold" />
                    <Text style={styles.addHeaderButtonText}>
                      {t('parcel.recipients.addNew')}
                    </Text>
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [
                      styles.closeButton,
                      pressed ? styles.iconButtonPressed : null,
                    ]}
                    onPress={onClose}
                    accessibilityLabel={t('parcel.recipients.cancel')}
                  >
                    <X size={20} color={theme.colors.textSecondary} />
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  style={({ pressed }) => [
                    styles.closeButton,
                    pressed ? styles.iconButtonPressed : null,
                  ]}
                  onPress={onClose}
                  accessibilityLabel={t('parcel.recipients.cancel')}
                >
                  <X size={20} color={theme.colors.textSecondary} />
                </Pressable>
              )}
            </View>

            {localFeedback ? (
              <View style={styles.localFeedback}>
                <SnackbarCard
                  message={localFeedback.message}
                  tone={localFeedback.tone}
                  action={localFeedback.action}
                  onAction={localFeedback.action ? () => {
                    const action = localFeedback.action;
                    setLocalFeedback(null);
                    action?.onPress();
                  } : undefined}
                  onDismiss={() => setLocalFeedback(null)}
                />
              </View>
            ) : null}

            {/* List Mode */}
            {formMode === 'list' ? (
              <>
                {/* Search Bar */}
                <View style={styles.searchBarContainer}>
                  <MagnifyingGlass
                    size={18}
                    color={theme.colors.textTertiary}
                    weight="bold"
                  />
                  <TextInput
                    testID="saved-recipients-search-input"
                    style={styles.searchInput}
                    placeholder={t('parcel.recipients.searchPlaceholder')}
                    placeholderTextColor={theme.colors.textTertiary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    returnKeyType="search"
                    autoCorrect={false}
                  />
                  {searchQuery ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t('common.clear')}
                      hitSlop={8}
                      onPress={() => setSearchQuery('')}
                      style={({ pressed }) => pressed ? styles.iconButtonPressed : null}
                    >
                      <X size={16} color={theme.colors.textSecondary} />
                    </Pressable>
                  ) : null}
                </View>

                {/* Recipients List */}
                <FlatList
                  data={filteredRecipients}
                  keyExtractor={recipientKeyExtractor}
                  renderItem={renderRecipientItem}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={styles.listContent}
                  showsVerticalScrollIndicator={false}
                  ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                      <View style={styles.emptyIconCircle}>
                        <AddressBook
                          size={40}
                          color={theme.colors.primary}
                          weight="duotone"
                        />
                      </View>
                      <Text style={styles.emptyTitle}>
                        {hydrationStatus === 'error'
                          ? t('parcel.recipients.loadError')
                          : t('parcel.recipients.emptyTitle')}
                      </Text>
                      <Text style={styles.emptySubtitle}>
                        {hydrationStatus === 'error'
                          ? t('parcel.recipients.storageError')
                          : t('parcel.recipients.emptySubtitle')}
                      </Text>
                      <Button
                        title={hydrationStatus === 'error'
                          ? t('parcel.recipients.retry')
                          : t('parcel.recipients.addNew')}
                        onPress={hydrationStatus === 'error'
                          ? () => loadRecipients().catch(showLocalError)
                          : handleOpenAddForm}
                        variant="primary"
                        size="md"
                        style={styles.emptyAddButton}
                      />
                    </View>
                  }
                />
              </>
            ) : (
              /* Add / Edit Form */
              <AppKeyboardAwareScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.formContent}
              >
                <Input
                  label={t('parcel.form.fullNameLabel')}
                  placeholder={t('parcel.form.fullNamePlaceholder')}
                  value={formName}
                  onChangeText={text => {
                    setFormName(text);
                    if (formErrors.name)
                      setFormErrors(e => ({ ...e, name: undefined }));
                  }}
                  error={formErrors.name}
                  required
                  autoCapitalize="words"
                />

                <Input
                  label={t('parcel.form.phoneLabel')}
                  placeholder={t('parcel.form.phonePlaceholder')}
                  value={formPhone}
                  onChangeText={text => {
                    setFormPhone(text);
                    if (formErrors.phone)
                      setFormErrors(e => ({ ...e, phone: undefined }));
                  }}
                  error={formErrors.phone}
                  keyboardType="phone-pad"
                  maxLength={20}
                  required
                />

                <Input
                  label={t('parcel.form.emailLabel')}
                  placeholder={t('parcel.form.emailPlaceholder')}
                  value={formEmail}
                  onChangeText={text => {
                    setFormEmail(text);
                    if (formErrors.email)
                      setFormErrors(e => ({ ...e, email: undefined }));
                  }}
                  error={formErrors.email}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                {/* Labels Chips */}
                <View style={styles.labelsSection}>
                  <Text style={styles.formSectionTitle}>
                    {t('parcel.recipients.label')}
                  </Text>
                  <View style={styles.labelsRow}>
                    {LABELS.map(lbl => {
                      const isSelected = formLabel === lbl.key;
                      return (
                        <Pressable
                          key={lbl.key}
                          accessibilityRole="button"
                          accessibilityState={{ selected: isSelected }}
                          style={({ pressed }) => [
                            styles.labelChip,
                            isSelected ? styles.labelChipSelected : null,
                            pressed ? styles.iconButtonPressed : null,
                          ]}
                          onPress={() =>
                            setFormLabel(prev =>
                              prev === lbl.key ? undefined : lbl.key,
                            )
                          }
                        >
                          <Text
                            style={[
                              styles.labelChipText,
                              isSelected && styles.labelChipTextSelected,
                            ]}
                          >
                            {t(lbl.i18nKey)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  {formLabel === 'other' ? (
                    <Input
                      placeholder={t(
                        'parcel.recipients.customLabelPlaceholder',
                      )}
                      value={formCustomLabel}
                      onChangeText={setFormCustomLabel}
                      maxLength={30}
                      containerStyle={styles.customLabelInput}
                    />
                  ) : null}
                </View>

                {/* Set Default Switch */}
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: formIsDefault }}
                  style={({ pressed }) => [
                    styles.defaultToggleRow,
                    pressed ? styles.iconButtonPressed : null,
                  ]}
                  onPress={() => setFormIsDefault(d => !d)}
                >
                  <View
                    style={[
                      styles.checkboxBox,
                      formIsDefault && styles.checkboxBoxChecked,
                    ]}
                  >
                    {formIsDefault ? (
                      <Check
                        size={14}
                        color={theme.colors.textInverse}
                        weight="bold"
                      />
                    ) : null}
                  </View>
                  <Text style={styles.defaultToggleText}>
                    {t('parcel.recipients.setDefault')}
                  </Text>
                </Pressable>

                {/* Actions */}
                <View style={styles.formActions}>
                  <Button
                    title={t('parcel.recipients.cancel')}
                    onPress={() => setFormMode('list')}
                    variant="outline"
                    size="md"
                    style={styles.formButton}
                  />
                  <Button
                    title={t('parcel.recipients.saveButton')}
                    onPress={handleSaveForm}
                    variant="primary"
                    size="md"
                    style={styles.formButton}
                  />
                </View>
              </AppKeyboardAwareScrollView>
            )}
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

export const SavedRecipientsModal = memo(SavedRecipientsModalComponent);

const createStyles = (theme: AppTheme) => ({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.52)',
    justifyContent: 'flex-end',
  },
  avoidingView: {
    width: '100%',
    maxHeight: '90%',
  },
  sheetContainer: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    maxHeight: '100%',
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  headerTitleCol: {
    flex: 1,
    gap: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sheetTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    color: theme.colors.textPrimary,
  },
  sheetSubtitle: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceAlt,
  },
  addHeaderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    backgroundColor: theme.colors.primaryFaded,
  },
  addHeaderButtonText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs,
    color: theme.colors.primary,
  },
  searchBarContainer: {
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
    paddingVertical: spacing.xs,
    gap: spacing.sm,
    flexGrow: 1,
  },
  recipientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  recipientCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryFaded,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
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
  selectButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    backgroundColor: theme.colors.primaryFaded,
  },
  selectButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  selectButtonText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs,
    color: theme.colors.primary,
  },
  iconButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  iconButtonPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.97 }],
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
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
  formContent: {
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  labelsSection: {
    gap: spacing.xs,
  },
  formSectionTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs,
    color: theme.colors.textPrimary,
  },
  labelsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  labelChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  labelChipSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryFaded,
  },
  labelChipText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
  },
  labelChipTextSelected: {
    fontFamily: fontFamilies.bold,
    color: theme.colors.primary,
  },
  customLabelInput: {
    marginTop: spacing.xs,
  },
  defaultToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  checkboxBoxChecked: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  defaultToggleText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
  formActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  formButton: {
    flex: 1,
  },
  localFeedback: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
});
