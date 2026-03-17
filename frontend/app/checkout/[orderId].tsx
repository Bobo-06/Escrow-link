import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ordersApi, paymentsApi } from '../../src/api/api';
import TrustBadge from '../../src/components/TrustBadge';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL || '';

type Step = 'delivery' | 'payment' | 'processing' | 'success';

const paymentMethods = [
  { id: 'mpesa', name: 'M-Pesa', icon: 'phone-portrait-outline' },
  { id: 'airtel', name: 'Airtel Money', icon: 'phone-portrait-outline' },
  { id: 'tigo', name: 'Tigo Pesa', icon: 'phone-portrait-outline' },
];

export default function Checkout() {
  const router = useRouter();
  const { orderId, productId } = useLocalSearchParams<{ orderId: string; productId: string }>();
  const [step, setStep] = useState<Step>('delivery');
  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [deliveryData, setDeliveryData] = useState({
    buyer_name: '',
    buyer_phone: '',
    buyer_location: '',
  });

  const [selectedPayment, setSelectedPayment] = useState('mpesa');

  // Load product details if creating new order
  const [product, setProduct] = useState<any>(null);

  useEffect(() => {
    if (productId) {
      loadProduct();
    }
  }, [productId]);

  const loadProduct = async () => {
    try {
      // Get product by ID via pay endpoint (we need to get it differently)
      const response = await axios.get(`${API_URL}/api/products/${productId}`);
      setProduct(response.data);
    } catch (error) {
      // Try to get product info from the order
      console.log('Could not load product directly');
    }
  };

  const handleDeliverySubmit = () => {
    if (!deliveryData.buyer_name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }
    if (!deliveryData.buyer_phone.trim()) {
      Alert.alert('Error', 'Please enter your phone number');
      return;
    }
    if (!deliveryData.buyer_location.trim()) {
      Alert.alert('Error', 'Please enter your delivery location');
      return;
    }
    setStep('payment');
  };

  const handlePayment = async () => {
    setIsLoading(true);
    setStep('processing');

    try {
      // Create order
      const orderResponse = await ordersApi.create({
        product_id: productId || '',
        buyer_name: deliveryData.buyer_name,
        buyer_phone: deliveryData.buyer_phone,
        buyer_location: deliveryData.buyer_location,
        payment_method: selectedPayment,
      });

      const newOrder = orderResponse.data;

      // Simulate payment
      await paymentsApi.simulate(newOrder.order_id, selectedPayment);

      setOrder(newOrder);
      setStep('success');
    } catch (error: any) {
      Alert.alert('Payment Failed', error.response?.data?.detail || 'Could not process payment');
      setStep('payment');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTZS = (amount: number) => `TZS ${amount?.toLocaleString() || 0}`;

  // Delivery Details Step
  if (step === 'delivery') {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                <Ionicons name="arrow-back" size={24} color="#1F2937" />
              </TouchableOpacity>
              <Text style={styles.title}>Delivery Details</Text>
              <View style={styles.placeholder} />
            </View>

            {/* Progress */}
            <View style={styles.progress}>
              <View style={[styles.progressDot, styles.progressActive]} />
              <View style={styles.progressLine} />
              <View style={styles.progressDot} />
            </View>

            {/* Form */}
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Your Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your full name"
                  placeholderTextColor="#9CA3AF"
                  value={deliveryData.buyer_name}
                  onChangeText={(text) => setDeliveryData({ ...deliveryData, buyer_name: text })}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Phone Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="+255 xxx xxx xxx"
                  placeholderTextColor="#9CA3AF"
                  value={deliveryData.buyer_phone}
                  onChangeText={(text) => setDeliveryData({ ...deliveryData, buyer_phone: text })}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Delivery Location</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Enter your full address"
                  placeholderTextColor="#9CA3AF"
                  value={deliveryData.buyer_location}
                  onChangeText={(text) => setDeliveryData({ ...deliveryData, buyer_location: text })}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </View>

            <TrustBadge variant="compact" />
          </ScrollView>

          {/* Continue Button */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.continueButton} onPress={handleDeliverySubmit}>
              <Text style={styles.continueButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // Payment Step
  if (step === 'payment') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => setStep('delivery')}>
              <Ionicons name="arrow-back" size={24} color="#1F2937" />
            </TouchableOpacity>
            <Text style={styles.title}>Choose Payment</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Progress */}
          <View style={styles.progress}>
            <View style={[styles.progressDot, styles.progressComplete]} />
            <View style={[styles.progressLine, styles.progressLineActive]} />
            <View style={[styles.progressDot, styles.progressActive]} />
          </View>

          {/* Payment Methods */}
          <View style={styles.paymentMethods}>
            <Text style={styles.sectionTitle}>Select Payment Method</Text>
            {paymentMethods.map((method) => (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.paymentOption,
                  selectedPayment === method.id && styles.paymentOptionSelected,
                ]}
                onPress={() => setSelectedPayment(method.id)}
              >
                <Ionicons
                  name={method.icon as any}
                  size={24}
                  color={selectedPayment === method.id ? '#7C3AED' : '#6B7280'}
                />
                <Text
                  style={[
                    styles.paymentOptionText,
                    selectedPayment === method.id && styles.paymentOptionTextSelected,
                  ]}
                >
                  {method.name}
                </Text>
                <View style={styles.radioOuter}>
                  {selectedPayment === method.id && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Order Summary */}
          {product && (
            <View style={styles.orderSummary}>
              <Text style={styles.sectionTitle}>Order Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{product.name}</Text>
                <Text style={styles.summaryValue}>{formatTZS(product.price)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Protection Fee</Text>
                <Text style={styles.summaryValue}>{formatTZS(product.buyer_protection_fee)}</Text>
              </View>
              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>{formatTZS(product.total_buyer_pays)}</Text>
              </View>
            </View>
          )}

          {/* Escrow Info */}
          <View style={styles.escrowInfo}>
            <Ionicons name="lock-closed" size={20} color="#059669" />
            <Text style={styles.escrowText}>Held safely in escrow until delivery</Text>
          </View>
        </ScrollView>

        {/* Pay Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.payButton, isLoading && styles.buttonDisabled]}
            onPress={handlePayment}
            disabled={isLoading}
          >
            <Ionicons name="shield-checkmark" size={24} color="#FFFFFF" />
            <Text style={styles.payButtonText}>Pay Now</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Processing Step
  if (step === 'processing') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.processingContainer}>
          <View style={styles.processingIcon}>
            <Ionicons name="hourglass" size={48} color="#7C3AED" />
          </View>
          <Text style={styles.processingTitle}>Processing Payment</Text>
          <Text style={styles.processingText}>
            Please wait while we confirm your payment...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Success Step
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.successContainer}>
        <View style={styles.successIcon}>
          <Ionicons name="checkmark-circle" size={80} color="#059669" />
        </View>
        <Text style={styles.successTitle}>Payment Successful</Text>
        <Text style={styles.successText}>Your money is safe in escrow.</Text>
        <Text style={styles.successSubtext}>Seller will now prepare your order.</Text>

        <TouchableOpacity
          style={styles.trackButton}
          onPress={() => router.replace({
            pathname: '/track/[orderId]',
            params: { orderId: order?.order_id }
          })}
        >
          <Ionicons name="location" size={20} color="#FFFFFF" />
          <Text style={styles.trackButtonText}>Track Order</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
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
  progress: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E5E7EB',
  },
  progressActive: {
    backgroundColor: '#7C3AED',
  },
  progressComplete: {
    backgroundColor: '#059669',
  },
  progressLine: {
    width: 80,
    height: 2,
    backgroundColor: '#E5E7EB',
  },
  progressLineActive: {
    backgroundColor: '#059669',
  },
  form: {
    gap: 20,
    marginBottom: 24,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1F2937',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  continueButton: {
    backgroundColor: '#7C3AED',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  paymentMethods: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 12,
  },
  paymentOptionSelected: {
    borderColor: '#7C3AED',
    backgroundColor: '#F5F3FF',
  },
  paymentOptionText: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
  },
  paymentOptionTextSelected: {
    color: '#7C3AED',
    fontWeight: '600',
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#7C3AED',
  },
  orderSummary: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 14,
    color: '#1F2937',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
    marginTop: 8,
    marginBottom: 0,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#7C3AED',
  },
  escrowInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
  },
  escrowText: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '500',
  },
  payButton: {
    backgroundColor: '#7C3AED',
    paddingVertical: 18,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  payButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  processingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  processingIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  processingTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  processingText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  successIcon: {
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  successText: {
    fontSize: 18,
    color: '#059669',
    fontWeight: '500',
  },
  successSubtext: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 8,
    marginBottom: 32,
  },
  trackButton: {
    backgroundColor: '#7C3AED',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trackButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
