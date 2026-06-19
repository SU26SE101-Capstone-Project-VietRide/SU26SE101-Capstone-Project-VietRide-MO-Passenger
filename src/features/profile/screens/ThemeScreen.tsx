import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, CheckCircle } from 'phosphor-react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { useThemeStore } from '@shared/store/useThemeStore';
import { themes, ThemeVariant } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';

export function ThemeScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const currentThemeVariant = useThemeStore((state) => state.currentTheme);
  const setTheme = useThemeStore((state) => state.setTheme);
  const theme = useTheme();

  return (
    <SafeAreaView style={[styles.safeContainer, { backgroundColor: theme.isDark ? '#000' : colors.background }]}>
      <View style={[styles.topBar, { backgroundColor: theme.isDark ? '#1C1C1E' : colors.surface, borderBottomColor: theme.isDark ? '#38383A' : colors.divider }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={theme.isDark ? '#FFF' : colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.topBarTitle, { color: theme.isDark ? '#FFF' : colors.textPrimary }]}>Appearance</Text>
        <View style={styles.topBarRightPlaceholder} />
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {Object.entries(themes).map(([key, themeOption]) => (
          <TouchableOpacity 
            key={key} 
            style={[
              styles.themeCard, 
              { backgroundColor: theme.isDark ? '#1C1C1E' : colors.surface },
              currentThemeVariant === key && styles.activeTheme
            ]} 
            onPress={() => setTheme(key as ThemeVariant)}
            activeOpacity={0.7}
          >
            <View style={styles.themeInfo}>
              <Text style={[styles.themeName, { color: theme.isDark ? '#FFF' : colors.textPrimary }]}>{themeOption.name}</Text>
            </View>
            {currentThemeVariant === key && (
              <CheckCircle size={24} color={colors.primary} weight="fill" />
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: { flex: 1 },
  topBar: {
    height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, borderBottomWidth: 1,
  },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  topBarTitle: { fontFamily: fontFamilies.semiBold, fontSize: fontSizes.lg },
  topBarRightPlaceholder: { width: 40 },
  scrollContent: { padding: spacing.xl },
  themeCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.lg, borderRadius: borderRadius.lg, marginBottom: spacing.md,
  },
  activeTheme: {
    borderColor: colors.primary, borderWidth: 2,
  },
  themeInfo: { flex: 1 },
  themeName: { fontFamily: fontFamilies.medium, fontSize: fontSizes.md },
});
