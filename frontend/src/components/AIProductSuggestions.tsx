import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, RADIUS, SHADOWS, formatTZS } from '../constants/theme';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface Suggestion {
  product_id: string;
  name: string;
  price: number;
  price_formatted: string;
  description: string;
  image: string | null;
  link_code: string;
  seller: {
    name: string;
    rating: number;
    total_ratings: number;
    is_verified: boolean;
  };
  savings: number;
  score: number;
}

interface AIProductSuggestionsProps {
  currentProductId: string;
  orderId?: string | null;
  userId?: string | null;
  preferences?: string[];
  onSwitchProduct?: (linkCode: string) => void;
}

export function AIProductSuggestions({
  currentProductId,
  orderId,
  userId,
  preferences = ['price', 'rating', 'shipping_speed'],
  onSwitchProduct,
}: AIProductSuggestionsProps) {
  const router = useRouter();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetchSuggestions();
  }, [currentProductId, orderId]);

  const fetchSuggestions = async () => {
    if (!currentProductId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_URL}/api/ai/suggestions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          current_product_id: currentProductId,
          order_id: orderId,
          preferences,
        }),
      });
      
      const data = await response.json();
      
      if (data.anti_poach_active) {
        // Order in escrow - don't show suggestions
        setSuggestions([]);
        return;
      }
      
      setSuggestions(data.suggestions || []);
      setMessage(data.message_sw || '');
    } catch (err) {
      console.error('Failed to fetch suggestions:', err);
      setError('Imeshindikana kupata mapendekezo');
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchProduct = (linkCode: string) => {
    if (onSwitchProduct) {
      onSwitchProduct(linkCode);
    } else {
      // Navigate to product page
      if (Platform.OS === 'web') {
        window.location.href = `/pay/${linkCode}`;
      } else {
        router.push(`/pay/${linkCode}`);
      }
    }
  };

  // Don't render if dismissed, no suggestions, or order exists (anti-poaching)
  if (dismissed || !suggestions.length || orderId) {
    return null;
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={COLORS.gold} />
        <Text style={styles.loadingText}>AI inaangalia chaguzi... / AI is finding options...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.aiBadge}>
            <Text style={styles.aiBadgeText}>AI</Text>
          </View>
          <View>
            <Text style={styles.title}>SecureTrade AI imepata chaguzi</Text>
            <Text style={styles.titleEn}>AI found better options</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => setDismissed(true)} style={styles.closeBtn}>
          <Ionicons name="close" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* AI Message */}
      {message && (
        <Text style={styles.aiMessage}>{message}</Text>
      )}

      <Text style={styles.subtitle}>
        Wauzaji waliothibitishwa, ubora sawa — badilisha kabla ya kulipa
      </Text>
      <Text style={styles.subtitleEn}>
        Verified sellers, same quality — switch before paying
      </Text>

      {/* Suggestions Scroll */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.suggestionsContainer}
      >
        {suggestions.map((suggestion, index) => (
          <View key={suggestion.product_id} style={styles.suggestionCard}>
            {/* Savings Badge */}
            {suggestion.savings > 0 && (
              <View style={styles.savingsBadge}>
                <Text style={styles.savingsText}>
                  Okoa {formatTZS(suggestion.savings)}
                </Text>
              </View>
            )}

            {/* Product Info */}
            <View style={styles.productInfo}>
              <Text style={styles.productName} numberOfLines={2}>
                {suggestion.name}
              </Text>
              
              <View style={styles.priceRow}>
                <Text style={styles.productPrice}>{suggestion.price_formatted}</Text>
                {suggestion.savings > 0 && (
                  <View style={styles.savingsChip}>
                    <Ionicons name="trending-down" size={12} color={COLORS.emerald} />
                    <Text style={styles.savingsChipText}>-{Math.round((suggestion.savings / (suggestion.price + suggestion.savings)) * 100)}%</Text>
                  </View>
                )}
              </View>

              {/* Seller Info */}
              <View style={styles.sellerRow}>
                <View style={styles.sellerInfo}>
                  {suggestion.seller.is_verified && (
                    <Ionicons name="shield-checkmark" size={12} color={COLORS.emerald} />
                  )}
                  <Text style={styles.sellerName}>{suggestion.seller.name}</Text>
                </View>
                <View style={styles.ratingContainer}>
                  <Ionicons name="star" size={12} color="#F59E0B" />
                  <Text style={styles.ratingText}>
                    {suggestion.seller.rating.toFixed(1)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Switch Button */}
            <TouchableOpacity
              style={styles.switchBtn}
              onPress={() => handleSwitchProduct(suggestion.link_code)}
              activeOpacity={0.85}
            >
              <Text style={styles.switchBtnText}>Badilisha</Text>
              <Text style={styles.switchBtnTextEn}>Switch</Text>
              <Ionicons name="arrow-forward" size={14} color={COLORS.ink} />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      {/* Trust Note */}
      <View style={styles.trustNote}>
        <Ionicons name="shield-checkmark" size={14} color={COLORS.emerald} />
        <Text style={styles.trustNoteText}>
          Bidhaa zote zinalindwa na escrow · All products escrow-protected
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF9E6',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: RADIUS.xl,
    padding: 16,
    marginTop: 16,
    ...SHADOWS.sm,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF9E6',
    borderRadius: RADIUS.lg,
    padding: 12,
    marginTop: 16,
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  aiBadge: {
    backgroundColor: COLORS.ink,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  aiBadgeText: {
    color: COLORS.gold,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.ink,
  },
  titleEn: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  closeBtn: {
    padding: 4,
  },
  aiMessage: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontStyle: 'italic',
    marginBottom: 8,
    lineHeight: 18,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  subtitleEn: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  suggestionsContainer: {
    paddingVertical: 4,
    gap: 12,
  },
  suggestionCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: 12,
    width: 200,
    marginRight: 12,
    borderWidth: 1,
    borderColor: COLORS.surface3,
    ...SHADOWS.sm,
  },
  savingsBadge: {
    position: 'absolute',
    top: -6,
    right: 8,
    backgroundColor: COLORS.emerald,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    zIndex: 1,
  },
  savingsText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '700',
  },
  productInfo: {
    marginBottom: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.ink,
    marginBottom: 6,
    lineHeight: 18,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.ink,
  },
  savingsChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  savingsChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.emerald,
  },
  sellerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sellerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sellerName: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  switchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.gold,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
  },
  switchBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.ink,
  },
  switchBtnTextEn: {
    fontSize: 11,
    color: COLORS.ink,
    opacity: 0.7,
  },
  trustNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  trustNoteText: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
});

export default AIProductSuggestions;
