import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../src/store/authStore';
import { LinearGradient } from 'expo-linear-gradient';

const COLORS = {
  primary: '#047857',
  primaryDark: '#065F46',
  primaryLight: '#10B981',
  emerald: '#059669',
  gold: '#D97706',
  goldLight: '#F59E0B',
  dark: '#0F172A',
  darkGray: '#1E293B',
  gray: '#475569',
  lightGray: '#CBD5E1',
  inputBg: '#F1F5F9',
  paleGray: '#F8FAFC',
  white: '#FFFFFF',
  pink: '#EC4899',
  pinkBg: '#FDF2F8',
  pinkBorder: '#FBCFE8',
};

export default function Register() {
  const router = useRouter();
  const { register } = useAuthStore();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    business_name: '',
  });
  const [isWomenOwned, setIsWomenOwned] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    if (!formData.name || !formData.email || !formData.password) {
      Alert.alert('Taarifa Zinakosekana', 'Tafadhali jaza sehemu zote zinazohitajika / Please fill in all required fields');
      return;
    }

    if (formData.password.length < 6) {
      Alert.alert('Kosa', 'Nenosiri lazima liwe na angalau herufi 6 / Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    try {
      await register({ ...formData, is_women_owned: isWomenOwned });
      router.replace('/seller');
    } catch (error: any) {
      Alert.alert('Usajili Umeshindikana', error.response?.data?.detail || 'Imeshindikana kuunda akaunti / Could not create account');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[COLORS.primaryDark, COLORS.primary, COLORS.emerald]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} data-testid="back-btn">
          <Ionicons name="chevron-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.headerTitleRow}>
          <Ionicons name="shield-checkmark" size={20} color={COLORS.white} />
          <Text style={styles.headerTitle}>CraftHer</Text>
        </View>
        <View style={styles.headerRight}>
          <Ionicons name="lock-closed" size={14} color={COLORS.goldLight} />
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Welcome Section */}
          <View style={styles.welcomeSection}>
            <View style={styles.welcomeIconOuter}>
              <LinearGradient
                colors={[COLORS.goldLight, COLORS.gold]}
                style={styles.welcomeIconGradient}
              >
                <Ionicons name="storefront" size={32} color={COLORS.white} />
              </LinearGradient>
            </View>
            <Text style={styles.welcomeTitle}>Fungua Akaunti</Text>
            <Text style={styles.welcomeTitleEn}>Create Account</Text>
            <Text style={styles.welcomeSubtitle}>Anza kuuza na linki salama za malipo</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Jina Kamili / Full Name *</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={20} color={COLORS.gray} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Jina lako"
                  placeholderTextColor={COLORS.lightGray}
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                  data-testid="name-input"
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Barua Pepe / Email *</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color={COLORS.gray} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="jina@mfano.com"
                  placeholderTextColor={COLORS.lightGray}
                  value={formData.email}
                  onChangeText={(text) => setFormData({ ...formData, email: text })}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  data-testid="email-input"
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Nenosiri / Password *</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color={COLORS.gray} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Angalau herufi 6"
                  placeholderTextColor={COLORS.lightGray}
                  value={formData.password}
                  onChangeText={(text) => setFormData({ ...formData, password: text })}
                  secureTextEntry={!showPassword}
                  data-testid="password-input"
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={COLORS.gray}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Nambari ya Simu / Phone</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="call-outline" size={20} color={COLORS.gray} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="+255 xxx xxx xxx"
                  placeholderTextColor={COLORS.lightGray}
                  value={formData.phone}
                  onChangeText={(text) => setFormData({ ...formData, phone: text })}
                  keyboardType="phone-pad"
                  data-testid="phone-input"
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Jina la Biashara / Business Name</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="storefront-outline" size={20} color={COLORS.gray} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Jina la duka lako"
                  placeholderTextColor={COLORS.lightGray}
                  value={formData.business_name}
                  onChangeText={(text) => setFormData({ ...formData, business_name: text })}
                  data-testid="business-name-input"
                />
              </View>
            </View>

            {/* Women-Owned Toggle - Premium Design */}
            <View style={styles.womenOwnedSection}>
              <LinearGradient
                colors={['rgba(253, 242, 248, 0.9)', 'rgba(252, 231, 243, 0.7)']}
                style={styles.womenOwnedGradient}
              >
                <View style={styles.womenOwnedInfo}>
                  <View style={styles.womenOwnedIcon}>
                    <Ionicons name="heart" size={20} color={COLORS.pink} />
                  </View>
                  <View style={styles.womenOwnedTextContainer}>
                    <Text style={styles.womenOwnedTitle}>Biashara ya Mwanamke</Text>
                    <Text style={styles.womenOwnedTitleEn}>Women-Owned Business</Text>
                    <Text style={styles.womenOwnedSubtitle}>Pata beji ya uthibitisho</Text>
                  </View>
                </View>
                <Switch
                  value={isWomenOwned}
                  onValueChange={setIsWomenOwned}
                  trackColor={{ false: '#E5E7EB', true: '#FBCFE8' }}
                  thumbColor={isWomenOwned ? COLORS.pink : '#F9FAFB'}
                />
              </LinearGradient>
            </View>

            <TouchableOpacity
              style={[styles.registerButton, isLoading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={isLoading}
              data-testid="register-submit-btn"
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                <Text style={styles.registerButtonText}>
                  {isLoading ? 'Inatengeneza... / Creating...' : 'Unda Akaunti / Create Account'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Login Link */}
            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Una akaunti tayari? / Already have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/login')}>
                <Text style={styles.loginLink}>Ingia / Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backButton: {
    width: 42,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.white,
  },
  headerRight: {
    width: 42,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  welcomeSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  welcomeIconOuter: {
    marginBottom: 16,
  },
  welcomeIconGradient: {
    width: 76,
    height: 76,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  welcomeTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.dark,
    letterSpacing: -0.5,
  },
  welcomeTitleEn: {
    fontSize: 15,
    color: COLORS.gray,
    marginTop: 2,
  },
  welcomeSubtitle: {
    fontSize: 13,
    color: COLORS.gray,
    marginTop: 8,
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.darkGray,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderWidth: 1.5,
    borderColor: COLORS.lightGray,
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: COLORS.dark,
  },
  eyeButton: {
    padding: 8,
  },
  womenOwnedSection: {
    marginTop: 4,
  },
  womenOwnedGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.pinkBorder,
  },
  womenOwnedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  womenOwnedIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.pink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  womenOwnedTextContainer: {
    flex: 1,
  },
  womenOwnedTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.dark,
  },
  womenOwnedTitleEn: {
    fontSize: 12,
    color: COLORS.pink,
    marginTop: 1,
  },
  womenOwnedSubtitle: {
    fontSize: 11,
    color: COLORS.gray,
    marginTop: 2,
  },
  registerButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  registerButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
    flexWrap: 'wrap',
  },
  loginText: {
    color: COLORS.gray,
    fontSize: 14,
  },
  loginLink: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '700',
  },
});
