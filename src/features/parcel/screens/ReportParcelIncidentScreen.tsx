import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StatusBar,
  Text,
  View,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft, ShieldWarning } from 'phosphor-react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ParcelStackParamList } from '@app/navigation/types';
import { AppKeyboardAwareScrollView, Input } from '@shared/components';
import { getLocalizedApiErrorMessage, toApiError } from '@shared/api/errors';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import {
  borderRadius,
  fontFamilies,
  fontSizes,
  spacing,
  type AppTheme,
} from '@shared/theme';
import { useReportParcelIncident } from '../hooks/useParcelReliabilityQueries';
import type { ParcelIncidentType } from '../types';
import { PARCEL_ERROR_TRANSLATION_KEYS } from '../utils/parcelPresentation';


type IncidentRoute = RouteProp<ParcelStackParamList, 'ReportParcelIncident'>;
type IncidentNavigation = NativeStackNavigationProp<
  ParcelStackParamList,
  'ReportParcelIncident'
>;

// The endpoint allows a nullable description. Passenger requires one so the
// operator receives an actionable report while preserving the 2,000-character limit.
const DESCRIPTION_MAX_LENGTH = 2_000;
// BE shares one incident enum across USER/SYSTEM/ASSISTANT reporters, but v1.98.1
// explicitly accepts only these three values from a Passenger caller.
const PASSENGER_REPORTABLE_INCIDENT_TYPES = [
  'DELIVERY_NOT_RECEIVED',
  'PARTIAL_LOSS',
  'DAMAGED',
] as const satisfies readonly ParcelIncidentType[];

export function ReportParcelIncidentScreen(): React.JSX.Element {
  const route = useRoute<IncidentRoute>();
  const navigation = useNavigation<IncidentNavigation>();
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const [incidentType, setIncidentType] = useState<ParcelIncidentType>(
    'DELIVERY_NOT_RECEIVED',
  );
  const [description, setDescription] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const mutation = useReportParcelIncident(route.params.parcelId);

  const trimmedDescription = description.trim();
  const canSubmit = trimmedDescription.length > 0
    && trimmedDescription.length <= DESCRIPTION_MAX_LENGTH
    && !mutation.isPending;
  const visibleError = useMemo(() => {
    if (fieldError) return fieldError;
    if (description.length > DESCRIPTION_MAX_LENGTH) {
      return t('parcel.incident.descriptionTooLong');
    }
    return null;
  }, [description.length, fieldError, t]);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) {
      setFieldError(t('parcel.incident.descriptionRequired'));
      return;
    }
    setFieldError(null);
    try {
      await mutation.mutateAsync({
        parcelId: route.params.parcelId,
        incidentType,
        description: trimmedDescription,
        evidenceUrls: [],
      });
      Alert.alert(
        t('parcel.incident.successTitle'),
        t('parcel.incident.successDescription'),
        [{ text: t('common.ok'), onPress: () => navigation.goBack() }],
      );
    } catch (error) {
      const apiError = toApiError(error);
      const descriptionError = apiError.fields.find((field) => (
        field.field.toLowerCase() === 'description'
      ));
      if (descriptionError) {
        setFieldError(t('parcel.incident.descriptionInvalid'));
        return;
      }
      Alert.alert(
        t('parcel.incident.errorTitle'),
        getLocalizedApiErrorMessage(error, t, PARCEL_ERROR_TRANSLATION_KEYS),
      );
    }
  }, [
    canSubmit,
    incidentType,
    mutation,
    navigation,
    route.params.parcelId,
    t,
    trimmedDescription,
  ]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
        >
          <ArrowLeft size={24} color={theme.colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('parcel.incident.title')}</Text>
        <View style={styles.headerButton} />
      </View>
      <AppKeyboardAwareScrollView
        style={styles.body}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
          <View style={styles.introCard}>
            <ShieldWarning size={28} color={theme.colors.warningForeground} weight="duotone" />
            <View style={styles.introCopy}>
              <Text style={styles.introTitle}>{t('parcel.incident.introTitle')}</Text>
              <Text style={styles.introText}>{t('parcel.incident.introDescription')}</Text>
            </View>
          </View>

          <Text style={styles.label}>{t('parcel.incident.typeLabel')}</Text>
          <View style={styles.chips}>
            {PASSENGER_REPORTABLE_INCIDENT_TYPES.map((type) => {
              const selected = type === incidentType;
              return (
                <Pressable
                  key={type}
                  testID={`parcel-incident-type-${type}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setIncidentType(type)}
                  style={[styles.chip, selected ? styles.chipSelected : null]}
                >
                  <Text style={[styles.chipText, selected ? styles.chipTextSelected : null]}>
                    {t(`parcel.incident.types.${type}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Input
            required
            multiline
            numberOfLines={6}
            maxLength={DESCRIPTION_MAX_LENGTH + 1}
            label={t('parcel.incident.descriptionLabel')}
            placeholder={t('parcel.incident.descriptionPlaceholder')}
            hint={t('parcel.incident.descriptionHint')}
            error={visibleError ?? undefined}
            value={description}
            onChangeText={(value) => {
              setDescription(value);
              if (fieldError) setFieldError(null);
            }}
            inputStyle={styles.textArea}
            textAlignVertical="top"
          />


          <Pressable
            testID="parcel-incident-submit"
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSubmit }}
            disabled={!canSubmit}
            onPress={() => { handleSubmit().catch(() => undefined); }}
            style={({ pressed }) => [
              styles.submitButton,
              !canSubmit ? styles.submitDisabled : null,
              pressed && canSubmit ? styles.pressed : null,
            ]}
          >
            {mutation.isPending ? (
              <ActivityIndicator color={theme.colors.textInverse} />
            ) : (
              <Text style={styles.submitText}>{t('parcel.incident.submit')}</Text>
            )}
          </Pressable>
      </AppKeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) => ({
  container: { flex: 1, backgroundColor: theme.colors.background },
  body: { flex: 1 },
  header: {
    minHeight: 56,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  headerButton: { width: 44, height: 44, flexShrink: 0, alignItems: 'center' as const, justifyContent: 'center' as const },
  headerTitle: { flex: 1, minWidth: 0, paddingHorizontal: spacing.sm, color: theme.colors.textPrimary, fontFamily: fontFamilies.bold, fontSize: fontSizes.lg, textAlign: 'center' as const },
  content: { flexGrow: 1, padding: spacing.xl, paddingBottom: spacing.huge },
  introCard: {
    flexDirection: 'row' as const,
    gap: spacing.md,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderRadius: borderRadius.lg,
    backgroundColor: theme.colors.warningLight,
  },
  introCopy: { flex: 1, minWidth: 0 },
  introTitle: { color: theme.colors.textPrimary, fontFamily: fontFamilies.bold, fontSize: fontSizes.md },
  introText: { marginTop: spacing.xs, color: theme.colors.textSecondary, fontFamily: fontFamilies.regular, fontSize: fontSizes.sm, lineHeight: 20 },
  label: { color: theme.colors.textPrimary, fontFamily: fontFamilies.medium, fontSize: fontSizes.sm, marginBottom: spacing.sm },
  chips: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: spacing.sm, marginBottom: spacing.xl },
  chip: {
    maxWidth: '100%',
    minWidth: 0,
    minHeight: 44,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    borderRadius: borderRadius.full,
  },
  chipSelected: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryFaded },
  chipText: {
    minWidth: 0,
    flexShrink: 1,
    color: theme.colors.textSecondary,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    lineHeight: 18,
    textAlign: 'center' as const,
  },
  chipTextSelected: { color: theme.colors.primary },
  textArea: { minHeight: 132, paddingTop: spacing.md },
  submitButton: { minHeight: 50, alignItems: 'center' as const, justifyContent: 'center' as const, borderRadius: borderRadius.md, backgroundColor: theme.colors.primary },
  submitDisabled: { opacity: 0.45 },
  submitText: { minWidth: 0, flexShrink: 1, paddingHorizontal: spacing.sm, color: theme.colors.textInverse, fontFamily: fontFamilies.bold, fontSize: fontSizes.md, textAlign: 'center' as const },
  pressed: { opacity: 0.8 },
});
