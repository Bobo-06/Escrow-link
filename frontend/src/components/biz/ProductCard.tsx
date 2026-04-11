import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/bizSalama';
import { LinearGradient } from 'expo-linear-gradient';

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    description: string;
    price: number;
    image?: string;
    condition?: string;
    seller: {
      name: string;
      rating: number;
      trades: number;
      trustScore: number;
      verified: boolean;
    };
  };
  onBuy: () => void;
}

export default function ProductCard({ product, onBuy }: ProductCardProps) {
  const formatTZS = (amount: number) => `TZS ${amount.toLocaleString()}`;

  return (
    <View style={styles.container}>
      {/* Product Image */}
      <View style={styles.imageContainer}>
        {product.image ? (
          <Image source={{ uri: product.image }} style={styles.image} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="cube" size={64} color={COLORS.textMuted} />
          </View>
        )}
        {product.condition && (
          <View style={styles.conditionBadge}>
            <Text style={styles.conditionText}>{product.condition}</Text>
          </View>
        )}
      </View>

      {/* Product Info */}
      <View style={styles.infoSection}>
        <Text style={styles.productName}>{product.name}</Text>
        <Text style={styles.productDesc}>{product.description}</Text>
        
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Bei / Price</Text>
          <Text style={styles.priceValue}>{formatTZS(product.price)}</Text>
        </View>
      </View>

      {/* Seller Trust Card */}
      <View style={styles.sellerCard}>
        <View style={styles.sellerHeader}>
          <View style={styles.sellerAvatar}>
            <Ionicons name="person" size={24} color={COLORS.gold} />
          </View>
          <View style={styles.sellerInfo}>
            <View style={styles.sellerNameRow}>
              <Text style={styles.sellerName}>{product.seller.name}</Text>
              {product.seller.verified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="shield-checkmark" size={12} color={COLORS.emerald} />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              )}
            </View>
            <View style={styles.sellerStats}>
              <Ionicons name="star" size={14} color={COLORS.gold} />
              <Text style={styles.statText}>{product.seller.rating.toFixed(1)}</Text>
              <Text style={styles.statDivider}>·</Text>
              <Text style={styles.statText}>{product.seller.trades} trades</Text>
            </View>
          </View>
        </View>
        
        {/* Trust Score Bar */}
        <View style={styles.trustScoreSection}>
          <View style={styles.trustScoreHeader}>
            <Text style={styles.trustLabel}>Trust Score</Text>
            <Text style={styles.trustValue}>{product.seller.trustScore}%</Text>
          </View>
          <View style={styles.trustBarBg}>
            <View style={[styles.trustBarFill, { width: `${product.seller.trustScore}%` }]} />
          </View>
        </View>
      </View>

      {/* Escrow Badge */}
      <View style={styles.escrowBadge}>
        <Ionicons name="shield-checkmark" size={20} color={COLORS.gold} />
        <View style={styles.escrowTextContainer}>
          <Text style={styles.escrowTitle}>Escrow Protection</Text>
          <Text style={styles.escrowSubtitle}>Pesa yako inalindwa hadi upokee bidhaa</Text>
        </View>
      </View>

      {/* Buy Button */}
      <TouchableOpacity onPress={onBuy} activeOpacity={0.85}>
        <LinearGradient
          colors={[COLORS.gold, COLORS.goldDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.buyButton}
        >
          <Ionicons name="shield-checkmark" size={20} color={COLORS.ink} />
          <Text style={styles.buyButtonText}>Nunua kwa Usalama · Buy Securely</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.ink2,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },
  imageContainer: {
    aspectRatio: 1,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: COLORS.ink3,
    marginBottom: 16,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  conditionBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: COLORS.emerald,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  conditionText: {
    color: COLORS.ink,
    fontSize: 12,
    fontWeight: '700',
  },
  infoSection: {
    marginBottom: 16,
  },
  productName: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  productDesc: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.goldPale,
    padding: 14,
    borderRadius: 12,
  },
  priceLabel: {
    fontSize: 14,
    color: COLORS.gold,
    fontWeight: '500',
  },
  priceValue: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.gold,
  },
  sellerCard: {
    backgroundColor: COLORS.ink3,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  sellerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sellerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.goldPale,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sellerInfo: {
    flex: 1,
  },
  sellerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sellerName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.emeraldPale,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  verifiedText: {
    fontSize: 10,
    color: COLORS.emerald,
    fontWeight: '600',
  },
  sellerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  statDivider: {
    color: COLORS.textMuted,
  },
  trustScoreSection: {
    marginTop: 4,
  },
  trustScoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  trustLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  trustValue: {
    fontSize: 12,
    color: COLORS.emerald,
    fontWeight: '700',
  },
  trustBarBg: {
    height: 6,
    backgroundColor: COLORS.ink,
    borderRadius: 3,
    overflow: 'hidden',
  },
  trustBarFill: {
    height: '100%',
    backgroundColor: COLORS.emerald,
    borderRadius: 3,
  },
  escrowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.goldPale,
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(212, 160, 58, 0.3)',
  },
  escrowTextContainer: {
    flex: 1,
  },
  escrowTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.gold,
  },
  escrowSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  buyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    borderRadius: 14,
  },
  buyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.ink,
  },
});
