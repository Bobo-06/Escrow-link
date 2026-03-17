import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ordersApi } from '../../src/api/api';

const orderSteps = [
  { key: 'paid', label: 'Payment Secured' },
  { key: 'preparing', label: 'Preparing Order' },
  { key: 'shipped', label: 'Out for Delivery' },
  { key: 'delivered', label: 'Delivered' },
];

const statusOrder = ['pending_payment', 'paid', 'preparing', 'shipped', 'delivered', 'completed'];

export default function TrackOrder() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const [order, setOrder] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  const loadOrder = async () => {
    try {
      const response = await ordersApi.get(orderId || '');
      setOrder(response.data);
    } catch (error) {
      console.error('Load order error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrder();
    setRefreshing(false);
  };

  const getCurrentStepIndex = () => {
    if (!order) return -1;
    return statusOrder.indexOf(order.status);
  };

  const isStepComplete = (stepKey: string) => {
    const currentIndex = getCurrentStepIndex();
    const stepIndex = statusOrder.indexOf(stepKey);
    return stepIndex <= currentIndex;
  };

  const formatPrice = (amount: number) => `TZS ${amount?.toLocaleString() || 0}`;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Your Order</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Ionicons name="hourglass" size={48} color="#16A34A" />
          <Text style={styles.loadingText}>Loading order...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Your Order</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#EF4444" />
          <Text style={styles.errorTitle}>Order Not Found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const showConfirmButton = order.status === 'shipped' || order.status === 'delivered';

  return (
    <SafeAreaView style={styles.container}>
      {/* Green Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Order</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Product Card */}
        <View style={styles.productCard}>
          <View style={styles.productImageContainer}>
            {order.product_image ? (
              <Image source={{ uri: order.product_image }} style={styles.productImage} />
            ) : (
              <View style={styles.productImagePlaceholder}>
                <Ionicons name="cube" size={40} color="#9CA3AF" />
              </View>
            )}
          </View>
          <View style={styles.productInfo}>
            <Text style={styles.productName}>{order.product_name}</Text>
            <Text style={styles.productPrice}>{formatPrice(order.total_paid)}</Text>
          </View>
        </View>

        {/* Progress Steps - Matching the design */}
        <View style={styles.progressContainer}>
          {orderSteps.map((step, index) => {
            const complete = isStepComplete(step.key);

            return (
              <View key={step.key} style={styles.stepRow}>
                <View style={styles.stepIndicator}>
                  {complete ? (
                    <Ionicons name="checkmark-circle" size={24} color="#16A34A" />
                  ) : (
                    <View style={styles.emptyCheckbox} />
                  )}
                </View>
                <Text style={[
                  styles.stepLabel,
                  complete && styles.stepLabelComplete
                ]}>
                  {step.label}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Updates Section */}
        <View style={styles.updatesSection}>
          {order.status !== 'pending_payment' && (
            <>
              <View style={styles.updateItem}>
                <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
                <Text style={styles.updateText}>Order confirmed by seller</Text>
              </View>
              {(order.status === 'preparing' || statusOrder.indexOf(order.status) > statusOrder.indexOf('preparing')) && (
                <View style={styles.updateItem}>
                  <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
                  <Text style={styles.updateText}>Materials purchased</Text>
                </View>
              )}
            </>
          )}
        </View>

        {/* Escrow Status */}
        <View style={styles.escrowStatus}>
          <Ionicons name="shield-checkmark" size={18} color="#16A34A" />
          <Text style={styles.escrowText}>
            {order.escrow_status === 'held'
              ? 'Your payment is still protected'
              : order.escrow_status === 'released'
              ? 'Payment released to seller'
              : 'Awaiting payment'}
          </Text>
        </View>

        {/* Contact Support Button */}
        <TouchableOpacity style={styles.supportButton}>
          <Ionicons name="call" size={18} color="#FFFFFF" />
          <Text style={styles.supportButtonText}>Contact Support</Text>
        </TouchableOpacity>

        {/* Confirm Delivery Button - Only show when shipped */}
        {showConfirmButton && order.status !== 'completed' && (
          <TouchableOpacity
            style={styles.confirmDeliveryButton}
            onPress={() =>
              router.push({
                pathname: '/confirm/[orderId]',
                params: { orderId: order.order_id },
              })
            }
          >
            <Text style={styles.confirmDeliveryText}>Received your order?</Text>
            <Ionicons name="chevron-forward" size={20} color="#16A34A" />
          </TouchableOpacity>
        )}

        {/* International Order Badge */}
        {order.is_international && (
          <View style={styles.internationalBadge}>
            <Ionicons name="globe" size={16} color="#3B82F6" />
            <Text style={styles.internationalText}>
              International order via NALA
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    backgroundColor: '#16A34A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 16,
  },
  scrollContent: {
    padding: 20,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginBottom: 24,
  },
  productImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  productImagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  productPrice: {
    fontSize: 16,
    color: '#16A34A',
    fontWeight: '500',
    marginTop: 4,
  },
  progressContainer: {
    marginBottom: 24,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  stepIndicator: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#D1D5DB',
  },
  stepLabel: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  stepLabelComplete: {
    color: '#1F2937',
    fontWeight: '500',
  },
  updatesSection: {
    marginBottom: 20,
  },
  updateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  updateText: {
    fontSize: 14,
    color: '#374151',
  },
  escrowStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 14,
    backgroundColor: '#DCFCE7',
    borderRadius: 10,
    marginBottom: 20,
  },
  escrowText: {
    fontSize: 14,
    color: '#16A34A',
    fontWeight: '500',
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 16,
  },
  supportButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  confirmDeliveryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#DCFCE7',
    borderRadius: 10,
    marginBottom: 16,
  },
  confirmDeliveryText: {
    fontSize: 16,
    color: '#16A34A',
    fontWeight: '500',
  },
  internationalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
  },
  internationalText: {
    fontSize: 14,
    color: '#3B82F6',
  },
});
