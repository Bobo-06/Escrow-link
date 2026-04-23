import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, RADIUS, SHADOWS, formatTZS, formatTZSShort } from '../../src/constants/theme';
import { TrustStrip } from '../../src/components/TrustStrip';
import { SellerTrustCard } from '../../src/components/SellerTrustCard';
import { AIChatbot } from '../../src/components/AIChatbot';
import { AIProductSuggestions } from '../../src/components/AIProductSuggestions';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const { width } = Dimensions.get('window');

export default function ProductPage() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    fetchProduct();
  }, [code]);

  const fetchProduct = async () => {
    try {
      const response = await fetch(`${API_URL}/api/pay/${code}`);
      if (!response.ok) throw new Error('Product not found');
      const data = await response.json();
      setProduct(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load product');
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = () => {
    router.push(`/checkout/${code}`);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.gold} />
        <Text style={styles.loadingText}>Inapakia... / Loading...</Text>
      </View>
    );
  }

  if (error || !product) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color={COLORS.ruby} />
        <Text style={styles.errorText}>{error || 'Product not found'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchProduct}>
          <Text style={styles.retryBtnText}>Jaribu tena / Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const seller = {
    name: product.seller_name || 'Seller',
    handle: `@${product.seller_name?.toLowerCase().replace(/\s/g, '_') || 'seller'}`,
    trustScore: product.seller_trade_metrics?.success_rate || 87,
    trades: product.seller_trade_metrics?.successful_transactions || 0,
    rating: 4.8,
    memberDays: 180,
    avatar: '👤',
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Status Bar */}
      <View style={styles.statusBar}>
        <Text style={styles.statusTime}>9:41</Text>
        <Text style={styles.statusTitle}>SecureTrade TZ</Text>
        <View style={styles.escrowTag}>
          <Ionicons name="shield-checkmark" size={10} color={COLORS.gold} />
          <Text style={styles.escrowTagText}>ESCROW</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Product Image */}
        <View style={styles.imageContainer}>
          {product.image ? (
            <Image source={{ uri: product.image }} style={styles.productImage} />
          ) : (
            <View style={styles.placeholderImage}>
              <Ionicons name="image" size={48} color={COLORS.surface3} />
            </View>
          )}
          <LinearGradient
            colors={['transparent', 'rgba(10,10,15,0.7)']}
            style={styles.imageOverlay}
          />
          <View style={styles.sourceBadge}>
            <View style={styles.igDot} />
            <Text style={styles.sourceBadgeText}>Instagram</Text>
          </View>
        </View>

        {/* Trust Strip */}
        <TrustStrip />

        {/* Product Info */}
        <View style={styles.productInfo}>
          {/* Condition & Tags */}
          <View style={styles.tagsRow}>
            <View style={[styles.tag, styles.tagCondition]}>
              <Text style={styles.tagText}>✦ Mint</Text>
            </View>
            <View style={[styles.tag, styles.tagEscrow]}>
              <Ionicons name="shield-checkmark" size={10} color={COLORS.emerald} />
              <Text style={[styles.tagText, { color: COLORS.emerald }]}>Escrow</Text>
            </View>
            <View style={[styles.tag, styles.tagMpesa]}>
              <Text style={styles.tagText}>📲 M-Pesa</Text>
            </View>
          </View>

          {/* Price */}
          <View style={styles.priceSection}>
            <Text style={styles.priceMain}>{formatTZSShort(product.price_tzs || product.price)}</Text>
            <Text style={styles.priceSub}>≈ ${((product.price_tzs || product.price) / 2580).toFixed(0)} USD</Text>
          </View>

          {/* Title */}
          <Text style={styles.productName}>{product.name}</Text>

          {/* Description */}
          {product.description && (
            <Text style={styles.productDescription}>{product.description}</Text>
          )}
        </View>

        {/* Seller Trust Card */}
        <View style={styles.sellerSection}>
          <SellerTrustCard seller={seller} />
        </View>

        {/* Buyer Protection Card */}
        <View style={styles.protectionCard}>
          <View style={styles.protectionIcon}>
            <Ionicons name="shield-checkmark" size={24} color={COLORS.emerald} />
          </View>
          <View style={styles.protectionContent}>
            <Text style={styles.protectionTitle}>Ulinzi wa Mnunuzi / Buyer Protection</Text>
            <Text style={styles.protectionText}>
              Pesa yako inashikwa salama katika escrow. Itatolewa tu ukithibitisha kupokea bidhaa.
            </Text>
            <Text style={styles.protectionTextEn}>
              Funds held in escrow, released only when you confirm receipt.
            </Text>
          </View>
        </View>

        {/* Fee Breakdown */}
        <View style={styles.feeCard}>
          <Text style={styles.feeTitle}>MUHTASARI WA MALIPO / PAYMENT SUMMARY</Text>
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>Bei ya bidhaa / Item price</Text>
            <Text style={styles.feeValue}>{formatTZS(product.price_tzs || product.price)}</Text>
          </View>
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>Ulinzi wa Mnunuzi ({product.fee_rate || '3%'})</Text>
            <Text style={styles.feeValue}>{formatTZS(product.buyer_protection_fee || 0)}</Text>
          </View>
          <View style={[styles.feeRow, styles.feeRowTotal]}>
            <Text style={styles.feeTotalLabel}>Jumla / Total</Text>
            <Text style={styles.feeTotalValue}>{formatTZS(product.total_buyer_pays || product.price_tzs || product.price)}</Text>
          </View>
        </View>

        {/* AI Product Suggestions - Only shown BEFORE payment/escrow */}
        <AIProductSuggestions
          currentProductId={product.product_id}
          orderId={null}  // No order yet - suggestions enabled
          preferences={['price', 'rating', 'shipping_speed']}
        />

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.buyButton}
          onPress={handleBuy}
          activeOpacity={0.85}
          data-testid="buy-securely-btn"
        >
          <LinearGradient
            colors={[COLORS.gold, COLORS.goldDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.buyButtonGradient}
          >
            <Text style={styles.buyButtonText}>Nunua Salama · Buy Securely</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Floating Chat Button */}
      {!showChat && (
        <TouchableOpacity
          style={styles.chatFab}
          onPress={() => setShowChat(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.chatFabText}>💬</Text>
        </TouchableOpacity>
      )}

      {/* AI Chatbot */}
      {showChat && (
        <AIChatbot mode="support" onClose={() => setShowChat(false)} />
      )}
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
  loadingText: {
    marginTop: 12,
    color: COLORS.ink,
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: COLORS.surface,
  },
  errorText: {
    marginTop: 12,
    color: COLORS.ink,
    fontSize: 16,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 20,
    backgroundColor: COLORS.ink,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
  },
  retryBtnText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  statusBar: {
    backgroundColor: COLORS.ink,
    paddingHorizontal: 20,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusTime: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '500',
  },
  statusTitle: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  escrowTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(200,169,110,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  escrowTagText: {
    color: COLORS.gold,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  imageContainer: {
    height: 260,
    backgroundColor: COLORS.surface2,
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  sourceBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(10,10,15,0.8)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  igDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E1306C',
  },
  sourceBadgeText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '700',
  },
  productInfo: {
    padding: 16,
    backgroundColor: COLORS.white,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagCondition: {
    backgroundColor: COLORS.goldLight + '30',
  },
  tagEscrow: {
    backgroundColor: COLORS.emeraldPale,
  },
  tagMpesa: {
    backgroundColor: '#4bb54320',
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.ink,
  },
  priceSection: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 8,
  },
  priceMain: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.goldDark,
  },
  priceSub: {
    fontSize: 13,
    color: 'rgba(10,10,15,0.4)',
  },
  productName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.ink,
    marginBottom: 8,
  },
  productDescription: {
    fontSize: 14,
    color: 'rgba(10,10,15,0.6)',
    lineHeight: 22,
  },
  sellerSection: {
    padding: 16,
    paddingTop: 0,
  },
  protectionCard: {
    margin: 16,
    marginTop: 0,
    backgroundColor: COLORS.emeraldPale,
    borderRadius: RADIUS.lg,
    padding: 16,
    flexDirection: 'row',
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(26,122,90,0.15)',
  },
  protectionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  protectionContent: {
    flex: 1,
  },
  protectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.emerald,
    marginBottom: 6,
  },
  protectionText: {
    fontSize: 12,
    color: COLORS.ink,
    lineHeight: 18,
  },
  protectionTextEn: {
    fontSize: 11,
    color: 'rgba(10,10,15,0.5)',
    marginTop: 4,
    fontStyle: 'italic',
  },
  feeCard: {
    margin: 16,
    marginTop: 0,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: 16,
    ...SHADOWS.sm,
  },
  feeTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(10,10,15,0.4)',
    letterSpacing: 1,
    marginBottom: 12,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  feeLabel: {
    fontSize: 13,
    color: 'rgba(10,10,15,0.6)',
  },
  feeValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.ink,
  },
  feeRowTotal: {
    borderTopWidth: 1,
    borderTopColor: COLORS.surface3,
    marginTop: 4,
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
  bottomBar: {
    backgroundColor: COLORS.ink,
    padding: 12,
    paddingHorizontal: 20,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  buyButton: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    ...SHADOWS.gold,
  },
  buyButtonGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  buyButtonText: {
    color: COLORS.ink,
    fontSize: 15,
    fontWeight: '700',
  },
  chatFab: {
    position: 'absolute',
    bottom: 100,
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
