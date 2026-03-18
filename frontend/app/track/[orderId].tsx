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

const COLORS = {
  primary: '#0D9488',
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
};

const orderSteps = [
  { key: 'paid', label: 'Payment Secured', icon: 'shield-checkmark' },
  { key: 'preparing', label: 'Preparing Order', icon: 'cube' },
  { key: 'shipped', label: 'Out for Delivery', icon: 'car' },
  { key: 'delivered', label: 'Delivered', icon: 'checkmark-circle' },
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
            <Ionicons name="chevron-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Your Order</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingIconBg}>
            <Ionicons name="hourglass" size={36} color={COLORS.primary} />
          </View>
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
            <Ionicons name="chevron-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Your Order</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <View style={styles.errorIconBg}>
            <Ionicons name="alert-circle" size={48} color="#EF4444" />
          </View>
          <Text style={styles.errorTitle}>Order Not Found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const showConfirmButton = order.status === 'shipped' || order.status === 'delivered';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} data-testid="back-btn">
          <Ionicons name="chevron-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Track Order</Text>
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
                <Ionicons name="cube" size={32} color={COLORS.lightGray} />
              </View>
            )}
          </View>
          <View style={styles.productInfo}>
            <Text style={styles.productName}>{order.product_name}</Text>
            <Text style={styles.productPrice}>{formatPrice(order.total_paid)}</Text>
            <View style={styles.orderIdBadge}>
              <Text style={styles.orderIdText}>#{order.order_id.slice(-8)}</Text>
            </View>
          </View>
        </View>

        {/* Progress Steps */}
        <View style={styles.progressContainer}>
          <Text style={styles.progressTitle}>Order Progress</Text>
          {orderSteps.map((step, index) => {
            const complete = isStepComplete(step.key);
            const isLast = index === orderSteps.length - 1;

            return (
              <View key={step.key}>
                <View style={styles.stepRow}>
                  <View style={[
                    styles.stepIndicator,
                    complete && styles.stepIndicatorComplete
                  ]}>
                    <Ionicons 
                      name={complete ? 'checkmark' : step.icon as any} 
                      size={16} 
                      color={complete ? COLORS.white : COLORS.gray} 
                    />
                  </View>
                  <Text style={[
                    styles.stepLabel,
                    complete && styles.stepLabelComplete
                  ]}>
                    {step.label}
                  </Text>
                </View>
                {!isLast && (
                  <View style={[
                    styles.stepConnector,
                    complete && styles.stepConnectorComplete
                  ]} />
                )}
              </View>
            );
          })}
        </View>

        {/* Escrow Status */}
        <View style={styles.escrowStatus}>
          <View style={styles.escrowIconBg}>
            <Ionicons name="shield-checkmark" size={18} color={COLORS.success} />
          </View>
          <View style={styles.escrowTextBox}>
            <Text style={styles.escrowTitle}>
              {order.escrow_status === 'held'
                ? 'Payment Protected'
                : order.escrow_status === 'released'
                ? 'Payment Released to Seller'
                : 'Awaiting Payment'}
            </Text>
            <Text style={styles.escrowSubtitle}>
              {order.escrow_status === 'held'
                ? 'Your payment is safely held in NMB escrow'
                : order.escrow_status === 'released'
                ? 'Order completed successfully'
                : 'Complete payment to proceed'}
            </Text>
          </View>
        </View>

        {/* Contact Support Button */}
        <TouchableOpacity style={styles.supportButton} data-testid="contact-support-btn">
          <Ionicons name="headset" size={20} color={COLORS.white} />
          <Text style={styles.supportButtonText}>Contact Support</Text>
        </TouchableOpacity>

        {/* Confirm Delivery Button */}
        {showConfirmButton && order.status !== 'completed' && (
          <TouchableOpacity
            style={styles.confirmDeliveryButton}
            onPress={() =>
              router.push({
                pathname: '/confirm/[orderId]',
                params: { orderId: order.order_id },
              })
            }
            data-testid="confirm-delivery-btn"
          >
            <View style={styles.confirmDeliveryContent}>
              <Ionicons name="checkmark-done" size={22} color={COLORS.success} />
              <Text style={styles.confirmDeliveryText}>Received your order?</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={COLORS.success} />
          </TouchableOpacity>
        )}

        {/* International Order Badge */}
        {order.is_international && (
          <View style={styles.internationalBadge}>
            <Ionicons name="globe" size={18} color={COLORS.blue} />
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
    backgroundColor: COLORS.white,
  },
  header: {
    backgroundColor: COLORS.primary,
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
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingIconBg: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: '#CCFBF1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.gray,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorIconBg: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.dark,
  },
  scrollContent: {
    padding: 20,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    backgroundColor: COLORS.background,
    borderRadius: 16,
    marginBottom: 24,
  },
  productImageContainer: {
    width: 72,
    height: 72,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: COLORS.white,
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
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.dark,
  },
  productPrice: {
    fontSize: 15,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: 4,
  },
  orderIdBadge: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  orderIdText: {
    fontSize: 12,
    color: COLORS.gray,
    fontWeight: '500',
  },
  progressContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.dark,
    marginBottom: 20,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  stepIndicator: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepIndicatorComplete: {
    backgroundColor: COLORS.success,
  },
  stepLabel: {
    fontSize: 15,
    color: COLORS.gray,
    flex: 1,
  },
  stepLabelComplete: {
    color: COLORS.dark,
    fontWeight: '600',
  },
  stepConnector: {
    width: 3,
    height: 24,
    backgroundColor: COLORS.lightGray,
    marginLeft: 14,
    marginVertical: 4,
    borderRadius: 2,
  },
  stepConnectorComplete: {
    backgroundColor: COLORS.success,
  },
  escrowStatus: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    padding: 16,
    backgroundColor: COLORS.successBg,
    borderRadius: 16,
    marginBottom: 16,
  },
  escrowIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  escrowTextBox: {
    flex: 1,
  },
  escrowTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.success,
  },
  escrowSubtitle: {
    fontSize: 13,
    color: '#065F46',
    marginTop: 4,
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: COLORS.blue,
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 16,
  },
  supportButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  confirmDeliveryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    backgroundColor: COLORS.successBg,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  confirmDeliveryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  confirmDeliveryText: {
    fontSize: 16,
    color: COLORS.success,
    fontWeight: '600',
  },
  internationalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    backgroundColor: COLORS.blueBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  internationalText: {
    fontSize: 14,
    color: COLORS.blue,
    fontWeight: '500',
  },
});
