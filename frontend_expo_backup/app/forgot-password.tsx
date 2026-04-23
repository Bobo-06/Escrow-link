import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

const COLORS = {
  ink: '#0a0a0f',
  gold: '#c8a96e',
  emerald: '#1a7a5a',
  surface: '#f4f3ef',
  textPrimary: '#1a1a2e',
  textSecondary: '#6b7280',
  error: '#dc2626',
};

type Step = 'request' | 'verify' | 'success';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('request');
  const [loginMethod, setLoginMethod] = useState<'phone' | 'email'>('phone');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [demoOtp, setDemoOtp] = useState<string | null>(null);

  const handleRequestOTP = async () => {
    if (loginMethod === 'phone' && (!phone || phone.length < 10)) {
      Alert.alert('Kosa / Error', 'Tafadhali weka nambari ya simu sahihi / Please enter a valid phone number');
      return;
    }
    if (loginMethod === 'email' && (!email || !email.includes('@'))) {
      Alert.alert('Kosa / Error', 'Tafadhali weka barua pepe sahihi / Please enter a valid email');
      return;
    }

    setIsLoading(true);
    try {
      const requestData = loginMethod === 'email' ? { email } : { phone };
      const response = await axios.post(`${API_URL}/api/auth/forgot-password`, requestData);
      
      if (response.data.ok) {
        // Store demo OTP for testing (remove in production)
        if (response.data.demo_otp) {
          setDemoOtp(response.data.demo_otp);
        }
        setStep('verify');
        Alert.alert(
          'Nambari Imetumwa / Code Sent', 
          response.data.message + (response.data.demo_otp ? `\n\nDemo OTP: ${response.data.demo_otp}` : '')
        );
      }
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Imeshindikana kutuma nambari / Failed to send code';
      Alert.alert('Kosa / Error', message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!otp || otp.length !== 6) {
      Alert.alert('Kosa / Error', 'Tafadhali weka nambari ya siri ya tarakimu 6 / Please enter 6-digit code');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      Alert.alert('Kosa / Error', 'Nenosiri liwe na herufi 6 au zaidi / Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Kosa / Error', 'Maneno ya siri hayalingani / Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      const requestData = {
        ...(loginMethod === 'email' ? { email } : { phone }),
        otp,
        new_password: newPassword,
      };
      const response = await axios.post(`${API_URL}/api/auth/reset-password`, requestData);
      
      if (response.data.ok) {
        setStep('success');
      }
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Imeshindikana kubadilisha nenosiri / Failed to reset password';
      Alert.alert('Kosa / Error', message);
    } finally {
      setIsLoading(false);
    }
  };

  const goToLogin = () => {
    if (Platform.OS === 'web') {
      window.location.href = '/login';
    } else {
      router.replace('/login');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <LinearGradient colors={[COLORS.ink, '#1a1a2e']} style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={goToLogin}>
              <Ionicons name="arrow-back" size={24} color={COLORS.surface} />
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <Ionicons name="key-outline" size={48} color={COLORS.gold} />
              <Text style={styles.headerTitle}>
                {step === 'success' ? 'Imefanikiwa!' : 'Umesahau Nenosiri?'}
              </Text>
              <Text style={styles.headerSubtitle}>
                {step === 'request' && 'Forgot Password?'}
                {step === 'verify' && 'Enter Code & New Password'}
                {step === 'success' && 'Password Reset Complete'}
              </Text>
            </View>
          </LinearGradient>

          {/* Content */}
          <View style={styles.content}>
            {step === 'request' && (
              <>
                {/* Method Toggle */}
                <View style={styles.toggleContainer}>
                  <TouchableOpacity
                    style={[styles.toggleButton, loginMethod === 'phone' && styles.toggleActive]}
                    onPress={() => setLoginMethod('phone')}
                  >
                    <Ionicons 
                      name="call-outline" 
                      size={18} 
                      color={loginMethod === 'phone' ? COLORS.surface : COLORS.textSecondary} 
                    />
                    <Text style={[styles.toggleText, loginMethod === 'phone' && styles.toggleTextActive]}>
                      Simu / Phone
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.toggleButton, loginMethod === 'email' && styles.toggleActive]}
                    onPress={() => setLoginMethod('email')}
                  >
                    <Ionicons 
                      name="mail-outline" 
                      size={18} 
                      color={loginMethod === 'email' ? COLORS.surface : COLORS.textSecondary} 
                    />
                    <Text style={[styles.toggleText, loginMethod === 'email' && styles.toggleTextActive]}>
                      Barua Pepe / Email
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    {loginMethod === 'phone' ? 'Nambari ya Simu / Phone Number' : 'Barua Pepe / Email'}
                  </Text>
                  {loginMethod === 'phone' ? (
                    <View style={styles.inputWrapper}>
                      <Ionicons name="call-outline" size={20} color={COLORS.textSecondary} />
                      <TextInput
                        style={styles.input}
                        placeholder="+255 7XX XXX XXX"
                        placeholderTextColor={COLORS.textSecondary}
                        value={phone}
                        onChangeText={setPhone}
                        keyboardType="phone-pad"
                        autoComplete="tel"
                      />
                    </View>
                  ) : (
                    <View style={styles.inputWrapper}>
                      <Ionicons name="mail-outline" size={20} color={COLORS.textSecondary} />
                      <TextInput
                        style={styles.input}
                        placeholder="jina@mfano.com"
                        placeholderTextColor={COLORS.textSecondary}
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoComplete="email"
                      />
                    </View>
                  )}
                </View>

                <Text style={styles.helpText}>
                  Tutakutumia nambari ya kubadilisha nenosiri{'\n'}
                  We'll send you a code to reset your password
                </Text>

                <TouchableOpacity
                  style={[styles.submitButton, isLoading && styles.buttonDisabled]}
                  onPress={handleRequestOTP}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color={COLORS.ink} />
                  ) : (
                    <>
                      <Text style={styles.submitButtonText}>Tuma Nambari / Send Code</Text>
                      <Ionicons name="send" size={20} color={COLORS.ink} />
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}

            {step === 'verify' && (
              <>
                {/* OTP Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Nambari ya Siri / Verification Code</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="keypad-outline" size={20} color={COLORS.textSecondary} />
                    <TextInput
                      style={styles.input}
                      placeholder="000000"
                      placeholderTextColor={COLORS.textSecondary}
                      value={otp}
                      onChangeText={setOtp}
                      keyboardType="number-pad"
                      maxLength={6}
                    />
                  </View>
                  {demoOtp && (
                    <Text style={styles.demoOtpText}>Demo OTP: {demoOtp}</Text>
                  )}
                </View>

                {/* New Password */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Nenosiri Jipya / New Password</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="lock-closed-outline" size={20} color={COLORS.textSecondary} />
                    <TextInput
                      style={styles.input}
                      placeholder="••••••••"
                      placeholderTextColor={COLORS.textSecondary}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                      <Ionicons 
                        name={showPassword ? "eye-off-outline" : "eye-outline"} 
                        size={20} 
                        color={COLORS.textSecondary} 
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Confirm Password */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Thibitisha Nenosiri / Confirm Password</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="lock-closed-outline" size={20} color={COLORS.textSecondary} />
                    <TextInput
                      style={styles.input}
                      placeholder="••••••••"
                      placeholderTextColor={COLORS.textSecondary}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showPassword}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.submitButton, isLoading && styles.buttonDisabled]}
                  onPress={handleResetPassword}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color={COLORS.ink} />
                  ) : (
                    <>
                      <Text style={styles.submitButtonText}>Badilisha Nenosiri / Reset Password</Text>
                      <Ionicons name="checkmark-circle" size={20} color={COLORS.ink} />
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.resendButton} onPress={() => setStep('request')}>
                  <Text style={styles.resendText}>Tuma nambari tena / Resend code</Text>
                </TouchableOpacity>
              </>
            )}

            {step === 'success' && (
              <>
                <View style={styles.successIcon}>
                  <Ionicons name="checkmark-circle" size={80} color={COLORS.emerald} />
                </View>
                <Text style={styles.successTitle}>Nenosiri Limebadilishwa!</Text>
                <Text style={styles.successSubtitle}>Password has been reset successfully</Text>
                <Text style={styles.successText}>
                  Sasa unaweza kuingia na nenosiri lako jipya{'\n'}
                  You can now login with your new password
                </Text>

                <TouchableOpacity style={styles.submitButton} onPress={goToLogin}>
                  <Text style={styles.submitButtonText}>Ingia / Sign In</Text>
                  <Ionicons name="log-in" size={20} color={COLORS.ink} />
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={goToLogin}>
              <Text style={styles.footerLink}>
                ← Rudi kwenye kuingia / Back to login
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    padding: 8,
    zIndex: 10,
  },
  headerContent: {
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.surface,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: COLORS.gold,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 24,
    gap: 20,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#e5e7eb',
    borderRadius: 12,
    padding: 4,
    marginBottom: 8,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
  },
  toggleActive: {
    backgroundColor: COLORS.ink,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  toggleTextActive: {
    color: COLORS.surface,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  helpText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  demoOtpText: {
    fontSize: 12,
    color: COLORS.emerald,
    fontWeight: '600',
    marginTop: 4,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.gold,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.ink,
  },
  resendButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  resendText: {
    fontSize: 14,
    color: COLORS.gold,
    fontWeight: '600',
  },
  successIcon: {
    alignItems: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 16,
    color: COLORS.emerald,
    textAlign: 'center',
    fontWeight: '600',
  },
  successText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 8,
    marginBottom: 24,
  },
  footer: {
    padding: 24,
    alignItems: 'center',
  },
  footerLink: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
});
