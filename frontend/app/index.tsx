import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../src/store/authStore';
import LoadingScreen from '../src/components/LoadingScreen';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, RADIUS, SHADOWS, formatTZSShort } from '../src/constants/theme';
import { OfflineIndicator } from '../src/components/OfflineIndicator';

const { width } = Dimensions.get('window');

// Sample product for showcase
const SAMPLE_PRODUCT = {
  name: 'Samsung Galaxy S24 Ultra',
  price: 1850000,
  image: 'https://images.unsplash.com/photo-1610945264803-c22b62d2a7b3?w=400&q=80',
  seller: {
    name: 'Amani Tech',
    trustScore: 91,
  },
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
    <SafeAreaView style={styles.container} edges={['top']}>
      <OfflineIndicator />
      
      {/* Status Bar */}
      <View style={styles.statusBar}>
        <Text style={styles.statusTime}>9:41</Text>
        <Text style={styles.statusTitle}>SecureTrade TZ</Text>
        <Text style={styles.statusBattery}>84%</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Hero Section */}
        <LinearGradient
          colors={[COLORS.ink, COLORS.ink2]}
          style={styles.heroSection}
        >
          <View style={styles.heroContent}>
            <View style={styles.escrowBadge}>
              <Ionicons name="shield-checkmark" size={14} color={COLORS.gold} />
              <Text style={styles.escrowBadgeText}>ESCROW PROTECTED</Text>
            </View>
            
            <Text style={styles.heroTitle}>
              Masoko Salama{'\n'}
              <Text style={styles.heroTitleGold}>Protected Marketplace</Text>
            </Text>
            
            <Text style={styles.heroSubtitle}>
              Tanzania's #1 escrow platform for social commerce
            </Text>

            {/* Trust Stats */}
            <View style={styles.trustStats}>
              {[
                ['1,000+', 'Wajasiriamali'],
                ['TZS 500M+', 'Biashara'],
                ['98%', 'Mafanikio'],
              ].map(([value, label], i) => (
                <View key={i} style={styles.trustStatItem}>
                  <Text style={styles.trustStatValue}>{value}</Text>
                  <Text style={styles.trustStatLabel}>{label}</Text>
                </View>
              ))}
            </View>
          </View>
        </LinearGradient>

        {/* Trust Strip */}
        <View style={styles.trustStrip}>
          {[
            { icon: 'shield-checkmark', label: 'Escrow' },
            { icon: 'phone-portrait', label: 'M-Pesa' },
            { icon: 'checkmark-circle', label: 'KYC' },
            { icon: 'swap-horizontal', label: 'Dispute' },
          ].map((item, i) => (
            <View key={i} style={styles.trustStripItem}>
              <Ionicons name={item.icon as any} size={14} color={COLORS.emerald} />
              <Text style={styles.trustStripLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* Product Card Preview */}
        <View style={styles.productSection}>
          <Text style={styles.sectionTitle}>BIDHAA ZINAZOUZA / TRENDING</Text>
          
          <View style={styles.productCard}>
            <View style={styles.productImageWrap}>
              <Image source={{ uri: SAMPLE_PRODUCT.image }} style={styles.productImage} />
              <View style={styles.productBadge}>
                <Text style={styles.productBadgeText}>Instagram</Text>
              </View>
            </View>
            <View style={styles.productInfo}>
              <View style={styles.productHeader}>
                <Text style={styles.productName}>{SAMPLE_PRODUCT.name}</Text>
                <View style={styles.trustScoreBadge}>
                  <Text style={styles.trustScoreText}>{SAMPLE_PRODUCT.seller.trustScore}</Text>
                  <Text style={styles.trustScoreLabel}>TRUST</Text>
                </View>
              </View>
              <Text style={styles.productSeller}>{SAMPLE_PRODUCT.seller.name}</Text>
              <View style={styles.productPriceRow}>
                <Text style={styles.productPrice}>{formatTZSShort(SAMPLE_PRODUCT.price)}</Text>
                <View style={styles.escrowTag}>
                  <Ionicons name="shield-checkmark" size={12} color={COLORS.emerald} />
                  <Text style={styles.escrowTagText}>Escrow</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Features Grid */}
        <View style={styles.featuresGrid}>
          {[
            { icon: 'shield-checkmark', title: 'NMB Escrow', subtitle: 'Ulinzi wa Malipo', color: COLORS.emerald },
            { icon: 'globe', title: 'NALA Diaspora', subtitle: 'USD/GBP/EUR', color: COLORS.gold },
            { icon: 'chatbubbles', title: 'AI Support', subtitle: 'Swahili & English', color: COLORS.blue },
            { icon: 'flash', title: 'M-Pesa', subtitle: 'Haraka Sana', color: '#4bb543' },
          ].map((feat, i) => (
            <View key={i} style={styles.featureCard}>
              <View style={[styles.featureIcon, { backgroundColor: `${feat.color}15` }]}>
                <Ionicons name={feat.icon as any} size={22} color={feat.color} />
              </View>
              <Text style={styles.featureTitle}>{feat.title}</Text>
              <Text style={styles.featureSubtitle}>{feat.subtitle}</Text>
            </View>
          ))}
        </View>

        {/* CTA Buttons */}
        <View style={styles.ctaContainer}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.push('/login')}
            activeOpacity={0.85}
            data-testid="start-selling-btn"
          >
            <LinearGradient
              colors={[COLORS.gold, COLORS.goldDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryBtnGradient}
            >
              <Text style={styles.primaryBtnText}>Anza Kuuza · Start Selling</Text>
              <Ionicons name="arrow-forward" size={18} color={COLORS.ink} />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => router.push('/register')}
            activeOpacity={0.85}
            data-testid="create-account-btn"
          >
            <Text style={styles.secondaryBtnText}>Fungua Akaunti Bure · Create Free Account</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Tunawasaidia wanawake kufikia soko la kimataifa
          </Text>
          <Text style={styles.footerSubtext}>
            Trade-Finance Infrastructure for Women Entrepreneurs
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  statusBar: {
    backgroundColor: COLORS.ink,
    paddingHorizontal: 20,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusTime: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '500',
  },
  statusTitle: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  statusBattery: {
    color: COLORS.white,
    fontSize: 12,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: 40,
  },
  heroSection: {
    padding: 20,
    paddingTop: 24,
    paddingBottom: 28,
  },
  heroContent: {
    alignItems: 'center',
  },
  escrowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(200,169,110,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  escrowBadgeText: {
    color: COLORS.gold,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.white,
    textAlign: 'center',
    lineHeight: 32,
  },
  heroTitleGold: {
    color: COLORS.gold,
  },
  heroSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 10,
    textAlign: 'center',
  },
  trustStats: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 24,
  },
  trustStatItem: {
    alignItems: 'center',
  },
  trustStatValue: {
    color: COLORS.gold,
    fontSize: 16,
    fontWeight: '800',
  },
  trustStatLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    marginTop: 2,
  },
  trustStrip: {
    flexDirection: 'row',
    backgroundColor: COLORS.emeraldPale,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(26,122,90,0.1)',
  },
  trustStripItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  trustStripLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.emerald,
  },
  productSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(10,10,15,0.4)',
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  productCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  productImageWrap: {
    height: 160,
    backgroundColor: COLORS.surface2,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  productBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(10,10,15,0.8)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  productBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '700',
  },
  productInfo: {
    padding: 14,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  productName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.ink,
    marginRight: 10,
  },
  trustScoreBadge: {
    alignItems: 'center',
  },
  trustScoreText: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.emerald,
  },
  trustScoreLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: 'rgba(10,10,15,0.4)',
    letterSpacing: 0.5,
  },
  productSeller: {
    fontSize: 12,
    color: 'rgba(10,10,15,0.5)',
    marginTop: 4,
  },
  productPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.goldDark,
  },
  escrowTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.emeraldPale,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  escrowTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.emerald,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 10,
  },
  featureCard: {
    width: (width - 42) / 2,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: 14,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  featureTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.ink,
  },
  featureSubtitle: {
    fontSize: 11,
    color: 'rgba(10,10,15,0.5)',
    marginTop: 2,
  },
  ctaContainer: {
    padding: 20,
    gap: 12,
  },
  primaryBtn: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    ...SHADOWS.gold,
  },
  primaryBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  primaryBtnText: {
    color: COLORS.ink,
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryBtn: {
    backgroundColor: COLORS.white,
    paddingVertical: 16,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.surface3,
  },
  secondaryBtnText: {
    color: COLORS.ink,
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 13,
    color: COLORS.ink,
    fontWeight: '600',
    textAlign: 'center',
  },
  footerSubtext: {
    fontSize: 11,
    color: 'rgba(10,10,15,0.5)',
    marginTop: 4,
  },
});
