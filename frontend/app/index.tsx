import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../src/store/authStore';
import LoadingScreen from '../src/components/LoadingScreen';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const COLORS = {
  primary: '#0D9488',
  primaryDark: '#0F766E',
  primaryLight: '#14B8A6',
  gold: '#F59E0B',
  goldLight: '#FCD34D',
  dark: '#0F172A',
  darkGray: '#1E293B',
  gray: '#64748B',
  lightGray: '#E2E8F0',
  background: '#F8FAFC',
  white: '#FFFFFF',
};

export default function Index() {
  const router = useRouter();
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/seller');
    }
  }, [isLoading, isAuthenticated]);

  if (isLoading) {
    return <LoadingScreen message="Loading..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Premium Gradient Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.logoContainer}>
            <View style={styles.logoIcon}>
              <Ionicons name="shield-checkmark" size={22} color={COLORS.white} />
            </View>
            <Text style={styles.logoText}>CraftHer</Text>
          </View>
          <View style={styles.secureTag}>
            <Ionicons name="lock-closed" size={11} color={COLORS.gold} />
            <Text style={styles.secureText}>Secure</Text>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        {/* Hero Section with Gradient Icon */}
        <View style={styles.heroSection}>
          <View style={styles.heroIconOuter}>
            <View style={styles.heroIconInner}>
              <Ionicons name="storefront" size={40} color={COLORS.primary} />
            </View>
          </View>
          <Text style={styles.heroTitle}>Trade Finance for{"\n"}Women Entrepreneurs</Text>
          <Text style={styles.heroSubtitle}>
            Secure payment links connecting African artisans{"\n"}with diaspora buyers worldwide
          </Text>
        </View>

        {/* Feature Cards */}
        <View style={styles.featuresContainer}>
          <View style={styles.featureCard}>
            <View style={[styles.featureIconContainer, { backgroundColor: '#ECFDF5' }]}>
              <Ionicons name="shield-checkmark" size={22} color={COLORS.primary} />
            </View>
            <Text style={styles.featureTitle}>Escrow{"\n"}Protection</Text>
          </View>
          <View style={styles.featureCard}>
            <View style={[styles.featureIconContainer, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="globe" size={22} color={COLORS.gold} />
            </View>
            <Text style={styles.featureTitle}>Diaspora{"\n"}Payments</Text>
          </View>
          <View style={styles.featureCard}>
            <View style={[styles.featureIconContainer, { backgroundColor: '#E0E7FF' }]}>
              <Ionicons name="flash" size={22} color="#6366F1" />
            </View>
            <Text style={styles.featureTitle}>Instant{"\n"}Links</Text>
          </View>
        </View>

        {/* Trust Badge */}
        <View style={styles.trustBadge}>
          <Ionicons name="shield-checkmark" size={18} color={COLORS.gold} />
          <Text style={styles.trustText}>NMB Escrow Protected</Text>
          <View style={styles.trustDot} />
          <Text style={styles.trustText}>NALA Payments</Text>
        </View>

        {/* CTA Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/login')}
            data-testid="start-selling-btn"
          >
            <Text style={styles.primaryButtonText}>Start Selling</Text>
            <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push('/register')}
            data-testid="create-account-btn"
          >
            <Text style={styles.secondaryButtonText}>Create Free Account</Text>
          </TouchableOpacity>
        </View>

        {/* Footer Trust */}
        <View style={styles.footerTrust}>
          <View style={styles.footerTrustIcon}>
            <Ionicons name="checkmark" size={12} color={COLORS.white} />
          </View>
          <Text style={styles.footerTrustText}>
            Trusted by 1,000+ women entrepreneurs in Tanzania
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: -0.5,
  },
  secureTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  secureText: {
    fontSize: 12,
    color: COLORS.white,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 28,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  heroIconOuter: {
    width: 90,
    height: 90,
    borderRadius: 24,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  heroIconInner: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: '#CCFBF1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.dark,
    textAlign: 'center',
    lineHeight: 32,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 21,
  },
  featuresContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 12,
  },
  featureCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  featureIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  featureTitle: {
    fontSize: 12,
    color: COLORS.darkGray,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 16,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFBEB',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  trustText: {
    fontSize: 13,
    color: '#92400E',
    fontWeight: '600',
  },
  trustDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D97706',
  },
  buttonContainer: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 18,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: COLORS.white,
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  secondaryButtonText: {
    color: COLORS.primary,
    fontSize: 17,
    fontWeight: '700',
  },
  footerTrust: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 28,
    paddingBottom: 16,
  },
  footerTrustIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerTrustText: {
    fontSize: 13,
    color: COLORS.gray,
  },
});
