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

const disputeReasons = [
  { id: 'not_delivered', label: 'Item not delivered' },
  { id: 'wrong_item', label: 'Wrong product' },
  { id: 'poor_quality', label: 'Poor quality' },
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

  // Dispute Screen - Matching the design
  if (showDispute) {
    return (
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => setShowDispute(false)}>
            <Ionicons name="chevron-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitleDark}>Delivery Confirmation</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.content}>
          {/* Question */}
          <Text style={styles.disputeTitle}>Order Delivered?</Text>
          <Text style={styles.disputeSubtitle}>Have you received your item?</Text>

          {/* Release Payment Button */}
          <TouchableOpacity
            style={styles.releaseButton}
            onPress={() => setShowDispute(false)}
          >
            <Text style={styles.releaseButtonText}>Yes, Release Payment</Text>
          </TouchableOpacity>

          {/* Report Problem Button */}
          <TouchableOpacity style={styles.reportButton}>
            <Text style={styles.reportButtonText}>Report a Problem</Text>
          </TouchableOpacity>

          {/* Protection Message */}
          <View style={styles.protectionMessage}>
            <Ionicons name="shield-checkmark" size={18} color="#F59E0B" />
            <Text style={styles.protectionText}>Your payment is still protected.</Text>
          </View>

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
              >
                <View style={styles.radioOuter}>
                  {selectedReason === reason.id && <View style={styles.radioInner} />}
                </View>
                <Text style={styles.reasonText}>{reason.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Comment Field */}
          <View style={styles.commentContainer}>
            <Text style={styles.commentLabel}>Add a Comment (Optional)</Text>
            <TextInput
              style={styles.commentInput}
              placeholder="Describe the issue..."
              placeholderTextColor="#9CA3AF"
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, isLoading && styles.buttonDisabled]}
            onPress={handleSubmitDispute}
            disabled={isLoading}
          >
            <Text style={styles.submitButtonText}>
              {isLoading ? 'Submitting...' : 'Submit Case'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Main Delivery Confirmation Screen - Matching the design
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitleDark}>Delivery Confirmation</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {/* Product Image (if available) */}
        {order?.product_image && (
          <View style={styles.productImageContainer}>
            <Image source={{ uri: order.product_image }} style={styles.productImage} />
          </View>
        )}

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
        >
          <Text style={styles.confirmButtonText}>
            {isLoading ? 'Processing...' : 'Yes, Release Payment'}
          </Text>
        </TouchableOpacity>

        {/* Report a Problem Button */}
        <TouchableOpacity
          style={styles.problemButton}
          onPress={() => setShowDispute(true)}
        >
          <Text style={styles.problemButtonText}>Report a Problem</Text>
        </TouchableOpacity>

        {/* Protection Badge */}
        <View style={styles.protectionBadge}>
          <Ionicons name="shield-checkmark" size={18} color="#F59E0B" />
          <Text style={styles.protectionBadgeText}>
            Your payment is still protected.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleDark: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  content: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
  },
  productImageContainer: {
    width: 120,
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
    backgroundColor: '#F3F4F6',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  mainQuestion: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  subQuestion: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  orderInfo: {
    alignItems: 'center',
    marginBottom: 32,
  },
  orderProductName: {
    fontSize: 18,
    fontWeight: '500',
    color: '#1F2937',
  },
  orderPrice: {
    fontSize: 16,
    color: '#16A34A',
    marginTop: 4,
  },
  confirmButton: {
    backgroundColor: '#16A34A',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  problemButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 24,
  },
  problemButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '500',
  },
  protectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEFCE8',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  protectionBadgeText: {
    fontSize: 14,
    color: '#92400E',
  },
  // Dispute Screen Styles
  disputeTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 8,
  },
  disputeSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  releaseButton: {
    backgroundColor: '#16A34A',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  releaseButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  reportButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  reportButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '500',
  },
  protectionMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  protectionText: {
    fontSize: 14,
    color: '#92400E',
  },
  reasonsContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 20,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    gap: 12,
  },
  reasonOptionSelected: {
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
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
    backgroundColor: '#DC2626',
  },
  reasonText: {
    fontSize: 16,
    color: '#374151',
  },
  commentContainer: {
    width: '100%',
    marginBottom: 20,
  },
  commentLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  commentInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#1F2937',
    height: 80,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#DC2626',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
