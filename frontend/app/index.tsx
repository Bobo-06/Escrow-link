import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../src/store/authStore';
import LoadingScreen from '../src/components/LoadingScreen';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

// Premium Color Palette - Deep Teal/Emerald with Gold Accents
const COLORS = {
  // Primary Teal/Emerald
  primary: '#047857',
  primaryDark: '#065F46',
  primaryLight: '#10B981',
  emerald: '#059669',
  
  // Gold Accents for Trust
  gold: '#D97706',
  goldLight: '#F59E0B',
  goldPale: '#FEF3C7',
  
  // Neutrals
  dark: '#0F172A',
  darkGray: '#1E293B',
  gray: '#475569',
  lightGray: '#CBD5E1',
  paleGray: '#F1F5F9',
  background: '#F8FAFC',
  white: '#FFFFFF',
  
  // Accent Colors
  coral: '#F97316',
  purple: '#7C3AED',
  pink: '#EC4899',
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
    return <LoadingScreen message="Inapakia... / Loading..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Gradient Header with Glassmorphism */}
      <LinearGradient
        colors={[COLORS.primaryDark, COLORS.primary, COLORS.emerald]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.logoContainer}>
            <View style={styles.logoIconWrapper}>
              <Ionicons name="shield-checkmark" size={24} color={COLORS.white} />
            </View>
            <View>
              <Text style={styles.logoText}>CraftHer</Text>
              <Text style={styles.logoTagline}>Biashara Salama</Text>
            </View>
          </View>
          <View style={styles.secureTag}>
            <Ionicons name="lock-closed" size={12} color={COLORS.goldLight} />
            <Text style={styles.secureText}>Salama</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroIconContainer}>
            <LinearGradient
              colors={[COLORS.goldLight, COLORS.gold]}
              style={styles.heroIconGradient}
            >
              <Ionicons name="storefront" size={36} color={COLORS.white} />
            </LinearGradient>
          </View>
          
          <Text style={styles.heroTitle}>
            Fedha za Biashara{"\n"}
            <Text style={styles.heroTitleAccent}>kwa Wanawake Wajasiriamali</Text>
          </Text>
          <Text style={styles.heroSubtitle}>
            Trade Finance for Women Entrepreneurs
          </Text>
          <Text style={styles.heroDescription}>
            Linganisha wasanii wa Afrika na wanunuzi wa diaspora{"\n"}
            kupitia malipo salama ya escrow
          </Text>
        </View>

        {/* Premium Feature Cards with Glassmorphism */}
        <View style={styles.featuresGrid}>
          <View style={[styles.featureCard, styles.featureCardPrimary]}>
            <View style={styles.featureIconBg}>
              <Ionicons name="shield-checkmark" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.featureTitle}>Escrow</Text>
            <Text style={styles.featureSubtitle}>Ulinzi wa Malipo</Text>
          </View>
          
          <View style={[styles.featureCard, styles.featureCardGold]}>
            <View style={[styles.featureIconBg, { backgroundColor: COLORS.goldPale }]}>
              <Ionicons name="globe" size={24} color={COLORS.gold} />
            </View>
            <Text style={styles.featureTitle}>Diaspora</Text>
            <Text style={styles.featureSubtitle}>Malipo ya Kimataifa</Text>
          </View>
          
          <View style={[styles.featureCard, styles.featureCardAccent]}>
            <View style={[styles.featureIconBg, { backgroundColor: '#EDE9FE' }]}>
              <Ionicons name="flash" size={24} color={COLORS.purple} />
            </View>
            <Text style={styles.featureTitle}>Haraka</Text>
            <Text style={styles.featureSubtitle}>Linki za Papo Hapo</Text>
          </View>
        </View>

        {/* Trust Badges - Premium Design */}
        <View style={styles.trustContainer}>
          <LinearGradient
            colors={['rgba(254, 243, 199, 0.8)', 'rgba(254, 243, 199, 0.4)']}
            style={styles.trustBadge}
          >
            <View style={styles.trustIconWrapper}>
              <Ionicons name="shield-checkmark" size={18} color={COLORS.gold} />
            </View>
            <View style={styles.trustTextContainer}>
              <Text style={styles.trustTitle}>NMB Escrow Protected</Text>
              <Text style={styles.trustSubtext}>Fedha zako zinalindwa • Your money is safe</Text>
            </View>
          </LinearGradient>
          
          <View style={styles.trustStats}>
            <View style={styles.trustStatItem}>
              <Text style={styles.trustStatNumber}>1,000+</Text>
              <Text style={styles.trustStatLabel}>Wajasiriamali</Text>
            </View>
            <View style={styles.trustStatDivider} />
            <View style={styles.trustStatItem}>
              <Text style={styles.trustStatNumber}>98%</Text>
              <Text style={styles.trustStatLabel}>Mafanikio</Text>
            </View>
            <View style={styles.trustStatDivider} />
            <View style={styles.trustStatItem}>
              <Text style={styles.trustStatNumber}>TZS 500M+</Text>
              <Text style={styles.trustStatLabel}>Biashara</Text>
            </View>
          </View>
        </View>

        {/* CTA Buttons - Premium Style */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/login')}
            data-testid="start-selling-btn"
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              <Text style={styles.primaryButtonText}>Anza Kuuza • Start Selling</Text>
              <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push('/register')}
            data-testid="create-account-btn"
            activeOpacity={0.85}
          >
            <Text style={styles.secondaryButtonText}>Fungua Akaunti Bure • Create Free Account</Text>
          </TouchableOpacity>
        </View>

        {/* Footer Trust Message */}
        <View style={styles.footerTrust}>
          <Ionicons name="heart" size={14} color={COLORS.pink} />
          <Text style={styles.footerText}>
            Tunawasaidia wanawake kufikia soko la kimataifa
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  logoText: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: -0.5,
  },
  logoTagline: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  secureTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  secureText: {
    fontSize: 12,
    color: COLORS.white,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  heroIconContainer: {
    marginBottom: 20,
  },
  heroIconGradient: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.dark,
    textAlign: 'center',
    lineHeight: 30,
    letterSpacing: -0.5,
  },
  heroTitleAccent: {
    color: COLORS.primary,
  },
  heroSubtitle: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 6,
    fontStyle: 'italic',
  },
  heroDescription: {
    fontSize: 13,
    color: COLORS.gray,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 20,
  },
  featuresGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  featureCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  featureCardPrimary: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  featureCardGold: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  featureCardAccent: {
    backgroundColor: '#F5F3FF',
    borderColor: '#DDD6FE',
  },
  featureIconBg: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.dark,
  },
  featureSubtitle: {
    fontSize: 10,
    color: COLORS.gray,
    marginTop: 2,
  },
  trustContainer: {
    marginBottom: 24,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 16,
  },
  trustIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  trustTextContainer: {
    flex: 1,
  },
  trustTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.dark,
  },
  trustSubtext: {
    fontSize: 12,
    color: '#92400E',
    marginTop: 2,
  },
  trustStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: COLORS.paleGray,
    paddingVertical: 14,
    borderRadius: 14,
  },
  trustStatItem: {
    alignItems: 'center',
  },
  trustStatNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
  },
  trustStatLabel: {
    fontSize: 11,
    color: COLORS.gray,
    marginTop: 2,
  },
  trustStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.lightGray,
  },
  buttonContainer: {
    gap: 12,
  },
  primaryButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: COLORS.white,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  secondaryButtonText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  footerTrust: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    paddingBottom: 16,
  },
  footerText: {
    fontSize: 12,
    color: COLORS.gray,
    fontStyle: 'italic',
  },
});
