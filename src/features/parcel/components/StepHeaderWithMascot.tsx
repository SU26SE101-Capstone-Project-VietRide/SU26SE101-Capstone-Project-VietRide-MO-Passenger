import React, { memo } from 'react';
import { View, Text } from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { fontFamilies, fontSizes, spacing } from '@shared/theme';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';

const catMascotImage = require('@assets/images/image 1.png');

export interface StepHeaderWithMascotProps {
  step: number;
}

function StepHeaderWithMascotComponent({
  step,
}: StepHeaderWithMascotProps): React.JSX.Element {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);

  const heading = (() => {
    switch (step) {
      case 1:
        return t('parcel.steps.stationDate.heading');
      case 2:
        return t('parcel.steps.package.heading');
      case 3:
        return t('parcel.steps.delivery.heading');
      case 4:
        return t('parcel.steps.confirm.heading');
      default:
        return t('parcel.create.title');
    }
  })();

  const subtext = (() => {
    switch (step) {
      case 1:
        return t('parcel.steps.stationDate.description');
      case 2:
        return t('parcel.steps.package.description');
      case 3:
        return t('parcel.steps.delivery.description');
      case 4:
        return t('parcel.steps.confirm.description');
      default:
        return '';
    }
  })();

  return (
    <View style={styles.stepHeaderWithMascotInsideNavbar}>
      <View style={styles.stepHeaderTextContainer}>
        <Text style={styles.headingInsideNavbar}>{heading}</Text>
        <Text style={styles.subtextInsideNavbar}>{subtext}</Text>
      </View>
      <Image
        source={catMascotImage}
        style={styles.mascotHeadingImageInsideNavbar}
        contentFit="contain"
      />
    </View>
  );
}

export const StepHeaderWithMascot = memo(StepHeaderWithMascotComponent);

const createStyles = (theme: AppTheme) => ({
  stepHeaderWithMascotInsideNavbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  stepHeaderTextContainer: {
    flex: 1.4,
  },
  headingInsideNavbar: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xxl,
    color: theme.colors.primaryDark,
    marginBottom: spacing.xs,
  },
  subtextInsideNavbar: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: theme.colors.textSecondary,
  },
  mascotHeadingImageInsideNavbar: {
    width: 52,
    height: 52,
  },
});
