import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, RADIUS, SHADOWS, formatTZS, formatTZSShort, PAYMENT_METHODS } from '../../src/constants/theme';
import { StepIndicator } from '../../src/components/StepIndicator';
import { MpesaPaymentScreen } from '../../src/components/MpesaPayment';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export default function CheckoutPage() {
  const { code, orderId } = useLocalSearchParams<{ code?: string; orderId?: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<'details' | 'payment' | 'mpesa'>('details');
  const [selectedPayment, setSelectedPayment] = useState('mpesa');
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(orderId as string || null);

  // Form state
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [buyerLocation, setBuyerLocation] = useState('');

  useEffect(() => {
    if (code) fetchProduct();
  }, [code]);

  const fetchProduct = async () => {
    try {
      const response = await fetch(`${API_URL}/api/pay/${code}`);
      if (!response.ok) throw new Error('Product not found');
      const data = await response.json();
      setProduct(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleContinueToPayment = async () => {
    if (!buyerName || !buyerPhone || !buyerLocation) return;

    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: product.product_id,
          buyer_name: buyerName,
          buyer_phone: buyerPhone,
          buyer_location: buyerLocation,
          buyer_country: 'TZ',
          payment_method: selectedPayment,
          buyer_currency: 'TZS',
        }),
      });

      if (!response.ok) throw new Error('Failed to create order');
      const order = await response.json();
      setCreatedOrderId(order.order_id);
      setStep('payment');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectPayment = (method: string) => {
    setSelectedPayment(method);
    if (method === 'mpesa') {
      setStep('mpesa');
    }
  };

  const handlePaymentSuccess = async (data: { phone: string; method: string }) => {
    // Simulate payment
    try {
      await fetch(`${API_URL}/api/payments/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: createdOrderId,
          payment_method: data.method,
        }),
      });

      router.replace(`/confirm/${createdOrderId}`);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.gold} />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Product not found</Text>
      </View>
    );
  }

  // M-Pesa Payment Screen
  if (step === 'mpesa') {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <MpesaPaymentScreen
          amount={product.total_buyer_pays || product.price_tzs || product.price}
          onSuccess={handlePaymentSuccess}
          onBack={() => setStep('payment')}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            if (step === 'payment') setStep('details');
            else router.back();
          }}
        >
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>
            {step === 'details' ? 'Malipo ya Haraka' : 'Chagua Njia ya Malipo'}
          </Text>
          <Text style={styles.headerSub}>
            {step === 'details' ? 'Quick Checkout · Hatua 2 ya 6' : 'Select Payment · Hatua 3 ya 6'}
          </Text>
        </View>
      </View>

      {/* Step Indicator */}
      <StepIndicator current={step === 'details' ? 1 : 2} />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {step === 'details' && (
          <>
            {/* Order Summary */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>MUHTASARI WA AGIZO / ORDER SUMMARY</Text>
              <View style={styles.orderSummaryRow}>
                {product.image ? (
                  <Image source={{ uri: product.image }} style={styles.orderImage} />
                ) : (
                  <View style={[styles.orderImage, styles.orderImagePlaceholder]}>
                    <Ionicons name="image" size={20} color={COLORS.surface3} />
                  </View>
                )}
                <View style={styles.orderInfo}>
                  <Text style={styles.orderName} numberOfLines={2}>{product.name}</Text>
                  <Text style={styles.orderSeller}>{product.seller_name}</Text>
                </View>
                <Text style={styles.orderPrice}>{formatTZSShort(product.price_tzs || product.price)}</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.feeRow}>
                <Text style={styles.feeLabel}>Bei ya bidhaa / Item</Text>
                <Text style={styles.feeValue}>{formatTZS(product.price_tzs || product.price)}</Text>
              </View>
              <View style={styles.feeRow}>
                <Text style={styles.feeLabel}>Ulinzi wa Mnunuzi / Protection</Text>
                <Text style={styles.feeValue}>{formatTZS(product.buyer_protection_fee || 0)}</Text>
              </View>
              <View style={[styles.feeRow, styles.feeRowTotal]}>
                <Text style={styles.feeTotalLabel}>Jumla / Total</Text>
                <Text style={styles.feeTotalValue}>
                  {formatTZS(product.total_buyer_pays || product.price_tzs || product.price)}
                </Text>
              </View>
            </View>

            {/* Delivery Details */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>ANWANI YA UWASILISHAJI / DELIVERY</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Jina Kamili / Full Name</Text>
                <TextInput
                  style={styles.input}
                  value={buyerName}
                  onChangeText={setBuyerName}
                  placeholder="Jina lako"
                  placeholderTextColor="rgba(10,10,15,0.4)"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nambari ya Simu / Phone</Text>
                <View style={styles.phoneInputWrap}>
                  <View style={styles.phonePrefix}>
                    <Text style={styles.phonePrefixText}>🇹🇿 +255</Text>
                  </View>
                  <TextInput
                    style={styles.phoneInput}
                    value={buyerPhone}
                    onChangeText={setBuyerPhone}
                    placeholder="7XX XXX XXX"
                    placeholderTextColor="rgba(10,10,15,0.4)"
                    keyboardType="phone-pad"
                    maxLength={9}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Anwani / Address (Mtaa, Jiji)</Text>
                <TextInput
                  style={[styles.input, styles.inputMultiline]}
                  value={buyerLocation}
                  onChangeText={setBuyerLocation}
                  placeholder="Kariakoo, Dar es Salaam"
                  placeholderTextColor="rgba(10,10,15,0.4)"
                  multiline
                  numberOfLines={2}
                />
              </View>
            </View>
          </>
        )}

        {step === 'payment' && (
          <>
            {/* Escrow Vault Visual */}
            <LinearGradient
              colors={[COLORS.ink, COLORS.ink2]}
              style={styles.escrowVault}
            >
              <Text style={styles.vaultIcon}>🏦</Text>
              <Text style={styles.vaultAmount}>
                {formatTZS(product.total_buyer_pays || product.price_tzs || product.price)}
              </Text>
              <Text style={styles.vaultLabel}>Held in SecureTrade Escrow</Text>
              <View style={styles.vaultBadges}>
                <View style={styles.vaultBadge}>
                  <Ionicons name="lock-closed" size={12} color={COLORS.emerald} />
                  <Text style={styles.vaultBadgeText}>SSL Encrypted</Text>
                </View>
                <View style={styles.vaultBadge}>
                  <Ionicons name="shield-checkmark" size={12} color={COLORS.emerald} />
                  <Text style={styles.vaultBadgeText}>Dispute Protected</Text>
                </View>
              </View>
            </LinearGradient>

            {/* Payment Methods */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>NJIA YA MALIPO / PAYMENT METHOD</Text>

              {PAYMENT_METHODS.map((method) => (
                <TouchableOpacity
                  key={method.id}
                  style={[
                    styles.paymentMethod,
                    selectedPayment === method.id && styles.paymentMethodSelected,
                  ]}
                  onPress={() => handleSelectPayment(method.id)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.paymentIcon, { backgroundColor: method.color + '15' }]}>
                    <Text style={styles.paymentIconText}>{method.icon}</Text>
                  </View>
                  <View style={styles.paymentInfo}>
                    <Text style={styles.paymentName}>{method.name}</Text>
                    <Text style={styles.paymentDetail}>{method.detail}</Text>
                  </View>
                  <View style={[styles.radio, selectedPayment === method.id && styles.radioSelected]}>
                    {selectedPayment === method.id && <View style={styles.radioInner} />}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        {step === 'details' && (
          <TouchableOpacity
            style={[styles.continueBtn, (!buyerName || !buyerPhone || !buyerLocation) && styles.continueBtnDisabled]}
            onPress={handleContinueToPayment}
            disabled={!buyerName || !buyerPhone || !buyerLocation || submitting}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[COLORS.gold, COLORS.goldDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.continueBtnGradient}
            >
              {submitting ? (
                <ActivityIndicator color={COLORS.ink} />
              ) : (
                <>
                  <Text style={styles.continueBtnText}>Endelea · Continue</Text>
                  <Ionicons name="arrow-forward" size={18} color={COLORS.ink} />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        )}

        {step === 'payment' && selectedPayment !== 'mpesa' && (
          <TouchableOpacity
            style={styles.continueBtn}
            onPress={() => {
              if (selectedPayment === 'mpesa') {
                setStep('mpesa');
              }
            }}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[COLORS.gold, COLORS.goldDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.continueBtnGradient}
            >
              <Text style={styles.continueBtnText}>
                Lipa {formatTZS(product.total_buyer_pays || product.price_tzs || product.price)}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  errorText: {
    color: COLORS.ink,
    fontSize: 16,
  },
  header: {
    backgroundColor: COLORS.ink,
    padding: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    color: COLORS.white,
    fontSize: 18,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },
  headerSub: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: 16,
    ...SHADOWS.sm,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(10,10,15,0.4)',
    letterSpacing: 1,
    marginBottom: 16,
  },
  orderSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  orderImage: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface2,
  },
  orderImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderInfo: {
    flex: 1,
  },
  orderName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.ink,
  },
  orderSeller: {
    fontSize: 12,
    color: 'rgba(10,10,15,0.5)',
    marginTop: 2,
  },
  orderPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.goldDark,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.surface3,
    marginVertical: 12,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  feeLabel: {
    fontSize: 13,
    color: 'rgba(10,10,15,0.5)',
  },
  feeValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.ink,
  },
  feeRowTotal: {
    borderTopWidth: 1,
    borderTopColor: COLORS.surface3,
    marginTop: 6,
    paddingTop: 12,
  },
  feeTotalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.ink,
  },
  feeTotalValue: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.goldDark,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(10,10,15,0.5)',
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.surface3,
    borderRadius: RADIUS.md,
    padding: 14,
    fontSize: 14,
    color: COLORS.ink,
  },
  inputMultiline: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  phoneInputWrap: {
    flexDirection: 'row',
    borderWidth: 1.5,
    borderColor: COLORS.surface3,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  phonePrefix: {
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRightWidth: 1,
    borderRightColor: COLORS.surface3,
  },
  phonePrefixText: {
    fontSize: 13,
    fontWeight: '600',
  },
  phoneInput: {
    flex: 1,
    padding: 14,
    fontSize: 14,
    color: COLORS.ink,
  },
  escrowVault: {
    borderRadius: RADIUS.lg,
    padding: 24,
    alignItems: 'center',
  },
  vaultIcon: {
    fontSize: 36,
    marginBottom: 12,
  },
  vaultAmount: {
    color: COLORS.gold,
    fontSize: 28,
    fontWeight: '800',
  },
  vaultLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginTop: 4,
  },
  vaultBadges: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  vaultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  vaultBadgeText: {
    color: COLORS.emeraldLight,
    fontSize: 11,
    fontWeight: '600',
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.surface3,
    marginBottom: 10,
  },
  paymentMethodSelected: {
    borderColor: COLORS.mpesa,
    backgroundColor: COLORS.mpesa + '08',
  },
  paymentIcon: {
    width: 44,
    height: 30,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentIconText: {
    fontSize: 18,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.ink,
  },
  paymentDetail: {
    fontSize: 12,
    color: 'rgba(10,10,15,0.5)',
    marginTop: 2,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.surface3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: COLORS.mpesa,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.mpesa,
  },
  bottomBar: {
    backgroundColor: COLORS.ink,
    padding: 12,
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  continueBtn: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    ...SHADOWS.gold,
  },
  continueBtnDisabled: {
    opacity: 0.5,
  },
  continueBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  continueBtnText: {
    color: COLORS.ink,
    fontSize: 15,
    fontWeight: '700',
  },
});
