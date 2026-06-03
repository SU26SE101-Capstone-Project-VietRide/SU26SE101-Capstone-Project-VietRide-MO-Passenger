import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ArrowLeft, Sliders, X, Check } from 'phosphor-react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@app/navigation/types';
import { colors, fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';

type RootNavProp = NativeStackNavigationProp<RootStackParamList>;

export interface StepProgressBarProps {
  step: number;
  onCancel: () => void;
  onFilter?: () => void;
}

export const StepProgressBar = ({ step, onCancel, onFilter = () => {} }: StepProgressBarProps): React.JSX.Element => {
  const handleFilter = onFilter;

  return (
    <View style={styles.navbar}>
      {/* Row 1: Header Controls */}
      <View style={styles.navHeaderRow}>
        <TouchableOpacity style={styles.navButtonLeft} onPress={onCancel} activeOpacity={0.7}>
          <ArrowLeft size={18} color="#006A67" />
        </TouchableOpacity>

        <View style={styles.navHeaderTitleContainer}>
          {(step === 1 || step === 2) ? (
            <>
              <Text style={styles.navSubtitleTeal}>3 Stations</Text>
              <Text style={styles.navTitleLarge}>Ho Chi Minh ➔ Sapa</Text>
            </>
          ) : (
            <View style={styles.navTitleCenter} />
          )}
        </View>

        {(step === 1 || step === 2) ? (
          <TouchableOpacity style={styles.navButtonRight} onPress={handleFilter} activeOpacity={0.7}>
            <Sliders size={18} color="#FFF" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.navButtonCancel} onPress={onCancel} activeOpacity={0.7}>
            <X size={18} color="#006A67" />
          </TouchableOpacity>
        )}
      </View>

      {/* Row 2: Compact Steps Tracker */}
      <View style={styles.progressContainerInsideNavbar}>
        <View style={styles.progressBarBgInsideNavbar}>
          <View
            style={[
              styles.progressBarActiveInsideNavbar,
              { width: `${((step - 1) / 3) * 100}%` },
            ]}
          />
        </View>
        <View style={styles.stepsRowInsideNavbar}>
          {[1, 2, 3, 4].map((s) => {
            const isActive = s === step;
            const isCompleted = s < step;
            return (
              <View key={`step-${s}`} style={styles.stepBubbleContainerInsideNavbar}>
                <View
                  style={[
                    styles.stepBubbleInsideNavbar,
                    isActive && styles.stepBubbleActiveInsideNavbar,
                    isCompleted && styles.stepBubbleCompletedInsideNavbar,
                  ]}
                >
                  {isCompleted ? (
                    <Check size={12} color="#006A67" weight="bold" />
                  ) : (
                    <Text
                      style={[
                        styles.stepTextInsideNavbar,
                        isActive && styles.stepTextActiveInsideNavbar,
                        isCompleted && styles.stepTextCompletedInsideNavbar,
                      ]}
                    >
                      {s}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  navbar: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  navHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  navButtonLeft: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(0, 106, 103, 0.18)',
  },
  navButtonRight: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#006A67',
  },
  navButtonCancel: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(0, 106, 103, 0.18)',
  },
  navHeaderTitleContainer: {
    alignItems: 'center',
    flex: 1,
  },
  navTitleCenter: {
    height: 20,
  },
  navTitleLarge: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: '#FFFFFF',
  },
  navSubtitleTeal: {
    fontFamily: fontFamilies.medium,
    fontSize: 10,
    color: '#B2F0EC',
    marginBottom: 2,
  },
  progressContainerInsideNavbar: {
    marginTop: spacing.xs,
  },
  progressBarBgInsideNavbar: {
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  progressBarActiveInsideNavbar: {
    height: '100%',
    borderRadius: 1.5,
    backgroundColor: '#FFFFFF',
  },
  stepsRowInsideNavbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepBubbleContainerInsideNavbar: {
    alignItems: 'center',
  },
  stepBubbleInsideNavbar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBubbleActiveInsideNavbar: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  stepBubbleCompletedInsideNavbar: {
    backgroundColor: '#FFFFFF',
  },
  stepTextInsideNavbar: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs,
    color: '#FFFFFF',
  },
  stepTextActiveInsideNavbar: {
    color: '#006A67',
  },
  stepTextCompletedInsideNavbar: {
    color: '#006A67',
  },
});
