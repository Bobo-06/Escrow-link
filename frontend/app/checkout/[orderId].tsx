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
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ordersApi, paymentsApi, paymentLinkApi } from '../../src/api/api';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL || '';

type Step = 'delivery' | 'payment' | 'processing' | 'success';

const paymentMethods = [
  { id: 'mpesa', name: 'M-Pesa', icon: 'phone-portrait-outline' },
  { id: 'airtel', name: 'Airtel Money', icon: 'phone-portrait-outline' },
  { id: 'tigo', name: 'Tigo Pesa', icon: 'phone-portrait-outline' },
  { id: 'nala', name: 'NALA (Diaspora)', icon: 'globe-outline' },
];

const countries = [
  { code: 'TZ', name: 'Tanzania' },
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'KE', name: 'Kenya' },
  { code: 'UG', name: 'Uganda' },
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
    if (productId) {
      loadProduct();
    }
  }, [productId]);

  const loadProduct = async () => {
    try {
      // Get product info from the payment link API
      const products = await axios.get(`${API_URL}/api/products`);
      const prod = products.data.find((p: any) => p.product_id === productId);
      if (prod) {
        setProduct(prod);
      }
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

  const formatPrice = (amount: number, curr: string = 'TZS') => {
    if (curr === 'TZS') return `TZS ${amount?.toLocaleString() || 0}`;
    if (curr === 'USD') return `$${amount?.toFixed(2) || 0}`;
    if (curr === 'GBP') return `£${amount?.toFixed(2) || 0}`;
    if (curr === 'EUR') return `€${amount?.toFixed(2) || 0}`;
    return `${curr} ${amount?.toLocaleString() || 0}`;
  };

  // Delivery Details Step
  if (step === 'delivery') {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          {/* Green Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Secure Checkout</Text>
            <Ionicons name="lock-closed" size={18} color="#FFFFFF" />
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.stepTitle}>Where should we deliver?</Text>

            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Full Name</Text>
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
                  placeholder="Full address for delivery"
                  placeholderTextColor="#9CA3AF"
                  value={deliveryData.buyer_location}
                  onChangeText={(text) => setDeliveryData({ ...deliveryData, buyer_location: text })}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Country</Text>
                <View style={styles.countrySelector}>
                  {countries.map((country) => (
                    <TouchableOpacity
                      key={country.code}
                      style={[
                        styles.countryOption,
                        deliveryData.buyer_country === country.code && styles.countryOptionActive,
                      ]}
                      onPress={() => setDeliveryData({ ...deliveryData, buyer_country: country.code })}
                    >
                      <Text
                        style={[
                          styles.countryOptionText,
                          deliveryData.buyer_country === country.code && styles.countryOptionTextActive,
                        ]}
                      >
                        {country.code}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* Trust Badge */}
            <View style={styles.trustBadge}>
              <Ionicons name="shield-checkmark" size={20} color="#16A34A" />
              <Text style={styles.trustBadgeText}>Your payment is protected</Text>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.continueButton} onPress={handleDeliverySubmit}>
              <Text style={styles.continueButtonText}>Continue to Payment</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // Payment Step - Matching the design exactly
  if (step === 'payment') {
    const price = product?.price_tzs || product?.price || 0;
    const protectionFee = price * 0.03;
    const total = price + protectionFee;

    return (
      <SafeAreaView style={styles.container}>
        {/* Green Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => setStep('delivery')}>
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerTitle}>Payment Secured</Text>
            <Ionicons name="lock-closed" size={16} color="#F59E0B" />
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Product Summary */}
          <View style={styles.productSummary}>
            <View style={styles.productImageSmall}>
              {product?.image ? (
                <Image source={{ uri: product.image }} style={styles.productImageSmallImg} />
              ) : (
                <Ionicons name="cube" size={32} color="#9CA3AF" />
              )}
            </View>
            <View style={styles.productSummaryInfo}>
              <Text style={styles.productSummaryName}>{product?.name || 'Product'}</Text>
              <Text style={styles.productSummaryPrice}>{formatPrice(price)}</Text>
            </View>
          </View>

          {/* Order Breakdown */}
          <View style={styles.orderBreakdown}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Order:</Text>
              <Text style={styles.breakdownValue}>{formatPrice(price)}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Protection Fee:</Text>
              <Text style={styles.breakdownValue}>{formatPrice(protectionFee)}</Text>
            </View>
          </View>

          {/* Escrow Message */}
          <View style={styles.escrowMessage}>
            <Ionicons name="shield-checkmark" size={20} color="#F59E0B" />
            <View style={styles.escrowTextContainer}>
              <Text style={styles.escrowTitle}>Payment held securely in escrow.</Text>
              <Text style={styles.escrowSubtitle}>Seller paid after delivery.</Text>
            </View>
          </View>

          {/* Payment Methods */}
          <View style={styles.paymentMethods}>
            {paymentMethods.map((method) => (
              <TouchableOpacity
                key={method.id}
                style={styles.paymentOption}
                onPress={() => setSelectedPayment(method.id)}
              >
                <View style={styles.radioOuter}>
                  {selectedPayment === method.id && <View style={styles.radioInner} />}
                </View>
                <Text style={styles.paymentOptionText}>{method.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Pay Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.payButton, isLoading && styles.buttonDisabled]}
            onPress={handlePayment}
            disabled={isLoading}
          >
            <Text style={styles.payButtonText}>Pay {formatPrice(total)}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Processing Step
  if (step === 'processing') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={{ width: 40 }} />
          <Text style={styles.headerTitle}>Processing</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.processingContainer}>
          <View style={styles.processingIcon}>
            <Ionicons name="hourglass" size={48} color="#16A34A" />
          </View>
          <Text style={styles.processingTitle}>Processing Payment</Text>
          <Text style={styles.processingText}>Please wait...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Success Step - Matching the design exactly
  return (
    <SafeAreaView style={styles.container}>
      {/* Green Header with Checkmark */}
      <View style={styles.header}>
        <View style={{ width: 40 }} />
        <View style={styles.headerTitleRow}>
          <Text style={styles.headerTitle}>Payment Secured</Text>
          <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
        </View>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.successContainer}>
        <Text style={styles.successMessage}>Your money is safely held in escrow.</Text>

        {/* What happens next */}
        <View style={styles.nextSteps}>
          <View style={styles.nextStepItem}>
            <Ionicons name="checkmark-circle" size={22} color="#16A34A" />
            <Text style={styles.nextStepText}>Seller notified</Text>
          </View>
          <View style={styles.nextStepItem}>
            <Ionicons name="checkmark-circle" size={22} color="#16A34A" />
            <Text style={styles.nextStepText}>Order being prepared</Text>
          </View>
          <View style={styles.nextStepItem}>
            <Ionicons name="checkmark-circle" size={22} color="#16A34A" />
            <Text style={styles.nextStepText}>Track your progress</Text>
          </View>
        </View>

        {/* Track Order Button */}
        <TouchableOpacity
          style={styles.trackButton}
          onPress={() => router.replace({
            pathname: '/track/[orderId]',
            params: { orderId: order?.order_id }
          })}
        >
          <Text style={styles.trackButtonText}>Track Your Order</Text>
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
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scrollContent: {
    padding: 20,
    flexGrow: 1,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 20,
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#1F2937',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  countrySelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  countryOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  countryOptionActive: {
    backgroundColor: '#16A34A',
  },
  countryOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  countryOptionTextActive: {
    color: '#FFFFFF',
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    padding: 12,
    backgroundColor: '#DCFCE7',
    borderRadius: 10,
  },
  trustBadgeText: {
    fontSize: 14,
    color: '#16A34A',
    fontWeight: '500',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  continueButton: {
    backgroundColor: '#16A34A',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Payment Page Styles
  productSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 16,
  },
  productImageSmall: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  productImageSmallImg: {
    width: '100%',
    height: '100%',
  },
  productSummaryInfo: {
    flex: 1,
  },
  productSummaryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  productSummaryPrice: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  orderBreakdown: {
    marginBottom: 16,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  breakdownLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  escrowMessage: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#FEFCE8',
    padding: 14,
    borderRadius: 10,
    marginBottom: 20,
  },
  escrowTextContainer: {
    flex: 1,
  },
  escrowTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  escrowSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  paymentMethods: {
    gap: 12,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    gap: 12,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#16A34A',
  },
  paymentOptionText: {
    fontSize: 16,
    color: '#1F2937',
  },
  payButton: {
    backgroundColor: '#16A34A',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  payButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Processing Styles
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
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  processingTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  processingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  // Success Styles
  successContainer: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successMessage: {
    fontSize: 18,
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 32,
  },
  nextSteps: {
    width: '100%',
    gap: 16,
    marginBottom: 32,
  },
  nextStepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  nextStepText: {
    fontSize: 16,
    color: '#374151',
  },
  trackButton: {
    backgroundColor: '#16A34A',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 10,
    alignItems: 'center',
    width: '100%',
  },
  trackButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
