/**
 * RegisterScreen — Account creation flow
 */

import React, { useState, useCallback } from 'react';
import {
View,
Text,
StyleSheet,
ScrollView,
StatusBar,
TouchableOpacity,
KeyboardAvoidingView,
Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GoogleLogo, AppleLogo, FacebookLogo } from 'phosphor-react-native';
import { colors, fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { Input, Button } from '@shared/components';
import type { AuthStackParamList } from '@app/navigation/types';

type NavProp = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

export function RegisterScreen(): React.JSX.Element {
const navigation = useNavigation<NavProp>();

const [fullName, setFullName] = useState('');
const [phone, setPhone] = useState('');
const [password, setPassword] = useState('');

const handleRegister = useCallback(() => {
navigation.navigate('OTPVerification', { phone });
}, [navigation, phone]);

return (
<SafeAreaView style={styles.safe}>
<StatusBar barStyle="dark-content" backgroundColor="#F7F9FF" />
<View style={styles.ambientGlow} />

{/* Header Back Button */}
<View style={styles.navHeader}>
<TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
<Text style={styles.backIcon}>←</Text>
</TouchableOpacity>
</View>

<KeyboardAvoidingView
style={styles.keyboardView}
behavior={Platform.OS === 'ios' ? 'padding' : undefined}
>
<ScrollView
showsVerticalScrollIndicator={false}
contentContainerStyle={styles.scrollContent}
>
{/* Header */}
<View style={styles.header}>
<Text style={styles.title}>Join the ride 🚌</Text>
<Text style={styles.subtitle}>
Create an account to book and track your journeys.
</Text>
</View>

{/* Form */}
<View style={styles.formContainer}>
<Input
label="Full Name"
placeholder="e.g. Nguyen Van A"
autoCapitalize="words"
textContentType="name"
autoComplete="name"
value={fullName}
onChangeText={setFullName}
/>

<Input
label="Phone Number"
placeholder="Enter your phone number"
keyboardType="phone-pad"
textContentType="telephoneNumber"
autoComplete="tel"
value={phone}
onChangeText={setPhone}
/>

<Input
label="Password"
placeholder="Create a strong password"
secureTextEntry
textContentType="password"
autoComplete="password"
value={password}
onChangeText={setPassword}
containerStyle={{ marginBottom: spacing.xl }}
/>

<Button
title="Create Account"
onPress={handleRegister}
/>

<Text style={styles.termsText}>
By creating an account, you agree to our{' '}
<Text style={styles.termsLink}>Terms of Service</Text> and{' '}
<Text style={styles.termsLink}>Privacy Policy</Text>.
</Text>

{/* Divider */}
<View style={styles.dividerContainer}>
<View style={styles.dividerLine} />
<Text style={styles.dividerText}>or continue with</Text>
<View style={styles.dividerLine} />
</View>

{/* Social Auth — icon only, circular brand buttons */}
<View style={styles.socialContainer}>
<TouchableOpacity style={[styles.socialButton, { backgroundColor: '#FFFFFF', borderColor: '#D1D5DB' }]}>
<GoogleLogo size={22} color="#4285F4" weight="bold" />
</TouchableOpacity>
<TouchableOpacity style={[styles.socialButton, { backgroundColor: '#000000' }]}>
<AppleLogo size={24} color="#FFFFFF" weight="bold" />
</TouchableOpacity>
<TouchableOpacity style={[styles.socialButton, { backgroundColor: '#1877F2' }]}>
<FacebookLogo size={22} color="#FFFFFF" weight="fill" />
</TouchableOpacity>
</View>
</View>
</ScrollView>

{/* Footer */}
<View style={styles.footer}>
<Text style={styles.footerText}>Already have an account? </Text>
<TouchableOpacity onPress={() => navigation.navigate('Login')}>
<Text style={styles.footerLink}>Log in</Text>
</TouchableOpacity>
</View>
</KeyboardAvoidingView>
</SafeAreaView>
);
}

const styles = StyleSheet.create({
safe: {
flex: 1,
backgroundColor: '#F7F9FF',
},
ambientGlow: {
position: 'absolute',
backgroundColor: 'rgba(42, 193, 188, 0.12)',
width: 585,
height: 585,
borderRadius: 9999,
top: -176.8,
left: -97.5,
zIndex: 0,
},
navHeader: {
height: 56,
justifyContent: 'center',
paddingHorizontal: spacing.xl,
},
backButton: {
width: 40,
height: 40,
borderRadius: borderRadius.full,
justifyContent: 'center',
},
backIcon: {
fontSize: 24,
color: colors.textPrimary,
fontFamily: fontFamilies.bold,
},
keyboardView: {
flex: 1,
},
scrollContent: {
flexGrow: 1,
paddingHorizontal: spacing.xl,
paddingTop: spacing.lg,
paddingBottom: spacing.xxl,
},
header: {
marginBottom: 40,
},
title: {
fontFamily: fontFamilies.bold,
fontSize: fontSizes.h1,
color: colors.textPrimary,
marginBottom: spacing.sm,
},
subtitle: {
fontFamily: fontFamilies.regular,
fontSize: fontSizes.lg,
color: colors.textSecondary,
lineHeight: fontSizes.lg * 1.5,
},
formContainer: {
marginBottom: spacing.xxl,
},
termsText: {
fontFamily: fontFamilies.regular,
fontSize: fontSizes.sm,
color: colors.textTertiary,
textAlign: 'center',
marginTop: spacing.xl,
lineHeight: fontSizes.sm * 1.5,
},
termsLink: {
color: colors.primary,
fontFamily: fontFamilies.medium,
},
dividerContainer: {
flexDirection: 'row',
alignItems: 'center',
marginTop: spacing.lg,
marginBottom: spacing.xxl,
},
dividerLine: {
flex: 1,
height: 1,
backgroundColor: colors.divider,
},
dividerText: {
fontFamily: fontFamilies.regular,
fontSize: fontSizes.sm,
color: colors.textTertiary,
marginHorizontal: spacing.md,
},
socialContainer: {
flexDirection: 'row',
gap: spacing.md,
justifyContent: 'center',
},
socialButton: {
width: 52,
height: 52,
borderRadius: 26,
alignItems: 'center',
justifyContent: 'center',
borderWidth: 1.5,
shadowColor: '#000',
shadowOffset: { width: 0, height: 1 },
shadowOpacity: 0.08,
shadowRadius: 3,
elevation: 2,
},
footer: {
flexDirection: 'row',
justifyContent: 'center',
paddingVertical: spacing.xl,
borderTopWidth: 1,
borderTopColor: colors.divider,
backgroundColor: '#F7F9FF',
},
footerText: {
fontFamily: fontFamilies.regular,
fontSize: fontSizes.md,
color: colors.textSecondary,
},
footerLink: {
fontFamily: fontFamilies.bold,
fontSize: fontSizes.md,
color: colors.primary,
},
});
