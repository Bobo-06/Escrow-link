import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { statsApi, productsApi } from '../../src/api/api';
import LoadingScreen from '../../src/components/LoadingScreen';

const COLORS = {
  primary: '#0D9488',
  primaryLight: '#14B8A6',
  gold: '#F59E0B',
  goldBg: '#FFFBEB',
  dark: '#0F172A',
  darkGray: '#1E293B',
  gray: '#64748B',
  lightGray: '#E2E8F0',
  background: '#F8FAFC',
  white: '#FFFFFF',
  success: '#10B981',
  successBg: '#ECFDF5',
  blue: '#3B82F6',
  blueBg: '#EFF6FF',
  purple: '#7C3AED',
  purpleBg: '#F5F3FF',
  pink: '#EC4899',
  pinkBg: '#FDF2F8',
  error: '#EF4444',
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
    return <LoadingScreen message="Loading..." />;
  }

  const formatTZS = (amount: number) => {
    return `TZS ${amount?.toLocaleString() || 0}`;
  };

  const formatUSD = (amount: number) => {
    return `$${(amount / 2500).toFixed(0)}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.name}>{user?.business_name || user?.name || 'Seller'}</Text>
            {(user?.is_women_owned || stats?.is_women_owned) && (
              <View style={styles.womenOwnedBadge}>
                <Ionicons name="heart" size={12} color={COLORS.pink} />
                <Text style={styles.womenOwnedText}>Women-Owned Business</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => router.push('/seller/profile')}
            data-testid="profile-btn"
          >
            <Ionicons name="person-circle-outline" size={40} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* Trade Finance Metrics */}
        {stats?.trade_metrics && (
          <View style={styles.tradeMetricsCard}>
            <View style={styles.tradeMetricsHeader}>
              <View style={styles.tradeMetricsIconBg}>
                <Ionicons name="trending-up" size={18} color={COLORS.success} />
              </View>
              <Text style={styles.tradeMetricsTitle}>Trade Finance Profile</Text>
              {stats.trade_metrics.credit_score_eligible && (
                <View style={styles.creditBadge}>
                  <Ionicons name="checkmark-circle" size={12} color={COLORS.success} />
                  <Text style={styles.creditBadgeText}>Credit Eligible</Text>
                </View>
              )}
            </View>
            <View style={styles.tradeMetricsRow}>
              <View style={styles.tradeMetricItem}>
                <Text style={styles.tradeMetricValue}>{stats.trade_metrics.success_rate}%</Text>
                <Text style={styles.tradeMetricLabel}>Success Rate</Text>
              </View>
              <View style={styles.tradeMetricDivider} />
              <View style={styles.tradeMetricItem}>
                <Text style={styles.tradeMetricValue}>{stats.trade_metrics.successful_transactions}</Text>
                <Text style={styles.tradeMetricLabel}>Completed</Text>
              </View>
              <View style={styles.tradeMetricDivider} />
              <View style={styles.tradeMetricItem}>
                <Text style={styles.tradeMetricValue}>{stats.trade_metrics.repeat_buyers}</Text>
                <Text style={styles.tradeMetricLabel}>Repeat Buyers</Text>
              </View>
            </View>
          </View>
        )}

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <View style={[styles.statCard, styles.primaryCard]}>
              <View style={styles.statCardHeader}>
                <Ionicons name="wallet" size={20} color={COLORS.white} />
                <Text style={styles.statLabel}>Total Earnings</Text>
              </View>
              <Text style={styles.statValue}>{formatTZS(stats?.total_earnings || 0)}</Text>
              <Text style={styles.statValueSmall}>≈ {formatUSD(stats?.total_earnings || 0)} USD</Text>
            </View>
            <View style={[styles.statCard, styles.successCard]}>
              <View style={styles.statCardHeader}>
                <Ionicons name="lock-closed" size={18} color={COLORS.success} />
                <Text style={styles.statLabelDark}>In Escrow</Text>
              </View>
              <Text style={styles.statValueDark}>{formatTZS(stats?.pending_earnings || 0)}</Text>
              <View style={styles.escrowBadge}>
                <Ionicons name="shield-checkmark" size={12} color={COLORS.success} />
                <Text style={styles.escrowText}>NMB Protected</Text>
              </View>
            </View>
          </View>
          
          {/* International Earnings */}
          {(stats?.international_orders > 0 || stats?.international_earnings > 0) && (
            <View style={[styles.statCardFull, styles.blueCard]}>
              <View style={styles.internationalHeader}>
                <Ionicons name="globe" size={22} color={COLORS.white} />
                <Text style={styles.internationalLabel}>Diaspora Sales</Text>
              </View>
              <Text style={styles.statValue}>{formatTZS(stats?.international_earnings || 0)}</Text>
              <Text style={styles.statValueSmall}>{stats?.international_orders || 0} international orders</Text>
            </View>
          )}

          <View style={styles.statsRow}>
            <View style={styles.statCardSmall}>
              <View style={[styles.statIconBg, { backgroundColor: COLORS.purpleBg }]}>
                <Ionicons name="cube" size={20} color={COLORS.purple} />
              </View>
              <Text style={styles.statNumber}>{stats?.products_count || 0}</Text>
              <Text style={styles.statLabelSmall}>Products</Text>
            </View>
            <View style={styles.statCardSmall}>
              <View style={[styles.statIconBg, { backgroundColor: COLORS.goldBg }]}>
                <Ionicons name="cart" size={20} color={COLORS.gold} />
              </View>
              <Text style={styles.statNumber}>{stats?.total_orders || 0}</Text>
              <Text style={styles.statLabelSmall}>Orders</Text>
            </View>
            <View style={styles.statCardSmall}>
              <View style={[styles.statIconBg, { backgroundColor: COLORS.blueBg }]}>
                <Ionicons name="globe" size={20} color={COLORS.blue} />
              </View>
              <Text style={styles.statNumber}>{stats?.international_orders || 0}</Text>
              <Text style={styles.statLabelSmall}>Global</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/seller/create')}
              data-testid="create-link-btn"
            >
              <View style={[styles.actionIcon, { backgroundColor: COLORS.purpleBg }]}>
                <Ionicons name="add-circle" size={28} color={COLORS.purple} />
              </View>
              <Text style={styles.actionText}>Create Link</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/seller/orders')}
              data-testid="view-orders-btn"
            >
              <View style={[styles.actionIcon, { backgroundColor: COLORS.goldBg }]}>
                <Ionicons name="list" size={28} color={COLORS.gold} />
              </View>
              <Text style={styles.actionText}>View Orders</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* NALA Payment Info */}
        <View style={styles.nalaCard}>
          <View style={styles.nalaIconBg}>
            <Ionicons name="globe" size={24} color={COLORS.blue} />
          </View>
          <View style={styles.nalaContent}>
            <Text style={styles.nalaTitle}>Receive Diaspora Payments</Text>
            <Text style={styles.nalaText}>
              Accept payments from UK, US, EU via NALA with lower fees.
            </Text>
            <View style={styles.currencyRow}>
              <View style={styles.currencyBadge}><Text style={styles.currencyText}>USD</Text></View>
              <View style={styles.currencyBadge}><Text style={styles.currencyText}>GBP</Text></View>
              <View style={styles.currencyBadge}><Text style={styles.currencyText}>EUR</Text></View>
            </View>
          </View>
        </View>

        {/* Recent Products */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Products</Text>
            {products.length > 0 && (
              <TouchableOpacity>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            )}
          </View>
          {products.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconBg}>
                <Ionicons name="cube-outline" size={40} color={COLORS.lightGray} />
              </View>
              <Text style={styles.emptyText}>No products yet</Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => router.push('/seller/create')}
              >
                <Text style={styles.emptyButtonText}>Create your first payment link</Text>
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
          <Text style={styles.logoutText}>Sign Out</Text>
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
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  greeting: {
    fontSize: 14,
    color: COLORS.gray,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.dark,
    letterSpacing: -0.5,
  },
  womenOwnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    backgroundColor: COLORS.pinkBg,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  womenOwnedText: {
    fontSize: 12,
    color: COLORS.pink,
    fontWeight: '600',
  },
  profileButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tradeMetricsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.success,
  },
  tradeMetricsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  tradeMetricsIconBg: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.successBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tradeMetricsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.dark,
    flex: 1,
  },
  creditBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.successBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  creditBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.success,
  },
  tradeMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tradeMetricItem: {
    alignItems: 'center',
    flex: 1,
  },
  tradeMetricDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.lightGray,
  },
  tradeMetricValue: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.dark,
  },
  tradeMetricLabel: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 4,
  },
  statsContainer: {
    gap: 12,
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
  },
  statCardFull: {
    padding: 16,
    borderRadius: 16,
  },
  primaryCard: {
    backgroundColor: COLORS.primary,
  },
  successCard: {
    backgroundColor: COLORS.successBg,
  },
  blueCard: {
    backgroundColor: COLORS.blue,
  },
  statCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
  },
  statLabelDark: {
    fontSize: 13,
    color: COLORS.success,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.white,
  },
  statValueSmall: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  statValueDark: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.success,
  },
  escrowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  escrowText: {
    fontSize: 11,
    color: COLORS.success,
    fontWeight: '500',
  },
  internationalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  internationalLabel: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },
  statCardSmall: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  statIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.dark,
  },
  statLabelSmall: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 4,
  },
  nalaCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.blueBg,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    gap: 14,
  },
  nalaIconBg: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nalaContent: {
    flex: 1,
  },
  nalaTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E40AF',
    marginBottom: 4,
  },
  nalaText: {
    fontSize: 13,
    color: COLORS.blue,
    marginBottom: 12,
    lineHeight: 18,
  },
  currencyRow: {
    flexDirection: 'row',
    gap: 8,
  },
  currencyBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  currencyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E40AF',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.dark,
    marginBottom: 12,
  },
  seeAllText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.dark,
  },
  emptyState: {
    backgroundColor: COLORS.white,
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
  },
  emptyIconBg: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.gray,
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
    borderRadius: 14,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    color: COLORS.gray,
    marginTop: 4,
  },
  exportBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    backgroundColor: COLORS.blueBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  exportText: {
    fontSize: 11,
    color: COLORS.blue,
    fontWeight: '500',
  },
  productCode: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
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
    backgroundColor: COLORS.white,
    borderRadius: 14,
  },
  logoutText: {
    fontSize: 16,
    color: COLORS.error,
    fontWeight: '600',
  },
});
