import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { statsApi, productsApi } from '../../src/api/api';
import LoadingScreen from '../../src/components/LoadingScreen';
import { LinearGradient } from 'expo-linear-gradient';

const COLORS = {
  primary: '#047857',
  primaryDark: '#065F46',
  primaryLight: '#10B981',
  emerald: '#059669',
  gold: '#D97706',
  goldLight: '#F59E0B',
  goldPale: '#FEF3C7',
  dark: '#0F172A',
  darkGray: '#1E293B',
  gray: '#475569',
  lightGray: '#CBD5E1',
  paleGray: '#F1F5F9',
  background: '#F8FAFC',
  white: '#FFFFFF',
  success: '#059669',
  successBg: '#ECFDF5',
  blue: '#2563EB',
  blueBg: '#EFF6FF',
  purple: '#7C3AED',
  purpleBg: '#F5F3FF',
  pink: '#EC4899',
  pinkBg: '#FDF2F8',
  error: '#DC2626',
};

export default function SellerDashboard() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, checkAuth, logout } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    } else if (isAuthenticated) {
      loadData();
    }
  }, [isLoading, isAuthenticated]);

  const loadData = async () => {
    try {
      const [statsRes, productsRes] = await Promise.all([
        statsApi.getSellerStats(),
        productsApi.getAll()
      ]);
      setStats(statsRes.data);
      setProducts(productsRes.data);
    } catch (error) {
      console.error('Load data error:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  if (isLoading) {
    return <LoadingScreen message="Inapakia... / Loading..." />;
  }

  const formatTZS = (amount: number) => `TZS ${amount?.toLocaleString() || 0}`;
  const formatUSD = (amount: number) => `$${(amount / 2500).toFixed(0)}`;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      >
        {/* Header Card */}
        <LinearGradient
          colors={[COLORS.primaryDark, COLORS.primary, COLORS.emerald]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerCard}
        >
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.greeting}>Karibu tena / Welcome back</Text>
              <Text style={styles.name}>{user?.business_name || user?.name || 'Mjasiriamali'}</Text>
              {(user?.is_women_owned || stats?.is_women_owned) && (
                <View style={styles.womenOwnedBadge}>
                  <Ionicons name="heart" size={12} color={COLORS.pink} />
                  <Text style={styles.womenOwnedText}>Biashara ya Mwanamke</Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              style={styles.profileButton}
              onPress={() => {}}
              data-testid="profile-btn"
            >
              <Ionicons name="person-circle" size={44} color="rgba(255,255,255,0.9)" />
            </TouchableOpacity>
          </View>

          {/* Quick Stats in Header */}
          <View style={styles.headerStats}>
            <View style={styles.headerStatItem}>
              <Text style={styles.headerStatValue}>{formatTZS(stats?.total_earnings || 0)}</Text>
              <Text style={styles.headerStatLabel}>Mapato Yote / Total Earnings</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Trade Finance Profile Card */}
        {stats?.trade_metrics && (
          <View style={styles.tradeCard}>
            <View style={styles.tradeCardHeader}>
              <View style={styles.tradeIconBg}>
                <Ionicons name="trending-up" size={20} color={COLORS.success} />
              </View>
              <View style={styles.tradeHeaderText}>
                <Text style={styles.tradeTitle}>Profaili ya Biashara</Text>
                <Text style={styles.tradeTitleEn}>Trade Finance Profile</Text>
              </View>
              {stats.trade_metrics.credit_score_eligible && (
                <View style={styles.creditBadge}>
                  <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
                  <Text style={styles.creditText}>Mkopo</Text>
                </View>
              )}
            </View>
            <View style={styles.tradeMetricsRow}>
              <View style={styles.tradeMetricItem}>
                <Text style={styles.tradeMetricValue}>{stats.trade_metrics.success_rate}%</Text>
                <Text style={styles.tradeMetricLabel}>Mafanikio</Text>
              </View>
              <View style={styles.tradeMetricDivider} />
              <View style={styles.tradeMetricItem}>
                <Text style={styles.tradeMetricValue}>{stats.trade_metrics.successful_transactions}</Text>
                <Text style={styles.tradeMetricLabel}>Imekamilika</Text>
              </View>
              <View style={styles.tradeMetricDivider} />
              <View style={styles.tradeMetricItem}>
                <Text style={styles.tradeMetricValue}>{stats.trade_metrics.repeat_buyers}</Text>
                <Text style={styles.tradeMetricLabel}>Wateja Tena</Text>
              </View>
            </View>
          </View>
        )}

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, styles.escrowCard]}>
            <View style={styles.statIconBg}>
              <Ionicons name="shield-checkmark" size={22} color={COLORS.gold} />
            </View>
            <Text style={styles.statValue}>{formatTZS(stats?.pending_earnings || 0)}</Text>
            <Text style={styles.statLabel}>Escrow Salama</Text>
            <View style={styles.statBadge}>
              <Text style={styles.statBadgeText}>NMB Protected</Text>
            </View>
          </View>

          <View style={[styles.statCard, styles.globalCard]}>
            <View style={[styles.statIconBg, { backgroundColor: COLORS.blueBg }]}>
              <Ionicons name="globe" size={22} color={COLORS.blue} />
            </View>
            <Text style={styles.statValue}>{stats?.international_orders || 0}</Text>
            <Text style={styles.statLabel}>Oda za Kimataifa</Text>
            <View style={[styles.statBadge, { backgroundColor: COLORS.blueBg }]}>
              <Text style={[styles.statBadgeText, { color: COLORS.blue }]}>Diaspora</Text>
            </View>
          </View>
        </View>

        {/* Mini Stats */}
        <View style={styles.miniStatsRow}>
          <View style={styles.miniStatCard}>
            <Ionicons name="cube" size={24} color={COLORS.purple} />
            <Text style={styles.miniStatValue}>{stats?.products_count || 0}</Text>
            <Text style={styles.miniStatLabel}>Bidhaa</Text>
          </View>
          <View style={styles.miniStatCard}>
            <Ionicons name="cart" size={24} color={COLORS.gold} />
            <Text style={styles.miniStatValue}>{stats?.total_orders || 0}</Text>
            <Text style={styles.miniStatLabel}>Oda Zote</Text>
          </View>
          <View style={styles.miniStatCard}>
            <Ionicons name="checkmark-done" size={24} color={COLORS.success} />
            <Text style={styles.miniStatValue}>{stats?.completed_orders || 0}</Text>
            <Text style={styles.miniStatLabel}>Imekamilika</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vitendo vya Haraka / Quick Actions</Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/seller/create')}
              data-testid="create-link-btn"
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[COLORS.primaryLight, COLORS.primary]}
                style={styles.actionIconGradient}
              >
                <Ionicons name="add" size={28} color={COLORS.white} />
              </LinearGradient>
              <Text style={styles.actionTitle}>Unda Linki</Text>
              <Text style={styles.actionSubtitle}>Create Link</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/seller/orders')}
              data-testid="view-orders-btn"
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[COLORS.goldLight, COLORS.gold]}
                style={styles.actionIconGradient}
              >
                <Ionicons name="list" size={28} color={COLORS.white} />
              </LinearGradient>
              <Text style={styles.actionTitle}>Oda Zangu</Text>
              <Text style={styles.actionSubtitle}>View Orders</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* NALA Info Card */}
        <View style={styles.nalaCard}>
          <LinearGradient
            colors={['rgba(239, 246, 255, 0.95)', 'rgba(219, 234, 254, 0.8)']}
            style={styles.nalaGradient}
          >
            <View style={styles.nalaIconBg}>
              <Ionicons name="globe" size={26} color={COLORS.blue} />
            </View>
            <View style={styles.nalaContent}>
              <Text style={styles.nalaTitle}>Pokea Malipo ya Diaspora</Text>
              <Text style={styles.nalaTitleEn}>Receive Diaspora Payments</Text>
              <Text style={styles.nalaText}>Pokea malipo kutoka UK, US, EU kupitia NALA</Text>
              <View style={styles.currencyRow}>
                <View style={styles.currencyBadge}><Text style={styles.currencyText}>USD</Text></View>
                <View style={styles.currencyBadge}><Text style={styles.currencyText}>GBP</Text></View>
                <View style={styles.currencyBadge}><Text style={styles.currencyText}>EUR</Text></View>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Recent Products */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Bidhaa za Hivi Karibuni / Recent</Text>
            {products.length > 0 && (
              <TouchableOpacity>
                <Text style={styles.seeAllText}>Ona Zote</Text>
              </TouchableOpacity>
            )}
          </View>

          {products.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconBg}>
                <Ionicons name="cube-outline" size={40} color={COLORS.lightGray} />
              </View>
              <Text style={styles.emptyTitle}>Hakuna bidhaa bado</Text>
              <Text style={styles.emptySubtitle}>No products yet</Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => router.push('/seller/create')}
              >
                <Text style={styles.emptyButtonText}>Unda linki ya kwanza ya malipo</Text>
                <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
          ) : (
            products.slice(0, 3).map((product) => (
              <View key={product.product_id} style={styles.productCard}>
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{product.name}</Text>
                  <Text style={styles.productPrice}>{formatTZS(product.price_tzs || product.price)}</Text>
                  {product.international_shipping && (
                    <View style={styles.exportBadge}>
                      <Ionicons name="airplane" size={11} color={COLORS.blue} />
                      <Text style={styles.exportText}>Export Ready</Text>
                    </View>
                  )}
                </View>
                <View style={styles.productCode}>
                  <Ionicons name="link" size={14} color={COLORS.primary} />
                  <Text style={styles.codeText}>{product.payment_link_code}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} data-testid="logout-btn">
          <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
          <Text style={styles.logoutText}>Toka / Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 16,
  },
  headerCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  name: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: -0.5,
    marginTop: 4,
  },
  womenOwnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  womenOwnedText: {
    fontSize: 12,
    color: COLORS.white,
    fontWeight: '600',
  },
  profileButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerStats: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  headerStatItem: {
    alignItems: 'center',
  },
  headerStatValue: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.white,
  },
  headerStatLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  tradeCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.success,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  tradeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  tradeIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.successBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tradeHeaderText: {
    flex: 1,
  },
  tradeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.dark,
  },
  tradeTitleEn: {
    fontSize: 12,
    color: COLORS.gray,
  },
  creditBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.successBg,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  creditText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.success,
  },
  tradeMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  tradeMetricItem: {
    alignItems: 'center',
    flex: 1,
  },
  tradeMetricDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.paleGray,
  },
  tradeMetricValue: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.dark,
  },
  tradeMetricLabel: {
    fontSize: 11,
    color: COLORS.gray,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  escrowCard: {
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  globalCard: {
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  statIconBg: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.goldPale,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.dark,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 4,
  },
  statBadge: {
    backgroundColor: COLORS.goldPale,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 10,
  },
  statBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.gold,
  },
  miniStatsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  miniStatCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: 14,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  miniStatValue: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.dark,
    marginTop: 6,
  },
  miniStatLabel: {
    fontSize: 11,
    color: COLORS.gray,
    marginTop: 2,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.dark,
  },
  seeAllText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  actionIconGradient: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.dark,
  },
  actionSubtitle: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  nalaCard: {
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
  },
  nalaGradient: {
    flexDirection: 'row',
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 20,
  },
  nalaIconBg: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.blue,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  nalaContent: {
    flex: 1,
  },
  nalaTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E40AF',
  },
  nalaTitleEn: {
    fontSize: 12,
    color: COLORS.blue,
    marginTop: 1,
  },
  nalaText: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 6,
    lineHeight: 18,
  },
  currencyRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  currencyBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
  },
  currencyText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E40AF',
  },
  emptyState: {
    backgroundColor: COLORS.white,
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
  },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: COLORS.paleGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 4,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  emptyButtonText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  productCard: {
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark,
  },
  productPrice: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: 4,
  },
  exportBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    backgroundColor: COLORS.blueBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  exportText: {
    fontSize: 11,
    color: COLORS.blue,
    fontWeight: '600',
  },
  productCode: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  codeText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    marginTop: 8,
    marginBottom: 20,
    backgroundColor: COLORS.white,
    borderRadius: 16,
  },
  logoutText: {
    fontSize: 15,
    color: COLORS.error,
    fontWeight: '600',
  },
});
