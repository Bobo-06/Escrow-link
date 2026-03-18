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
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL || '';

const COLORS = {
  primary: '#0D9488',
  primaryLight: '#14B8A6',
  gold: '#F59E0B',
  goldBg: '#FFFBEB',
  dark: '#0F172A',
  darkGray: '#1E293B',
  gray: '#64748B',
  lightGray: '#E2E8F0',
  inputBg: '#F1F5F9',
  background: '#F8FAFC',
  white: '#FFFFFF',
  success: '#10B981',
  successBg: '#ECFDF5',
};

type Step = 'delivery' | 'payment' | 'processing' | 'success';

const paymentMethods = [
  { id: 'mpesa', name: 'M-Pesa', icon: 'phone-portrait' },
  { id: 'airtel', name: 'Airtel Money', icon: 'phone-portrait' },
  { id: 'tigo', name: 'Tigo Pesa', icon: 'phone-portrait' },
  { id: 'nala', name: 'NALA (Diaspora)', icon: 'globe' },
];

export default function Checkout() {
  const router = useRouter();
  const { productId, currency } = useLocalSearchParams<{ orderId: string; productId: string; currency: string }>();
  const [step, setStep] = useState<Step>('delivery');
  const [order, setOrder] = useState<any>(null);
  const [product, setProduct] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [deliveryData, setDeliveryData] = useState({
    buyer_name: '',
    buyer_phone: '',
    buyer_location: '',
    buyer_country: 'TZ',
  });

  const [selectedPayment, setSelectedPayment] = useState('mpesa');
  const selectedCurrency = currency || 'TZS';

  useEffect(() => {
    if (productId) loadProduct();
  }, [productId]);

  const loadProduct = async () => {
    try {
      const products = await axios.get(`${API_URL}/api/products`);
      const prod = products.data.find((p: any) => p.product_id === productId);
      if (prod) setProduct(prod);
    } catch (error) {
      console.log('Could not load product');
    }
  };

  const handleDeliverySubmit = () => {
    if (!deliveryData.buyer_name.trim()) {
      Alert.alert('Required', 'Please enter your name');
      return;
    }
    if (!deliveryData.buyer_phone.trim()) {
      Alert.alert('Required', 'Please enter your phone number');
      return;
    }
    if (!deliveryData.buyer_location.trim()) {
      Alert.alert('Required', 'Please enter your delivery location');
      return;
    }
    setStep('payment');
  };

  const handlePayment = async () => {
    setIsLoading(true);
    setStep('processing');

    try {
      const orderResponse = await ordersApi.create({
        product_id: productId || '',
        buyer_name: deliveryData.buyer_name,
        buyer_phone: deliveryData.buyer_phone,
        buyer_location: deliveryData.buyer_location,
        buyer_country: deliveryData.buyer_country,
        payment_method: selectedPayment,
        buyer_currency: selectedCurrency,
      });

      const newOrder = orderResponse.data;
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

  const formatPrice = (amount: number) => `TZS ${amount?.toLocaleString() || 0}`;

  // STEP 1: Delivery Details
  if (step === 'delivery') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} data-testid="back-btn">
            <Ionicons name="chevron-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Ionicons name="shield-checkmark" size={18} color={COLORS.white} />
            <Text style={styles.headerTitle}>Secure Checkout</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressStep}>
            <View style={[styles.progressDot, styles.progressDotActive]} />
            <Text style={[styles.progressText, styles.progressTextActive]}>Delivery</Text>
          </View>
          <View style={styles.progressLine} />
          <View style={styles.progressStep}>
            <View style={styles.progressDot} />
            <Text style={styles.progressText}>Payment</Text>
          </View>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.stepTitle}>Where should we deliver?</Text>
            <Text style={styles.stepSubtitle}>Enter your delivery details</Text>

            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Full Name</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="person-outline" size={20} color={COLORS.gray} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your full name"
                    placeholderTextColor={COLORS.gray}
                    value={deliveryData.buyer_name}
                    onChangeText={(text) => setDeliveryData({ ...deliveryData, buyer_name: text })}
                    data-testid="buyer-name-input"
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Phone Number</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="call-outline" size={20} color={COLORS.gray} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="+255 xxx xxx xxx"
                    placeholderTextColor={COLORS.gray}
                    value={deliveryData.buyer_phone}
                    onChangeText={(text) => setDeliveryData({ ...deliveryData, buyer_phone: text })}
                    keyboardType="phone-pad"
                    data-testid="buyer-phone-input"
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Delivery Address</Text>
                <View style={[styles.inputWrapper, styles.inputWrapperLarge]}>
                  <Ionicons name="location-outline" size={20} color={COLORS.gray} style={[styles.inputIcon, { alignSelf: 'flex-start', marginTop: 16 }]} />
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Full address for delivery"
                    placeholderTextColor={COLORS.gray}
                    value={deliveryData.buyer_location}
                    onChangeText={(text) => setDeliveryData({ ...deliveryData, buyer_location: text })}
                    multiline
                    numberOfLines={3}
                    data-testid="buyer-location-input"
                  />
                </View>
              </View>
            </View>

            {/* Trust Badge */}
            <View style={styles.trustBadge}>
              <Ionicons name="shield-checkmark" size={18} color={COLORS.primary} />
              <Text style={styles.trustText}>Your payment will be protected by escrow</Text>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.primaryButton} onPress={handleDeliverySubmit} data-testid="continue-payment-btn">
              <Text style={styles.primaryButtonText}>Continue to Payment</Text>
              <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // STEP 2: Payment
  if (step === 'payment') {
    const price = product?.price_tzs || product?.price || 0;
    const protectionFee = Math.round(price * 0.03);
    const total = price + protectionFee;

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => setStep('delivery')} data-testid="back-btn">
            <Ionicons name="chevron-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Ionicons name="lock-closed" size={16} color={COLORS.gold} />
            <Text style={styles.headerTitle}>Payment Secured</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressStep}>
            <View style={[styles.progressDot, styles.progressDotComplete]}>
              <Ionicons name="checkmark" size={12} color={COLORS.white} />
            </View>
            <Text style={[styles.progressText, styles.progressTextComplete]}>Delivery</Text>
          </View>
          <View style={[styles.progressLine, styles.progressLineActive]} />
          <View style={styles.progressStep}>
            <View style={[styles.progressDot, styles.progressDotActive]} />
            <Text style={[styles.progressText, styles.progressTextActive]}>Payment</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Order Summary */}
          <View style={styles.orderSummary}>
            <Text style={styles.summaryTitle}>Order Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{product?.name}</Text>
              <Text style={styles.summaryValue}>{formatPrice(price)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <View style={styles.summaryLabelRow}>
                <Ionicons name="shield-checkmark" size={14} color={COLORS.gold} />
                <Text style={styles.summaryLabel}>Protection Fee (3%)</Text>
              </View>
              <Text style={styles.summaryValue}>{formatPrice(protectionFee)}</Text>
            </View>
            <View style={[styles.summaryRow, styles.summaryRowTotal]}>
              <Text style={styles.summaryTotalLabel}>Total</Text>
              <Text style={styles.summaryTotalValue}>{formatPrice(total)}</Text>
            </View>
          </View>

          {/* Escrow Message */}
          <View style={styles.escrowBox}>
            <View style={styles.escrowIconBg}>
              <Ionicons name="shield-checkmark" size={20} color={COLORS.gold} />
            </View>
            <View style={styles.escrowTextBox}>
              <Text style={styles.escrowTitle}>Payment held securely in escrow</Text>
              <Text style={styles.escrowSubtitle}>Seller receives payment only after you confirm delivery</Text>
            </View>
          </View>

          {/* Payment Methods */}
          <Text style={styles.paymentSectionTitle}>Select Payment Method</Text>
          <View style={styles.paymentSection}>
            {paymentMethods.map((method) => (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.paymentOption,
                  selectedPayment === method.id && styles.paymentOptionActive
                ]}
                onPress={() => setSelectedPayment(method.id)}
                data-testid={`payment-${method.id}`}
              >
                <View style={[
                  styles.radioOuter,
                  selectedPayment === method.id && styles.radioOuterActive
                ]}>
                  {selectedPayment === method.id && <View style={styles.radioInner} />}
                </View>
                <Ionicons name={method.icon as any} size={20} color={selectedPayment === method.id ? COLORS.primary : COLORS.gray} />
                <Text style={[
                  styles.paymentOptionText,
                  selectedPayment === method.id && styles.paymentOptionTextActive
                ]}>{method.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
            onPress={handlePayment}
            disabled={isLoading}
            data-testid="pay-btn"
          >
            <Ionicons name="lock-closed" size={18} color={COLORS.white} />
            <Text style={styles.primaryButtonText}>Pay {formatPrice(total)}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // STEP 3: Processing
  if (step === 'processing') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={{ width: 40 }} />
          <Text style={styles.headerTitle}>Processing</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centerContainer}>
          <View style={styles.processingIconOuter}>
            <View style={styles.processingIcon}>
              <Ionicons name="hourglass" size={40} color={COLORS.primary} />
            </View>
          </View>
          <Text style={styles.processingTitle}>Processing Payment</Text>
          <Text style={styles.processingSubtitle}>Please wait while we secure your payment...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // STEP 4: Success
  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { backgroundColor: COLORS.success }]}>
        <View style={{ width: 40 }} />
        <View style={styles.headerCenter}>
          <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
          <Text style={styles.headerTitle}>Payment Complete</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.successContainer}>
        <View style={styles.successIconOuter}>
          <View style={styles.successIcon}>
            <Ionicons name="shield-checkmark" size={48} color={COLORS.success} />
          </View>
        </View>

        <Text style={styles.successTitle}>Payment Secured!</Text>
        <Text style={styles.successMessage}>Your money is safely held in escrow until delivery.</Text>

        {/* What happens next */}
        <View style={styles.nextSteps}>
          <View style={styles.stepItem}>
            <View style={[styles.stepItemIcon, { backgroundColor: COLORS.successBg }]}>
              <Ionicons name="checkmark" size={16} color={COLORS.success} />
            </View>
            <Text style={styles.stepItemText}>Seller notified</Text>
          </View>
          <View style={styles.stepItem}>
            <View style={[styles.stepItemIcon, { backgroundColor: COLORS.successBg }]}>
              <Ionicons name="checkmark" size={16} color={COLORS.success} />
            </View>
            <Text style={styles.stepItemText}>Order being prepared</Text>
          </View>
          <View style={styles.stepItem}>
            <View style={[styles.stepItemIcon, { backgroundColor: COLORS.successBg }]}>
              <Ionicons name="checkmark" size={16} color={COLORS.success} />
            </View>
            <Text style={styles.stepItemText}>Track delivery progress</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.replace({
            pathname: '/track/[orderId]',
            params: { orderId: order?.order_id }
          })}
          data-testid="track-order-btn"
        >
          <Text style={styles.primaryButtonText}>Track Your Order</Text>
          <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
        </TouchableOpacity>
      </View>
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
    paddingHorizontal: 12,
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
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: COLORS.background,
  },
  progressStep: {
    alignItems: 'center',
    gap: 6,
  },
  progressDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressDotActive: {
    backgroundColor: COLORS.primary,
  },
  progressDotComplete: {
    backgroundColor: COLORS.success,
  },
  progressLine: {
    width: 60,
    height: 3,
    backgroundColor: COLORS.lightGray,
    marginHorizontal: 12,
  },
  progressLineActive: {
    backgroundColor: COLORS.success,
  },
  progressText: {
    fontSize: 12,
    color: COLORS.gray,
  },
  progressTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  progressTextComplete: {
    color: COLORS.success,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 20,
    flexGrow: 1,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.dark,
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  stepSubtitle: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 24,
  },
  form: {
    gap: 18,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.darkGray,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  inputWrapperLarge: {
    alignItems: 'flex-start',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: COLORS.dark,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 32,
    padding: 16,
    backgroundColor: '#F0FDFA',
    borderRadius: 14,
  },
  trustText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 18,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: '700',
  },
  // Payment Step Styles
  orderSummary: {
    backgroundColor: COLORS.background,
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    gap: 12,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.dark,
    marginBottom: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryRowTotal: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
    marginTop: 8,
  },
  summaryLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.gray,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.dark,
  },
  summaryTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.dark,
  },
  summaryTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  escrowBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    backgroundColor: COLORS.goldBg,
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  escrowIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
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
    color: COLORS.dark,
  },
  escrowSubtitle: {
    fontSize: 13,
    color: '#92400E',
    marginTop: 4,
    lineHeight: 18,
  },
  paymentSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.dark,
    marginBottom: 12,
  },
  paymentSection: {
    gap: 10,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 14,
    gap: 14,
    backgroundColor: COLORS.white,
  },
  paymentOptionActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#F0FDFA',
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterActive: {
    borderColor: COLORS.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
  paymentOptionText: {
    fontSize: 16,
    color: COLORS.dark,
    flex: 1,
  },
  paymentOptionTextActive: {
    fontWeight: '600',
    color: COLORS.primary,
  },
  // Processing & Success
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  processingIconOuter: {
    width: 100,
    height: 100,
    borderRadius: 28,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  processingIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: '#CCFBF1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.dark,
    letterSpacing: -0.5,
  },
  processingSubtitle: {
    fontSize: 15,
    color: COLORS.gray,
    marginTop: 8,
    textAlign: 'center',
  },
  successContainer: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIconOuter: {
    width: 100,
    height: 100,
    borderRadius: 28,
    backgroundColor: COLORS.successBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.dark,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 16,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: 32,
  },
  nextSteps: {
    width: '100%',
    gap: 16,
    marginBottom: 32,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  stepItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepItemText: {
    fontSize: 16,
    color: COLORS.dark,
  },
});
