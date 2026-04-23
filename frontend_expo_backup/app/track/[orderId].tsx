import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, RADIUS, SHADOWS, formatTZS, TRACKING_STATUSES } from '../../src/constants/theme';
import { AIChatbot } from '../../src/components/AIChatbot';
import { RatingModal } from '../../src/components/RatingModal';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export default function TrackingPage() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [showDispute, setShowDispute] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [deliveryConfirmed, setDeliveryConfirmed] = useState(false);

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

  const handleConfirmDelivery = async () => {
    try {
      const response = await fetch(`${API_URL}/api/orders/${orderId}/confirm-delivery`, {
        method: 'POST',
      });
      
      if (response.ok) {
        setDeliveryConfirmed(true);
        // Show rating modal after delivery confirmation
        setShowRating(true);
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Kosa / Error', 'Imeshindikana kuthibitisha. Jaribu tena. / Failed to confirm. Please try again.');
    }
  };

  const handleRatingSubmit = async (rating: number, comment: string) => {
    try {
      // Submit rating to backend
      await fetch(`${API_URL}/api/orders/${orderId}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment }),
      });
      
      setShowRating(false);
      Alert.alert(
        'Asante! / Thank you!', 
        'Ukadiriaji wako umehifadhiwa. / Your rating has been saved.',
        [{ text: 'OK', onPress: () => router.push('/') }]
      );
    } catch (err) {
      console.error(err);
      setShowRating(false);
      router.push('/');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.gold} />
      </View>
    );
  }

  const trackingCode = `SCT-TR${orderId?.slice(-8).toUpperCase()}`;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>\u2190</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Fuatilia Agizo</Text>
          <Text style={styles.headerSub}>Sendy Africa \u00b7 {trackingCode}</Text>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusBadgeText}>Inasafirishwa</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Map Placeholder */}
        <View style={styles.mapContainer}>
          <View style={styles.mapPlaceholder}>
            <Text style={styles.mapPin}>\ud83d\udce6</Text>
            <Text style={styles.mapText}>DSM \u2192 Dar es Salaam \u00b7 Inakuja / En route</Text>
          </View>
        </View>

        {/* ETA Info */}
        <View style={styles.etaRow}>
          <View style={styles.etaItem}>
            <Text style={styles.etaIcon}>\ud83d\udcc5</Text>
            <Text style={styles.etaLabel}>Inatarajiwa / ETA</Text>
            <Text style={styles.etaValue}>Jumatano, Apr 9</Text>
          </View>
          <View style={styles.etaDivider} />
          <View style={styles.etaItem}>
            <Text style={styles.etaIcon}>\ud83d\udee1\ufe0f</Text>
            <Text style={styles.etaLabel}>Escrow / Hali</Text>
            <Text style={[styles.etaValue, { color: COLORS.emerald }]}>Imeshikwa</Text>
          </View>
        </View>

        {/* Timeline */}
        <View style={styles.timelineCard}>
          <Text style={styles.timelineTitle}>MWELEKEO WA UTOAJI / SHIPMENT TIMELINE</Text>
          
          {TRACKING_STATUSES.map((event, i) => (
            <View key={i} style={styles.timelineItem}>
              <View style={styles.timelineLeft}>
                <View
                  style={[
                    styles.timelineDot,
                    event.status === 'done' && styles.timelineDotDone,
                    event.status === 'active' && styles.timelineDotActive,
                    event.status === 'pending' && styles.timelineDotPending,
                  ]}
                >
                  <Text style={styles.timelineDotText}>
                    {event.status === 'done' ? '\u2713' : event.icon}
                  </Text>
                </View>
                {i < TRACKING_STATUSES.length - 1 && (
                  <View
                    style={[
                      styles.timelineLine,
                      event.status === 'done' && styles.timelineLineDone,
                    ]}
                  />
                )}
              </View>
              <View style={styles.timelineContent}>
                <Text
                  style={[
                    styles.timelineItemTitle,
                    event.status === 'pending' && styles.timelineItemTitleMuted,
                  ]}
                >
                  {event.title}
                </Text>
                {event.en && (
                  <Text style={styles.timelineItemEn}>{event.en}</Text>
                )}
                {event.status === 'active' && (
                  <Text style={styles.timelineItemTime}>Sasa hivi / Now</Text>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Action Cards */}
        <View style={styles.actionSection}>
          {/* Release Payment */}
          <TouchableOpacity
            style={[styles.actionCard, styles.actionCardRelease]}
            onPress={handleConfirmDelivery}
            activeOpacity={0.85}
          >
            <Text style={styles.actionIcon}>\u2705</Text>
            <View style={styles.actionContent}>
              <Text style={[styles.actionTitle, { color: COLORS.emerald }]}>
                Toa Malipo / Release Payment
              </Text>
              <Text style={styles.actionDesc}>
                Bidhaa imefika kama ilivyoelezwa? Toa {formatTZS(order?.seller_payout || 0)} kwa muuzaji.
              </Text>
            </View>
          </TouchableOpacity>

          {/* Open Dispute */}
          <TouchableOpacity
            style={[styles.actionCard, styles.actionCardDispute]}
            onPress={() => setShowDispute(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.actionIcon}>\u26a0\ufe0f</Text>
            <View style={styles.actionContent}>
              <Text style={[styles.actionTitle, { color: COLORS.ruby }]}>
                Fungua Tatizo / Open Dispute
              </Text>
              <Text style={styles.actionDesc}>
                Bidhaa haiko sawa? AI wetu atapatanisha.
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Protection Notice */}
        <View style={styles.noticeCard}>
          <Text style={styles.noticeText}>
            Ulinzi wa escrow unaisha siku 14. Baada ya hapo, pesa inatolewa kiotomatiki.
          </Text>
          <Text style={styles.noticeTextEn}>
            Escrow protection expires in 14 days. After that, funds auto-release.
          </Text>
        </View>
      </ScrollView>

      {/* Floating Chat Button */}
      {!showChat && !showDispute && (
        <TouchableOpacity
          style={styles.chatFab}
          onPress={() => setShowChat(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.chatFabText}>\ud83d\udcac</Text>
        </TouchableOpacity>
      )}

      {/* Support Chatbot */}
      {showChat && (
        <AIChatbot mode="support" onClose={() => setShowChat(false)} />
      )}

      {/* Dispute Mediator */}
      {showDispute && (
        <AIChatbot
          mode="dispute"
          transaction={{
            item: order?.product_name || 'Product',
            amount: order?.total_paid || 0,
            order_id: orderId || '',
          }}
          onClose={() => setShowDispute(false)}
        />
      )}

      {/* Rating Modal - shows after delivery confirmation */}
      <RatingModal
        visible={showRating}
        sellerName={order?.seller_name || 'Muuzaji'}
        orderId={orderId || ''}
        onSubmit={handleRatingSubmit}
        onClose={() => {
          setShowRating(false);
          router.push('/');
        }}
      />
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
  statusBadge: {
    backgroundColor: COLORS.amberPale,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    color: COLORS.amber,
    fontSize: 11,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  mapContainer: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  mapPlaceholder: {
    height: 140,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.surface3,
  },
  mapPin: {
    fontSize: 32,
    marginBottom: 8,
  },
  mapText: {
    fontSize: 13,
    color: 'rgba(10,10,15,0.5)',
  },
  etaRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: 16,
    ...SHADOWS.sm,
  },
  etaItem: {
    flex: 1,
    alignItems: 'center',
  },
  etaIcon: {
    fontSize: 20,
    marginBottom: 8,
  },
  etaLabel: {
    fontSize: 11,
    color: 'rgba(10,10,15,0.5)',
    marginBottom: 4,
  },
  etaValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.ink,
  },
  etaDivider: {
    width: 1,
    backgroundColor: COLORS.surface3,
    marginHorizontal: 16,
  },
  timelineCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: 16,
    ...SHADOWS.sm,
  },
  timelineTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(10,10,15,0.4)',
    letterSpacing: 1,
    marginBottom: 16,
  },
  timelineItem: {
    flexDirection: 'row',
    minHeight: 60,
  },
  timelineLeft: {
    width: 32,
    alignItems: 'center',
  },
  timelineDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  timelineDotDone: {
    backgroundColor: COLORS.emerald,
  },
  timelineDotActive: {
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.gold,
  },
  timelineDotPending: {
    backgroundColor: COLORS.surface2,
  },
  timelineDotText: {
    fontSize: 12,
    color: COLORS.white,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: COLORS.surface3,
    marginVertical: 4,
  },
  timelineLineDone: {
    backgroundColor: COLORS.emerald,
  },
  timelineContent: {
    flex: 1,
    paddingLeft: 14,
    paddingBottom: 16,
  },
  timelineItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.ink,
  },
  timelineItemTitleMuted: {
    color: 'rgba(10,10,15,0.4)',
  },
  timelineItemEn: {
    fontSize: 12,
    color: 'rgba(10,10,15,0.5)',
    marginTop: 2,
  },
  timelineItemTime: {
    fontSize: 11,
    color: COLORS.gold,
    fontWeight: '600',
    marginTop: 4,
  },
  actionSection: {
    gap: 12,
  },
  actionCard: {
    flexDirection: 'row',
    borderRadius: RADIUS.lg,
    padding: 16,
    gap: 14,
    borderWidth: 2,
  },
  actionCardRelease: {
    backgroundColor: COLORS.emeraldPale,
    borderColor: 'rgba(26,122,90,0.2)',
  },
  actionCardDispute: {
    backgroundColor: COLORS.rubyPale,
    borderColor: 'rgba(192,57,43,0.15)',
  },
  actionIcon: {
    fontSize: 28,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  actionDesc: {
    fontSize: 12,
    color: 'rgba(10,10,15,0.6)',
    lineHeight: 18,
  },
  noticeCard: {
    backgroundColor: COLORS.surface2,
    borderRadius: RADIUS.md,
    padding: 14,
    alignItems: 'center',
  },
  noticeText: {
    fontSize: 12,
    color: 'rgba(10,10,15,0.6)',
    textAlign: 'center',
  },
  noticeTextEn: {
    fontSize: 11,
    color: 'rgba(10,10,15,0.4)',
    textAlign: 'center',
    marginTop: 4,
    fontStyle: 'italic',
  },
  chatFab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.ink,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.lg,
    zIndex: 500,
  },
  chatFabText: {
    fontSize: 22,
  },
});
