import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { paymentLinkApi } from '../../src/api/api';

const COLORS = {
  primary: '#0D9488',
  primaryLight: '#14B8A6',
  gold: '#F59E0B',
  goldBg: '#FFFBEB',
  dark: '#0F172A',
  darkGray: '#1E293B',
  gray: '#64748B',
  lightGray: '#E2E8F0',
  background: '#F8FAFC',
  white: '#FFFFFF',
  success: '#10B981',
  blue: '#3B82F6',
  blueBg: '#EFF6FF',
};

export default function ProductPage() {
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code: string }>();
  const [product, setProduct] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState('TZS');

  useEffect(() => {
    loadProduct();
  }, [code, selectedCurrency]);

  const loadProduct = async () => {
    try {
      setIsLoading(true);
      const response = await paymentLinkApi.getByCode(code || '', selectedCurrency);
      setProduct(response.data);
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Product not found');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBuy = () => {
    router.push({
      pathname: '/checkout/[orderId]',
      params: { 
        orderId: 'new', 
        productId: product.product_id,
        currency: selectedCurrency 
      },
    });
  };

  const formatPrice = (amount: number, currency: string = 'TZS') => {
    if (currency === 'TZS') return `TZS ${amount?.toLocaleString() || 0}`;
    if (currency === 'USD') return `$${amount?.toFixed(2) || 0}`;
    if (currency === 'GBP') return `\u00a3${amount?.toFixed(2) || 0}`;
    if (currency === 'EUR') return `\u20ac${amount?.toFixed(2) || 0}`;
    return `${currency} ${amount?.toLocaleString() || 0}`;
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft} />
          <View style={styles.headerCenter}>
            <Ionicons name="shield-checkmark" size={18} color={COLORS.white} />
            <Text style={styles.headerTitle}>CraftHer</Text>
          </View>
          <View style={styles.headerRight}>
            <Ionicons name="lock-closed" size={14} color={COLORS.gold} />
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading product...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !product) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>CraftHer</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <View style={styles.errorIcon}>
            <Ionicons name="alert-circle" size={48} color="#EF4444" />
          </View>
          <Text style={styles.errorTitle}>Product Not Found</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const displayPrice = selectedCurrency === 'TZS' 
    ? product.price_tzs || product.price 
    : product.display_price || product.price;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} data-testid="back-btn">
          <Ionicons name="chevron-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Ionicons name="shield-checkmark" size={18} color={COLORS.white} />
          <Text style={styles.headerTitle}>CraftHer</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.secureTag}>
            <Ionicons name="lock-closed" size={11} color={COLORS.gold} />
            <Text style={styles.secureText}>Secure</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Secure Checkout Label */}
        <View style={styles.secureLabel}>
          <Ionicons name="shield-checkmark" size={16} color={COLORS.gold} />
          <Text style={styles.secureLabelText}>Secure Checkout</Text>
        </View>

        {/* Product Image */}
        <View style={styles.imageContainer}>
          {product.image ? (
            <Image source={{ uri: product.image }} style={styles.productImage} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="image-outline" size={64} color={COLORS.lightGray} />
            </View>
          )}
        </View>

        {/* Product Info */}
        <Text style={styles.productName}>{product.name}</Text>
        <View style={styles.priceRow}>
          <View style={styles.priceTag}>
            <Ionicons name="pricetag" size={16} color={COLORS.primary} />
            <Text style={styles.productPrice}>{formatPrice(displayPrice, selectedCurrency)}</Text>
          </View>
        </View>

        {/* Seller Info */}
        <View style={styles.sellerSection}>
          <View style={styles.sellerAvatar}>
            <Ionicons name="person" size={22} color={COLORS.primary} />
          </View>
          <View style={styles.sellerInfo}>
            <Text style={styles.sellerLabel}>Seller</Text>
            <Text style={styles.sellerName}>{product.seller_business || product.seller_name}</Text>
          </View>
          {product.seller_is_women_owned && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="shield-checkmark" size={14} color={COLORS.gold} />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          )}
        </View>

        {/* Trade Metrics */}
        {product.seller_trade_metrics && product.seller_trade_metrics.successful_transactions > 0 && (
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={16} color={COLORS.gold} />
            <Text style={styles.ratingText}>
              {product.seller_trade_metrics.success_rate}% success rate
            </Text>
            <View style={styles.ratingDot} />
            <Text style={styles.ratingText}>
              {product.seller_trade_metrics.successful_transactions} orders completed
            </Text>
          </View>
        )}

        {/* Buyer Protection Section */}
        <View style={styles.protectionSection}>
          <View style={styles.protectionHeader}>
            <View style={styles.protectionIconBg}>
              <Ionicons name="shield-checkmark" size={20} color={COLORS.gold} />
            </View>
            <Text style={styles.protectionTitle}>Buyer Protection</Text>
          </View>
          
          <View style={styles.protectionItem}>
            <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
            <Text style={styles.protectionText}>Payment held safely in escrow</Text>
          </View>
          <View style={styles.protectionItem}>
            <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
            <Text style={styles.protectionText}>Seller paid ONLY after delivery</Text>
          </View>
          <View style={styles.protectionItem}>
            <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
            <Text style={styles.protectionText}>Full refund if not delivered</Text>
          </View>
        </View>

        {/* Delivery Info */}
        <View style={styles.deliveryRow}>
          <Ionicons name="car" size={18} color={COLORS.gray} />
          <Text style={styles.deliveryText}>Delivery: 2-4 days (Dar es Salaam)</Text>
        </View>

        {/* Diaspora Currency Selector */}
        {product.international_shipping && (
          <View style={styles.currencySection}>
            <View style={styles.currencyHeader}>
              <Ionicons name="globe" size={18} color={COLORS.blue} />
              <Text style={styles.currencyLabel}>Pay in your currency:</Text>
            </View>
            <View style={styles.currencyOptions}>
              {['TZS', 'USD', 'GBP', 'EUR'].map((curr) => (
                <TouchableOpacity
                  key={curr}
                  style={[
                    styles.currencyOption,
                    selectedCurrency === curr && styles.currencyOptionActive,
                  ]}
                  onPress={() => setSelectedCurrency(curr)}
                  data-testid={`currency-${curr.toLowerCase()}`}
                >
                  <Text
                    style={[
                      styles.currencyOptionText,
                      selectedCurrency === curr && styles.currencyOptionTextActive,
                    ]}
                  >
                    {curr}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Buy Button */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.buyButton} onPress={handleBuy} data-testid="buy-safely-btn">
          <Ionicons name="shield-checkmark" size={20} color={COLORS.white} />
          <Text style={styles.buyButtonText}>Buy Safely</Text>
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
  headerLeft: {
    width: 40,
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  secureTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  secureText: {
    fontSize: 11,
    color: COLORS.white,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.gray,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.dark,
    marginTop: 8,
  },
  errorText: {
    fontSize: 15,
    color: COLORS.gray,
    marginTop: 8,
    textAlign: 'center',
  },
  scrollContent: {
    padding: 20,
  },
  secureLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  secureLabelText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark,
  },
  imageContainer: {
    aspectRatio: 1,
    backgroundColor: COLORS.background,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  productName: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.dark,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  priceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  productPrice: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.primary,
  },
  sellerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    padding: 14,
    backgroundColor: COLORS.background,
    borderRadius: 14,
  },
  sellerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#CCFBF1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sellerInfo: {
    flex: 1,
  },
  sellerLabel: {
    fontSize: 12,
    color: COLORS.gray,
  },
  sellerName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark,
    marginTop: 2,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.goldBg,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  verifiedText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '600',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  ratingText: {
    fontSize: 14,
    color: COLORS.gray,
  },
  ratingDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.gray,
  },
  protectionSection: {
    backgroundColor: COLORS.goldBg,
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  protectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  protectionIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  protectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.dark,
  },
  protectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  protectionText: {
    fontSize: 14,
    color: COLORS.darkGray,
  },
  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
    marginBottom: 16,
  },
  deliveryText: {
    fontSize: 14,
    color: COLORS.gray,
  },
  currencySection: {
    backgroundColor: COLORS.blueBg,
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  currencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  currencyLabel: {
    fontSize: 14,
    color: '#1E40AF',
    fontWeight: '600',
  },
  currencyOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  currencyOption: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#DBEAFE',
  },
  currencyOptionActive: {
    backgroundColor: COLORS.blue,
  },
  currencyOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
  },
  currencyOptionTextActive: {
    color: COLORS.white,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
    backgroundColor: COLORS.white,
  },
  buyButton: {
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
  buyButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '700',
  },
});
