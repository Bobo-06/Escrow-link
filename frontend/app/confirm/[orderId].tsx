import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
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
  inputBg: '#F1F5F9',
  background: '#F8FAFC',
  white: '#FFFFFF',
  success: '#10B981',
  successBg: '#ECFDF5',
  error: '#EF4444',
  errorBg: '#FEF2F2',
};

const disputeReasons = [
  { id: 'not_delivered', label: 'Item not delivered' },
  { id: 'wrong_item', label: 'Wrong product received' },
  { id: 'poor_quality', label: 'Poor quality / damaged' },
];

export default function ConfirmDelivery() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const [order, setOrder] = useState<any>(null);
  const [showDispute, setShowDispute] = useState(false);
  const [selectedReason, setSelectedReason] = useState('');
  const [comment, setComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  const loadOrder = async () => {
    try {
      const response = await ordersApi.get(orderId || '');
      setOrder(response.data);
    } catch (error) {
      console.error('Load order error:', error);
    }
  };

  const handleConfirmDelivery = async () => {
    setIsLoading(true);
    try {
      await ordersApi.confirmDelivery(orderId || '');
      Alert.alert(
        'Thank You!',
        'Payment has been released to the seller.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/'),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Could not confirm delivery');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitDispute = async () => {
    if (!selectedReason) {
      Alert.alert('Required', 'Please select a reason');
      return;
    }

    setIsLoading(true);
    try {
      await ordersApi.createDispute(orderId || '', selectedReason);
      Alert.alert(
        'Case Submitted',
        'We will review your case and contact you shortly.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/'),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Could not submit case');
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (amount: number) => `TZS ${amount?.toLocaleString() || 0}`;

  // Dispute Screen
  if (showDispute) {
    return (
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.headerLight}>
          <TouchableOpacity style={styles.backButtonLight} onPress={() => setShowDispute(false)} data-testid="back-btn">
            <Ionicons name="chevron-back" size={24} color={COLORS.dark} />
          </TouchableOpacity>
          <Text style={styles.headerTitleDark}>Report Problem</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.content}>
          {/* Header Text */}
          <Text style={styles.disputeTitle}>What went wrong?</Text>
          <Text style={styles.disputeSubtitle}>Select the issue you encountered</Text>

          {/* Dispute Reasons */}
          <View style={styles.reasonsContainer}>
            {disputeReasons.map((reason) => (
              <TouchableOpacity
                key={reason.id}
                style={[
                  styles.reasonOption,
                  selectedReason === reason.id && styles.reasonOptionSelected,
                ]}
                onPress={() => setSelectedReason(reason.id)}
                data-testid={`reason-${reason.id}`}
              >
                <View style={[
                  styles.radioOuter,
                  selectedReason === reason.id && styles.radioOuterSelected
                ]}>
                  {selectedReason === reason.id && <View style={styles.radioInner} />}
                </View>
                <Text style={[
                  styles.reasonText,
                  selectedReason === reason.id && styles.reasonTextSelected
                ]}>{reason.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Comment Field */}
          <View style={styles.commentContainer}>
            <Text style={styles.commentLabel}>Additional Details (Optional)</Text>
            <TextInput
              style={styles.commentInput}
              placeholder="Describe the issue in more detail..."
              placeholderTextColor={COLORS.gray}
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={4}
              data-testid="comment-input"
            />
          </View>

          {/* Protection Message */}
          <View style={styles.protectionMessage}>
            <Ionicons name="shield-checkmark" size={18} color={COLORS.gold} />
            <Text style={styles.protectionText}>Your payment remains protected during review</Text>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, isLoading && styles.buttonDisabled]}
            onPress={handleSubmitDispute}
            disabled={isLoading}
            data-testid="submit-dispute-btn"
          >
            <Text style={styles.submitButtonText}>
              {isLoading ? 'Submitting...' : 'Submit Case'}
            </Text>
          </TouchableOpacity>

          {/* Cancel */}
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => setShowDispute(false)}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Main Delivery Confirmation Screen
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.headerLight}>
        <TouchableOpacity style={styles.backButtonLight} onPress={() => router.back()} data-testid="back-btn">
          <Ionicons name="chevron-back" size={24} color={COLORS.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitleDark}>Confirm Delivery</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {/* Success Icon */}
        <View style={styles.mainIconOuter}>
          <View style={styles.mainIconInner}>
            <Ionicons name="cube" size={40} color={COLORS.primary} />
          </View>
        </View>

        {/* Main Question */}
        <Text style={styles.mainQuestion}>Order Delivered?</Text>
        <Text style={styles.subQuestion}>Have you received your item?</Text>

        {/* Product Info */}
        {order && (
          <View style={styles.orderInfo}>
            <Text style={styles.orderProductName}>{order.product_name}</Text>
            <Text style={styles.orderPrice}>{formatPrice(order.total_paid)}</Text>
          </View>
        )}

        {/* Yes, Release Payment Button */}
        <TouchableOpacity
          style={[styles.confirmButton, isLoading && styles.buttonDisabled]}
          onPress={handleConfirmDelivery}
          disabled={isLoading}
          data-testid="release-payment-btn"
        >
          <Ionicons name="checkmark-circle" size={22} color={COLORS.white} />
          <Text style={styles.confirmButtonText}>
            {isLoading ? 'Processing...' : 'Yes, Release Payment'}
          </Text>
        </TouchableOpacity>

        {/* Report a Problem Button */}
        <TouchableOpacity
          style={styles.problemButton}
          onPress={() => setShowDispute(true)}
          data-testid="report-problem-btn"
        >
          <Ionicons name="alert-circle" size={20} color={COLORS.error} />
          <Text style={styles.problemButtonText}>Report a Problem</Text>
        </TouchableOpacity>

        {/* Protection Badge */}
        <View style={styles.protectionBadge}>
          <Ionicons name="shield-checkmark" size={18} color={COLORS.gold} />
          <Text style={styles.protectionBadgeText}>
            Your payment is still protected until you confirm
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  headerLight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  backButtonLight: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.background,
  },
  headerTitleDark: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.dark,
  },
  content: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
  },
  mainIconOuter: {
    width: 100,
    height: 100,
    borderRadius: 28,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 20,
  },
  mainIconInner: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: '#CCFBF1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainQuestion: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.dark,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subQuestion: {
    fontSize: 16,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: 24,
  },
  orderInfo: {
    alignItems: 'center',
    marginBottom: 32,
    backgroundColor: COLORS.background,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 14,
    width: '100%',
  },
  orderProductName: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.dark,
  },
  orderPrice: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: 4,
  },
  confirmButton: {
    backgroundColor: COLORS.success,
    paddingVertical: 18,
    borderRadius: 14,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 12,
    shadowColor: COLORS.success,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  confirmButtonText: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: '700',
  },
  problemButton: {
    backgroundColor: COLORS.white,
    paddingVertical: 18,
    borderRadius: 14,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    marginBottom: 24,
  },
  problemButtonText: {
    color: COLORS.error,
    fontSize: 16,
    fontWeight: '600',
  },
  protectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.goldBg,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  protectionBadgeText: {
    fontSize: 13,
    color: '#92400E',
    flex: 1,
  },
  // Dispute Screen Styles
  disputeTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.dark,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  disputeSubtitle: {
    fontSize: 16,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: 24,
  },
  reasonsContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 20,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 14,
    gap: 14,
    backgroundColor: COLORS.white,
  },
  reasonOptionSelected: {
    borderColor: COLORS.error,
    backgroundColor: COLORS.errorBg,
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
  radioOuterSelected: {
    borderColor: COLORS.error,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.error,
  },
  reasonText: {
    fontSize: 16,
    color: COLORS.dark,
    flex: 1,
  },
  reasonTextSelected: {
    fontWeight: '600',
    color: COLORS.error,
  },
  commentContainer: {
    width: '100%',
    marginBottom: 20,
  },
  commentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.darkGray,
    marginBottom: 8,
  },
  commentInput: {
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    color: COLORS.dark,
    height: 100,
    textAlignVertical: 'top',
  },
  protectionMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
    backgroundColor: COLORS.goldBg,
    padding: 14,
    borderRadius: 12,
    width: '100%',
  },
  protectionText: {
    fontSize: 13,
    color: '#92400E',
    flex: 1,
  },
  submitButton: {
    backgroundColor: COLORS.error,
    paddingVertical: 18,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: '700',
  },
  cancelButton: {
    paddingVertical: 16,
    width: '100%',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: COLORS.gray,
    fontSize: 16,
    fontWeight: '600',
  },
});
