import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  Dimensions,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../src/store/authStore';
import { COLORS, RADIUS, SHADOWS, formatTZS, formatTZSShort } from '../../src/constants/theme';
import { AIChatbot } from '../../src/components/AIChatbot';
import { BottomNav } from '../../src/components/BottomNav';
import { TransactionHistory } from '../../src/components/TransactionHistory';
import ThreePartyEscrow from '../../src/components/ThreePartyEscrow';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const { width } = Dimensions.get('window');

export default function SellerDashboard() {
  const { user, sessionToken, isAuthenticated, isLoading, logout, checkAuth } = useAuthStore();
  const [products, setProducts] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [showThreeParty, setShowThreeParty] = useState(false);
  
  // Only use router when component is mounted
  const router = useRouter();

  // Check auth on mount
  useEffect(() => {
    setIsMounted(true);
    checkAuth().then(() => {
      setIsReady(true);
    });
  }, []);

  // Fetch data when authenticated
  useEffect(() => {
    if (isReady && sessionToken) {
      fetchData();
    }
  }, [isReady, sessionToken]);

  // Loading state
  if (!isReady || isLoading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: '#666' }}>Inapakia... / Loading...</Text>
      </SafeAreaView>
    );
  }

  // Redirect if not authenticated (only after ready)
  if (isReady && !sessionToken && !isAuthenticated) {
    // Use setTimeout to ensure we don't navigate during render
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: '#666' }}>Redirecting to login...</Text>
      </SafeAreaView>
    );
  }

  const fetchData = async () => {
    if (!sessionToken) return;
    
    try {
      const [productsRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/api/products`, {
          headers: { Authorization: `Bearer ${sessionToken}` },
        }),
        fetch(`${API_URL}/api/seller/stats`, {
          headers: { Authorization: `Bearer ${sessionToken}` },
        }),
      ]);

      if (productsRes.ok) {
        const data = await productsRes.json();
        setProducts(data);
      }
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleLogout = () => {
    logout();
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.username?.charAt(0).toUpperCase() || '👤'}
            </Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>Habari, {user?.username || 'Muuzaji'}</Text>
            <Text style={styles.headerSub}>SecureTrade Dashboard</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          <LinearGradient
            colors={[COLORS.ink, COLORS.ink2]}
            style={styles.statsCardMain}
          >
            <Text style={styles.statsIcon}>💰</Text>
            <Text style={styles.statsValue}>
              {formatTZSShort(stats?.total_revenue || 0)}
            </Text>
            <Text style={styles.statsLabel}>Mapato Jumla / Total Revenue</Text>
            <View style={styles.statsGrowth}>
              <Ionicons name="trending-up" size={14} color={COLORS.emeraldLight} />
              <Text style={styles.statsGrowthText}>Escrow Active</Text>
            </View>
          </LinearGradient>

          <View style={styles.statsRow}>
            <View style={styles.statsCardSmall}>
              <Text style={styles.statsSmallIcon}>📦</Text>
              <Text style={styles.statsSmallValue}>{products.length}</Text>
              <Text style={styles.statsSmallLabel}>Bidhaa</Text>
            </View>
            <View style={styles.statsCardSmall}>
              <Text style={styles.statsSmallIcon}>✅</Text>
              <Text style={styles.statsSmallValue}>{stats?.completed_orders || 0}</Text>
              <Text style={styles.statsSmallLabel}>Mafanikio</Text>
            </View>
            <View style={styles.statsCardSmall}>
              <Text style={styles.statsSmallIcon}>⭐</Text>
              <Text style={styles.statsSmallValue}>
                {stats?.trust_score || 87}
              </Text>
              <Text style={styles.statsSmallLabel}>Trust</Text>
            </View>
          </View>
        </View>

        {/* Create Product Button */}
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => router.push('/create')}
          activeOpacity={0.85}
          data-testid="create-product-btn"
        >
          <LinearGradient
            colors={[COLORS.gold, COLORS.goldDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.createBtnGradient}
          >
            <Ionicons name="add-circle" size={22} color={COLORS.ink} />
            <Text style={styles.createBtnText}>Unda Linki ya Malipo · Create Payment Link</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Products List */}
        <View style={styles.productsSection}>
          <Text style={styles.sectionTitle}>BIDHAA ZAKO / YOUR PRODUCTS</Text>

          {products.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📦</Text>
              <Text style={styles.emptyText}>Bado huna bidhaa</Text>
              <Text style={styles.emptyTextEn}>No products yet</Text>
            </View>
          ) : (
            products.map((product) => (
              <View key={product.product_id} style={styles.productCard}>
                <View style={styles.productImageWrap}>
                  {product.image ? (
                    <Image source={{ uri: product.image }} style={styles.productImage} />
                  ) : (
                    <View style={[styles.productImage, styles.productImagePlaceholder]}>
                      <Ionicons name="image" size={24} color={COLORS.surface3} />
                    </View>
                  )}
                </View>
                <View style={styles.productInfo}>
                  <Text style={styles.productName} numberOfLines={2}>
                    {product.name}
                  </Text>
                  <Text style={styles.productPrice}>{formatTZS(product.price)}</Text>
                </View>
                <TouchableOpacity
                  style={styles.copyBtn}
                  onPress={() => {
                    // Copy link
                    const link = `${API_URL}/pay/${product.link_id}`;
                    // Clipboard.setString(link);
                  }}
                >
                  <Ionicons name="copy-outline" size={18} color={COLORS.gold} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.quickAction}
            onPress={() => setShowThreeParty(true)}
            data-testid="btn-three-party-escrow"
          >
            <View style={[styles.quickActionIcon, { backgroundColor: COLORS.goldLight + '40' }]}>
              <Ionicons name="people" size={22} color={COLORS.goldDark} />
            </View>
            <Text style={styles.quickActionText}>Escrow 3</Text>
            <Text style={styles.quickActionEn}>3-Party</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickAction}>
            <View style={[styles.quickActionIcon, { backgroundColor: COLORS.emeraldPale }]}>
              <Ionicons name="wallet" size={22} color={COLORS.emerald} />
            </View>
            <Text style={styles.quickActionText}>Ondoa Pesa</Text>
            <Text style={styles.quickActionEn}>Withdraw</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickAction} onPress={() => router.push('/seller/profile')}>
            <View style={[styles.quickActionIcon, { backgroundColor: COLORS.bluePale }]}>
              <Ionicons name="settings" size={22} color={COLORS.blue} />
            </View>
            <Text style={styles.quickActionText}>Mipangilio</Text>
            <Text style={styles.quickActionEn}>Settings</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <BottomNav
        active="home"
        onHome={() => {}}
        onHistory={() => setShowHistory(true)}
        onSupport={() => setShowChat(true)}
        onProfile={() => {
          if (Platform.OS === 'web') {
            window.location.href = '/seller/profile';
          } else {
            router.push('/seller/profile');
          }
        }}
      />

      {/* AI Chatbot */}
      {showChat && (
        <AIChatbot mode="support" onClose={() => setShowChat(false)} />
      )}

      {/* Transaction History */}
      {showHistory && (
        <TransactionHistory onClose={() => setShowHistory(false)} />
      )}

      {/* Three-Party Escrow */}
      {showThreeParty && (
        <ThreePartyEscrow onClose={() => setShowThreeParty(false)} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  header: {
    backgroundColor: COLORS.ink,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: COLORS.ink,
    fontSize: 18,
    fontWeight: '700',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  headerSub: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginTop: 2,
  },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  statsGrid: {
    gap: 12,
  },
  statsCardMain: {
    borderRadius: RADIUS.lg,
    padding: 20,
    alignItems: 'center',
    ...SHADOWS.md,
  },
  statsIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  statsValue: {
    color: COLORS.gold,
    fontSize: 32,
    fontWeight: '800',
  },
  statsLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginTop: 4,
  },
  statsGrowth: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statsGrowthText: {
    color: COLORS.emeraldLight,
    fontSize: 12,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statsCardSmall: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: 14,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  statsSmallIcon: {
    fontSize: 20,
    marginBottom: 8,
  },
  statsSmallValue: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.ink,
  },
  statsSmallLabel: {
    fontSize: 11,
    color: 'rgba(10,10,15,0.5)',
    marginTop: 4,
  },
  createBtn: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    ...SHADOWS.gold,
  },
  createBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  createBtnText: {
    color: COLORS.ink,
    fontSize: 14,
    fontWeight: '700',
  },
  productsSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(10,10,15,0.4)',
    letterSpacing: 1,
    marginBottom: 12,
  },
  emptyState: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: 32,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.ink,
  },
  emptyTextEn: {
    fontSize: 13,
    color: 'rgba(10,10,15,0.5)',
    marginTop: 4,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: 12,
    gap: 12,
    marginBottom: 10,
    ...SHADOWS.sm,
  },
  productImageWrap: {
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
  },
  productImage: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surface2,
  },
  productImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.ink,
  },
  productPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.goldDark,
    marginTop: 4,
  },
  copyBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.goldLight + '30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  quickAction: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: 14,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.ink,
  },
  quickActionEn: {
    fontSize: 10,
    color: 'rgba(10,10,15,0.5)',
    marginTop: 2,
  },
  chatFab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.ink,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.lg,
    zIndex: 500,
  },
  chatFabText: {
    fontSize: 22,
  },
});
