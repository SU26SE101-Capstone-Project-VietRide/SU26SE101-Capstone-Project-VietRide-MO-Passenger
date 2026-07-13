import React from 'react';
import { View, Text, Image } from 'react-native';
import { fontFamilies, fontSizes, spacing } from '@shared/theme';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';

const catMascotImage = require('@assets/images/image 1.png');

export interface StepHeaderWithMascotProps {
  step: number;
}

export const StepHeaderWithMascot = ({ step }: StepHeaderWithMascotProps): React.JSX.Element => {
  const styles = useThemedStyles(createStyles);
  const heading = (() => {
    switch (step) {
      case 1: return 'Choose Sending Station';
      case 2: return 'Choose Receiving Station';
      case 3: return 'Tell us about your package';
      case 4: return 'Order Summary';
      default: return 'Create Parcel';
    }
  })();

  const subtext = (() => {
    switch (step) {
      case 1: return 'Where will you drop off your parcel?';
      case 2: return 'Where should the recipient pick up?';
      case 3: return 'Help us find the right vehicle for you.';
      case 4: return 'Confirm details and make payment.';
      default: return '';
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
        resizeMode="contain"
      />
    </View>
  );
};

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
    fontSize: 22,
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
