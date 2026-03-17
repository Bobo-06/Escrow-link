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
        {/* Header with Women-Owned Badge */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.name}>{user?.business_name || user?.name || 'Seller'}</Text>
            {(user?.is_women_owned || stats?.is_women_owned) && (
              <View style={styles.womenOwnedBadge}>
                <Ionicons name="heart" size={14} color="#EC4899" />
                <Text style={styles.womenOwnedText}>Women-Owned Business</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => router.push('/seller/profile')}
          >
            <Ionicons name="person-circle-outline" size={40} color="#7C3AED" />
          </TouchableOpacity>
        </View>

        {/* Trade Finance Metrics */}
        {stats?.trade_metrics && (
          <View style={styles.tradeMetricsCard}>
            <View style={styles.tradeMetricsHeader}>
              <Ionicons name="trending-up" size={20} color="#059669" />
              <Text style={styles.tradeMetricsTitle}>Trade Finance Profile</Text>
              {stats.trade_metrics.credit_score_eligible && (
                <View style={styles.creditBadge}>
                  <Text style={styles.creditBadgeText}>Credit Eligible</Text>
                </View>
              )}
            </View>
            <View style={styles.tradeMetricsRow}>
              <View style={styles.tradeMetricItem}>
                <Text style={styles.tradeMetricValue}>{stats.trade_metrics.success_rate}%</Text>
                <Text style={styles.tradeMetricLabel}>Success Rate</Text>
              </View>
              <View style={styles.tradeMetricItem}>
                <Text style={styles.tradeMetricValue}>{stats.trade_metrics.successful_transactions}</Text>
                <Text style={styles.tradeMetricLabel}>Completed</Text>
              </View>
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
            <View style={[styles.statCard, styles.purpleCard]}>
              <Text style={styles.statLabel}>Total Earnings</Text>
              <Text style={styles.statValue}>{formatTZS(stats?.total_earnings || 0)}</Text>
              <Text style={styles.statValueSmall}>≈ {formatUSD(stats?.total_earnings || 0)} USD</Text>
            </View>
            <View style={[styles.statCard, styles.greenCard]}>
              <Text style={styles.statLabelDark}>In Escrow</Text>
              <Text style={styles.statValueDark}>{formatTZS(stats?.pending_earnings || 0)}</Text>
              <View style={styles.escrowBadge}>
                <Ionicons name="lock-closed" size={12} color="#059669" />
                <Text style={styles.escrowText}>NMB Protected</Text>
              </View>
            </View>
          </View>
          
          {/* International Earnings */}
          {(stats?.international_orders > 0 || stats?.international_earnings > 0) && (
            <View style={[styles.statCard, styles.blueCard]}>
              <View style={styles.internationalHeader}>
                <Ionicons name="globe-outline" size={20} color="#FFFFFF" />
                <Text style={styles.internationalLabel}>Diaspora Sales</Text>
              </View>
              <Text style={styles.statValue}>{formatTZS(stats?.international_earnings || 0)}</Text>
              <Text style={styles.statValueSmall}>{stats?.international_orders || 0} international orders</Text>
            </View>
          )}

          <View style={styles.statsRow}>
            <View style={styles.statCardSmall}>
              <Ionicons name="cube-outline" size={24} color="#7C3AED" />
              <Text style={styles.statNumber}>{stats?.products_count || 0}</Text>
              <Text style={styles.statLabelSmall}>Products</Text>
            </View>
            <View style={styles.statCardSmall}>
              <Ionicons name="cart-outline" size={24} color="#F59E0B" />
              <Text style={styles.statNumber}>{stats?.total_orders || 0}</Text>
              <Text style={styles.statLabelSmall}>Orders</Text>
            </View>
            <View style={styles.statCardSmall}>
              <Ionicons name="globe-outline" size={24} color="#3B82F6" />
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
            >
              <View style={[styles.actionIcon, { backgroundColor: '#EDE9FE' }]}>
                <Ionicons name="add-circle" size={28} color="#7C3AED" />
              </View>
              <Text style={styles.actionText}>Create Link</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/seller/orders')}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="list" size={28} color="#F59E0B" />
              </View>
              <Text style={styles.actionText}>View Orders</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* NALA Payment Info */}
        <View style={styles.nalaCard}>
          <View style={styles.nalaHeader}>
            <Ionicons name="globe" size={24} color="#3B82F6" />
            <Text style={styles.nalaTitle}>Receive Diaspora Payments</Text>
          </View>
          <Text style={styles.nalaText}>
            Accept payments from UK, US, EU via NALA. Lower fees for international buyers.
          </Text>
          <View style={styles.currencyRow}>
            <View style={styles.currencyBadge}><Text style={styles.currencyText}>USD</Text></View>
            <View style={styles.currencyBadge}><Text style={styles.currencyText}>GBP</Text></View>
            <View style={styles.currencyBadge}><Text style={styles.currencyText}>EUR</Text></View>
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
              <Ionicons name="cube-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>No products yet</Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => router.push('/seller/create')}
              >
                <Text style={styles.emptyButtonText}>Create your first payment link</Text>
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
                      <Ionicons name="airplane" size={12} color="#3B82F6" />
                      <Text style={styles.exportText}>Export Ready</Text>
                    </View>
                  )}
                </View>
                <View style={styles.productCode}>
                  <Ionicons name="link" size={16} color="#7C3AED" />
                  <Text style={styles.codeText}>{product.payment_link_code}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
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
    color: '#6B7280',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  womenOwnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    backgroundColor: '#FDF2F8',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  womenOwnedText: {
    fontSize: 12,
    color: '#EC4899',
    fontWeight: '500',
  },
  profileButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tradeMetricsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#059669',
  },
  tradeMetricsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  tradeMetricsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  creditBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  creditBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#059669',
  },
  tradeMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  tradeMetricItem: {
    alignItems: 'center',
  },
  tradeMetricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  tradeMetricLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
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
  purpleCard: {
    backgroundColor: '#7C3AED',
  },
  greenCard: {
    backgroundColor: '#ECFDF5',
  },
  blueCard: {
    backgroundColor: '#3B82F6',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  statLabelDark: {
    fontSize: 12,
    color: '#065F46',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  statValueSmall: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  statValueDark: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#059669',
  },
  escrowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  escrowText: {
    fontSize: 10,
    color: '#059669',
  },
  internationalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  internationalLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  statCardSmall: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 8,
  },
  statLabelSmall: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  nalaCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  nalaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  nalaTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E40AF',
  },
  nalaText: {
    fontSize: 14,
    color: '#3B82F6',
    marginBottom: 12,
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
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  seeAllText: {
    fontSize: 14,
    color: '#7C3AED',
    fontWeight: '500',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    color: '#1F2937',
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
  },
  emptyButton: {
    marginTop: 16,
  },
  emptyButtonText: {
    fontSize: 14,
    color: '#7C3AED',
    fontWeight: '600',
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
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
    fontWeight: '500',
    color: '#1F2937',
  },
  productPrice: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  exportBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  exportText: {
    fontSize: 10,
    color: '#3B82F6',
    fontWeight: '500',
  },
  productCode: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  codeText: {
    fontSize: 12,
    color: '#7C3AED',
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    marginTop: 8,
  },
  logoutText: {
    fontSize: 16,
    color: '#EF4444',
    fontWeight: '500',
  },
});
