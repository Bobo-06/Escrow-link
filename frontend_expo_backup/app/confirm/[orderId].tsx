import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, RADIUS, SHADOWS, formatTZS } from '../../src/constants/theme';
import { VoiceConfirmation } from '../../src/components/VoiceConfirmation';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export default function ConfirmationPage() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      const response = await fetch(`${API_URL}/api/orders/${orderId}`);
      if (!response.ok) throw new Error('Order not found');
      const data = await response.json();
      setOrder(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.gold} />
      </View>
    );
  }

  const txId = orderId?.toUpperCase().slice(0, 16) || 'SCT-XXXXXXXX';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Success Header */}
      <LinearGradient
        colors={[COLORS.ink, '#1a2a1a']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerSubtitle}>Pesa Imeshikwa · Funds Secured</Text>
          <Text style={styles.headerTitle}>Ulinzi wa escrow umewashwa · Protection active</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Success Circle */}
        <View style={styles.successSection}>
          <View style={styles.successCircle}>
            <Text style={styles.successIcon}>\u2713</Text>
          </View>
          <Text style={styles.successTitle}>Malipo Yamehifadhiwa Salama!</Text>
          <Text style={styles.successSubtitle}>Payment Secured · Muuzaji amearifiwa</Text>
        </View>

        {/* Receipt Card */}
        <View style={styles.receiptCard}>
          <Text style={styles.receiptTitle}>RISITI / RECEIPT</Text>
          
          {[
            ['Nambari ya Muamala / TX ID', txId],
            ['Kiasi cha Escrow / In Escrow', formatTZS(order?.product_price_tzs || order?.total_paid || 0)],
            ['Jumla Iliyolipwa / Paid', formatTZS(order?.total_paid || 0)],
            ['Muuzaji / Seller', order?.seller_name || 'Seller'],
            ['Njia / Method', order?.payment_method === 'mpesa' ? 'M-Pesa \ud83d\udfe2' : order?.payment_method?.toUpperCase()],
            ['Hali / Status', '\u2705 Imeshikwa Salama'],
          ].map(([label, value], i) => (
            <View key={i} style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>{label}</Text>
              <Text style={styles.receiptValue}>{value}</Text>
            </View>
          ))}
        </View>

        {/* Voice Confirmation */}
        {order && (
          <VoiceConfirmation
            transaction={{
              item: order.product_name || 'Product',
              amount: order.total_paid || 0,
              seller: order.seller_name || 'Seller',
            }}
          />
        )}

        {/* SMS Info */}
        <View style={styles.smsCard}>
          <View style={styles.smsIcon}>
            <Text style={styles.smsIconText}>\ud83d\udcf1</Text>
          </View>
          <View style={styles.smsContent}>
            <Text style={styles.smsTitle}>SMS Umetumwa · SMS Sent</Text>
            <Text style={styles.smsText}>
              Utapokea SMS kutoka Africa's Talking na maelezo ya muamala wako.
            </Text>
            <Text style={styles.smsTextEn}>
              You'll receive an SMS via Africa's Talking with transaction details.
            </Text>
          </View>
        </View>

        {/* What's Next */}
        <View style={styles.nextCard}>
          <Text style={styles.nextIcon}>\u23f3</Text>
          <Text style={styles.nextTitle}>Hatua Inayofuata / What's Next</Text>
          <Text style={styles.nextText}>
            Muuzaji ataandaa bidhaa na kutuma. Utapokea arifa ya ufuatiliaji.
          </Text>
          <Text style={styles.nextTextEn}>
            Seller will prepare and ship. You'll receive tracking notification.
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.trackBtn}
          onPress={() => router.push(`/track/${orderId}`)}
          activeOpacity={0.85}
          data-testid="track-order-btn"
        >
          <LinearGradient
            colors={[COLORS.gold, COLORS.goldDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.trackBtnGradient}
          >
            <Text style={styles.trackBtnText}>Fuatilia Agizo · Track Order</Text>
            <Ionicons name="arrow-forward" size={18} color={COLORS.ink} />
          </LinearGradient>
        </TouchableOpacity>
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
  header: {
    padding: 20,
    paddingTop: 16,
    alignItems: 'center',
  },
  headerContent: {
    alignItems: 'center',
  },
  headerSubtitle: {
    color: COLORS.emeraldLight,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  headerTitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  successSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  successCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.emerald,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    ...SHADOWS.md,
  },
  successIcon: {
    color: COLORS.white,
    fontSize: 32,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.ink,
    marginBottom: 4,
  },
  successSubtitle: {
    fontSize: 14,
    color: 'rgba(10,10,15,0.5)',
  },
  receiptCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: 16,
    ...SHADOWS.sm,
  },
  receiptTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(10,10,15,0.4)',
    letterSpacing: 1,
    marginBottom: 14,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface2,
  },
  receiptLabel: {
    fontSize: 12,
    color: 'rgba(10,10,15,0.5)',
    flex: 1,
  },
  receiptValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.ink,
    textAlign: 'right',
  },
  smsCard: {
    backgroundColor: COLORS.bluePale,
    borderRadius: RADIUS.lg,
    padding: 16,
    flexDirection: 'row',
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(26,74,138,0.15)',
  },
  smsIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smsIconText: {
    fontSize: 22,
  },
  smsContent: {
    flex: 1,
  },
  smsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.blue,
    marginBottom: 4,
  },
  smsText: {
    fontSize: 12,
    color: COLORS.ink,
    lineHeight: 18,
  },
  smsTextEn: {
    fontSize: 11,
    color: 'rgba(10,10,15,0.5)',
    marginTop: 4,
    fontStyle: 'italic',
  },
  nextCard: {
    backgroundColor: COLORS.amberPale,
    borderRadius: RADIUS.lg,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(212,133,10,0.15)',
  },
  nextIcon: {
    fontSize: 28,
    marginBottom: 10,
  },
  nextTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.amber,
    marginBottom: 8,
  },
  nextText: {
    fontSize: 13,
    color: COLORS.ink,
    textAlign: 'center',
    lineHeight: 20,
  },
  nextTextEn: {
    fontSize: 12,
    color: 'rgba(10,10,15,0.5)',
    textAlign: 'center',
    marginTop: 4,
    fontStyle: 'italic',
  },
  bottomBar: {
    backgroundColor: COLORS.ink,
    padding: 12,
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  trackBtn: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    ...SHADOWS.gold,
  },
  trackBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  trackBtnText: {
    color: COLORS.ink,
    fontSize: 15,
    fontWeight: '700',
  },
});
