import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ordersApi } from '../../src/api/api';

const orderSteps = [
  { key: 'paid', label: 'Payment Received', icon: 'card' },
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
    const currentStatus = order.status;
    return statusOrder.indexOf(currentStatus);
  };

  const isStepComplete = (stepKey: string) => {
    const currentIndex = getCurrentStepIndex();
    const stepIndex = statusOrder.indexOf(stepKey);
    return stepIndex <= currentIndex;
  };

  const isStepActive = (stepKey: string) => {
    return order?.status === stepKey;
  };

  const formatTZS = (amount: number) => `TZS ${amount?.toLocaleString() || 0}`;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="hourglass" size={48} color="#7C3AED" />
          <Text style={styles.loadingText}>Loading order...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.container}>
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
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.title}>Order Progress</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Product Info */}
        <View style={styles.productCard}>
          <Text style={styles.productName}>{order.product_name}</Text>
          <Text style={styles.productPrice}>{formatTZS(order.total_paid)}</Text>
        </View>

        {/* Progress Steps */}
        <View style={styles.progressContainer}>
          {orderSteps.map((step, index) => {
            const complete = isStepComplete(step.key);
            const active = isStepActive(step.key);

            return (
              <View key={step.key} style={styles.stepContainer}>
                <View style={styles.stepIndicator}>
                  <View
                    style={[
                      styles.stepCircle,
                      complete && styles.stepCircleComplete,
                      active && styles.stepCircleActive,
                    ]}
                  >
                    {complete ? (
                      <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                    ) : (
                      <Ionicons
                        name={step.icon as any}
                        size={20}
                        color={active ? '#7C3AED' : '#D1D5DB'}
                      />
                    )}
                  </View>
                  {index < orderSteps.length - 1 && (
                    <View
                      style={[
                        styles.stepLine,
                        complete && styles.stepLineComplete,
                      ]}
                    />
                  )}
                </View>
                <View style={styles.stepContent}>
                  <Text
                    style={[
                      styles.stepLabel,
                      complete && styles.stepLabelComplete,
                      active && styles.stepLabelActive,
                    ]}
                  >
                    {step.label}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Escrow Status */}
        <View style={styles.escrowCard}>
          <Ionicons
            name={order.escrow_status === 'held' ? 'lock-closed' : 'lock-open'}
            size={24}
            color={order.escrow_status === 'held' ? '#059669' : '#F59E0B'}
          />
          <View style={styles.escrowContent}>
            <Text style={styles.escrowTitle}>
              {order.escrow_status === 'held'
                ? 'Payment Protected'
                : order.escrow_status === 'released'
                ? 'Payment Released'
                : 'Awaiting Payment'}
            </Text>
            <Text style={styles.escrowText}>
              {order.escrow_status === 'held'
                ? 'Your money is held safely in escrow'
                : order.escrow_status === 'released'
                ? 'Payment has been released to seller'
                : 'Waiting for payment confirmation'}
            </Text>
          </View>
        </View>

        {/* Seller Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Seller</Text>
          <Text style={styles.infoValue}>{order.seller_name}</Text>
        </View>

        {/* Delivery Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Delivery Address</Text>
          <Text style={styles.infoValue}>{order.buyer_location}</Text>
        </View>
      </ScrollView>

      {/* Action Button */}
      {showConfirmButton && order.status !== 'completed' && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={() =>
              router.push({
                pathname: '/confirm/[orderId]',
                params: { orderId: order.order_id },
              })
            }
          >
            <Text style={styles.confirmButtonText}>Confirm Delivery</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  placeholder: {
    width: 44,
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  productName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  productPrice: {
    fontSize: 18,
    color: '#7C3AED',
    marginTop: 4,
  },
  progressContainer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepIndicator: {
    alignItems: 'center',
    marginRight: 16,
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  stepCircleComplete: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  stepCircleActive: {
    backgroundColor: '#EDE9FE',
    borderColor: '#7C3AED',
  },
  stepLine: {
    width: 2,
    height: 32,
    backgroundColor: '#E5E7EB',
  },
  stepLineComplete: {
    backgroundColor: '#059669',
  },
  stepContent: {
    flex: 1,
    paddingTop: 8,
    paddingBottom: 24,
  },
  stepLabel: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  stepLabelComplete: {
    color: '#059669',
    fontWeight: '500',
  },
  stepLabelActive: {
    color: '#7C3AED',
    fontWeight: '600',
  },
  escrowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  escrowContent: {
    flex: 1,
  },
  escrowTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#065F46',
  },
  escrowText: {
    fontSize: 14,
    color: '#047857',
    marginTop: 2,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
  footer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  confirmButton: {
    backgroundColor: '#059669',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
