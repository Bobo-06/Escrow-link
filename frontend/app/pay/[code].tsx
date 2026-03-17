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
    if (currency === 'GBP') return `£${amount?.toFixed(2) || 0}`;
    if (currency === 'EUR') return `€${amount?.toFixed(2) || 0}`;
    return `${currency} ${amount?.toLocaleString() || 0}`;
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#16A34A" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !product) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#EF4444" />
          <Text style={styles.errorTitle}>Product Not Found</Text>
          <Text style={styles.errorText}>{error || 'This payment link is invalid or expired'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const displayPrice = selectedCurrency === 'TZS' 
    ? product.price_tzs || product.price 
    : product.display_price || product.price;
  
  const displayFee = selectedCurrency === 'TZS'
    ? product.buyer_protection_fee
    : product.buyer_protection_fee_display;
  
  const displayTotal = selectedCurrency === 'TZS'
    ? product.total_buyer_pays
    : product.total_buyer_pays_display;

  return (
    <SafeAreaView style={styles.container}>
      {/* Green Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Ionicons name="shield-checkmark" size={20} color="#FFFFFF" />
          <Text style={styles.headerText}>CraftHer</Text>
        </View>
        <View style={styles.headerRight}>
          <Ionicons name="lock-closed" size={16} color="#FFFFFF" />
          <Text style={styles.headerSecure}>Secure Checkout</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Secure Checkout Label */}
        <View style={styles.secureLabel}>
          <Text style={styles.secureLabelText}>Secure Checkout</Text>
          <Ionicons name="lock-closed" size={14} color="#F59E0B" />
        </View>

        {/* Product Image */}
        <View style={styles.imageContainer}>
          {product.image ? (
            <Image source={{ uri: product.image }} style={styles.productImage} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="cube-outline" size={64} color="#D1D5DB" />
            </View>
          )}
        </View>

        {/* Product Info */}
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{product.name}</Text>
          <View style={styles.priceRow}>
            <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
            <Text style={styles.productPrice}>{formatPrice(displayPrice, selectedCurrency)}</Text>
          </View>
        </View>

        {/* Diaspora Currency Selector */}
        {product.international_shipping && (
          <View style={styles.currencySelector}>
            <Text style={styles.currencyLabel}>Pay in your currency:</Text>
            <View style={styles.currencyOptions}>
              {['TZS', 'USD', 'GBP', 'EUR'].map((curr) => (
                <TouchableOpacity
                  key={curr}
                  style={[
                    styles.currencyOption,
                    selectedCurrency === curr && styles.currencyOptionActive,
                  ]}
                  onPress={() => setSelectedCurrency(curr)}
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

        {/* Seller Info */}
        <View style={styles.sellerSection}>
          <View style={styles.sellerRow}>
            <View style={styles.sellerAvatar}>
              <Ionicons name="person" size={24} color="#16A34A" />
            </View>
            <View style={styles.sellerInfo}>
              <Text style={styles.sellerName}>
                {product.seller_business || product.seller_name}
              </Text>
              {product.seller_is_women_owned && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="shield-checkmark" size={12} color="#F59E0B" />
                  <Text style={styles.verifiedText}>Verified Artisan</Text>
                </View>
              )}
            </View>
          </View>
          
          {/* Trade Metrics */}
          {product.seller_trade_metrics && product.seller_trade_metrics.successful_transactions > 0 && (
            <View style={styles.tradeMetrics}>
              <Ionicons name="star" size={14} color="#F59E0B" />
              <Text style={styles.tradeMetricsText}>
                {product.seller_trade_metrics.success_rate}% success rate • {product.seller_trade_metrics.successful_transactions} orders completed
              </Text>
            </View>
          )}
        </View>

        {/* Trust Badges - Buyer Protection */}
        <View style={styles.trustSection}>
          <View style={styles.trustHeader}>
            <Ionicons name="shield-checkmark" size={20} color="#F59E0B" />
            <Text style={styles.trustTitle}>Buyer Protection</Text>
          </View>
          
          <View style={styles.trustItem}>
            <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
            <Text style={styles.trustText}>Payment held in escrow</Text>
          </View>
          <View style={styles.trustItem}>
            <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
            <Text style={styles.trustText}>Seller paid after delivery</Text>
          </View>
          <View style={styles.trustItem}>
            <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
            <Text style={styles.trustText}>Full refund if not delivered</Text>
          </View>
        </View>

        {/* Delivery Info */}
        <View style={styles.deliverySection}>
          <Ionicons name="car" size={18} color="#6B7280" />
          <Text style={styles.deliveryText}>Delivery: 2-4 days in Dar es Salaam</Text>
        </View>

        {/* International Badge */}
        {product.international_shipping && (
          <View style={styles.internationalBadge}>
            <Ionicons name="globe" size={16} color="#3B82F6" />
            <Text style={styles.internationalText}>International shipping available via NALA</Text>
          </View>
        )}
      </ScrollView>

      {/* Buy Button */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.buyButton} onPress={handleBuy}>
          <Text style={styles.buyButtonText}>Buy Safely</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  header: {
    backgroundColor: '#16A34A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerSecure: {
    fontSize: 12,
    color: '#FFFFFF',
  },
  scrollContent: {
    padding: 16,
  },
  secureLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  secureLabelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  imageContainer: {
    aspectRatio: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    marginBottom: 16,
  },
  productName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  productPrice: {
    fontSize: 20,
    fontWeight: '600',
    color: '#16A34A',
  },
  currencySelector: {
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  currencyLabel: {
    fontSize: 14,
    color: '#1E40AF',
    marginBottom: 8,
  },
  currencyOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  currencyOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#DBEAFE',
  },
  currencyOptionActive: {
    backgroundColor: '#3B82F6',
  },
  currencyOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
  },
  currencyOptionTextActive: {
    color: '#FFFFFF',
  },
  sellerSection: {
    marginBottom: 16,
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sellerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sellerInfo: {
    flex: 1,
  },
  sellerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  verifiedText: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '500',
  },
  tradeMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  tradeMetricsText: {
    fontSize: 12,
    color: '#6B7280',
  },
  trustSection: {
    backgroundColor: '#FEFCE8',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  trustHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  trustTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  trustText: {
    fontSize: 14,
    color: '#374151',
  },
  deliverySection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginBottom: 16,
  },
  deliveryText: {
    fontSize: 14,
    color: '#6B7280',
  },
  internationalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  internationalText: {
    fontSize: 14,
    color: '#3B82F6',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  buyButton: {
    backgroundColor: '#16A34A',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  buyButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
