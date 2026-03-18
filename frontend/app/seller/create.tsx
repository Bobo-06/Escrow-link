import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Image,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { productsApi } from '../../src/api/api';

const COLORS = {
  primary: '#0D9488',
  primaryLight: '#14B8A6',
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
  blue: '#3B82F6',
  blueBg: '#EFF6FF',
};

const exportCategories = [
  { id: 'textiles_fashion', label: 'Textiles & Fashion', icon: 'shirt' },
  { id: 'handicrafts_art', label: 'Handicrafts & Art', icon: 'brush' },
  { id: 'food_beverages', label: 'Food & Beverages', icon: 'cafe' },
  { id: 'beauty_cosmetics', label: 'Beauty & Cosmetics', icon: 'flower' },
  { id: 'jewelry_accessories', label: 'Jewelry & Accessories', icon: 'diamond' },
  { id: 'home_decor', label: 'Home Decor', icon: 'home' },
  { id: 'agricultural_products', label: 'Agricultural Products', icon: 'leaf' },
];

export default function CreateProduct() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Trade finance fields
  const [internationalShipping, setInternationalShipping] = useState(false);
  const [exportCategory, setExportCategory] = useState('');
  const [showCategories, setShowCategories] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter a product name');
      return;
    }

    const priceNum = parseFloat(price);
    if (!price || isNaN(priceNum) || priceNum <= 0) {
      Alert.alert('Required', 'Please enter a valid price');
      return;
    }

    setIsLoading(true);
    try {
      const response = await productsApi.create({
        name: name.trim(),
        price: priceNum,
        currency: 'TZS',
        description: description.trim() || undefined,
        image: image || undefined,
        export_category: exportCategory || undefined,
        international_shipping: internationalShipping,
      });

      router.push({
        pathname: '/seller/link-created',
        params: {
          productId: response.data.product_id,
          code: response.data.payment_link_code,
          name: response.data.name,
          price: response.data.price.toString(),
          international: internationalShipping ? 'true' : 'false',
        },
      });
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Could not create product');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateFees = () => {
    const priceNum = parseFloat(price) || 0;
    const buyerFee = priceNum * 0.03;
    const sellerFee = priceNum * 0.02;
    const diasporaBuyerFee = priceNum * 0.02;
    return {
      buyerFee: buyerFee.toFixed(0),
      sellerFee: sellerFee.toFixed(0),
      totalBuyer: (priceNum + buyerFee).toFixed(0),
      sellerReceives: (priceNum - sellerFee).toFixed(0),
      diasporaBuyerFee: diasporaBuyerFee.toFixed(0),
      diasporaTotal: (priceNum + diasporaBuyerFee).toFixed(0),
    };
  };

  const fees = calculateFees();
  const selectedCategory = exportCategories.find(c => c.id === exportCategory);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} data-testid="back-btn">
            <Ionicons name="chevron-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Payment Link</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Image Upload */}
          <TouchableOpacity style={styles.imageUpload} onPress={pickImage} data-testid="image-upload">
            {image ? (
              <Image source={{ uri: image }} style={styles.productImage} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <View style={styles.cameraIconBg}>
                  <Ionicons name="camera" size={28} color={COLORS.primary} />
                </View>
                <Text style={styles.uploadText}>Upload Product Photo</Text>
                <Text style={styles.uploadHint}>Tap to add image</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Product Name *</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="pricetag-outline" size={20} color={COLORS.gray} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Handwoven Basket"
                  placeholderTextColor={COLORS.gray}
                  value={name}
                  onChangeText={setName}
                  data-testid="product-name-input"
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Price (TZS) *</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.currencyPrefix}>TZS</Text>
                <TextInput
                  style={styles.input}
                  placeholder="45,000"
                  placeholderTextColor={COLORS.gray}
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="numeric"
                  data-testid="price-input"
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Description</Text>
              <View style={[styles.inputWrapper, styles.inputWrapperLarge]}>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Describe your product..."
                  placeholderTextColor={COLORS.gray}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={3}
                  data-testid="description-input"
                />
              </View>
            </View>

            {/* International Shipping Toggle */}
            <View style={styles.toggleSection}>
              <View style={styles.toggleHeader}>
                <View style={styles.toggleIconBg}>
                  <Ionicons name="globe" size={22} color={COLORS.blue} />
                </View>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleTitle}>Enable Diaspora Sales</Text>
                  <Text style={styles.toggleSubtitle}>Accept payments via NALA from UK, US, EU</Text>
                </View>
                <Switch
                  value={internationalShipping}
                  onValueChange={setInternationalShipping}
                  trackColor={{ false: '#D1D5DB', true: '#99F6E4' }}
                  thumbColor={internationalShipping ? COLORS.primary : '#F9FAFB'}
                />
              </View>
            </View>

            {/* Export Category */}
            {internationalShipping && (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Export Category</Text>
                <TouchableOpacity
                  style={styles.categorySelector}
                  onPress={() => setShowCategories(!showCategories)}
                  data-testid="category-selector"
                >
                  {selectedCategory ? (
                    <View style={styles.selectedCategory}>
                      <Ionicons name={selectedCategory.icon as any} size={18} color={COLORS.primary} />
                      <Text style={styles.selectedCategoryText}>{selectedCategory.label}</Text>
                    </View>
                  ) : (
                    <Text style={styles.categorySelectorPlaceholder}>Select category</Text>
                  )}
                  <Ionicons name={showCategories ? 'chevron-up' : 'chevron-down'} size={20} color={COLORS.gray} />
                </TouchableOpacity>

                {showCategories && (
                  <View style={styles.categoryList}>
                    {exportCategories.map((cat) => (
                      <TouchableOpacity
                        key={cat.id}
                        style={[
                          styles.categoryOption,
                          exportCategory === cat.id && styles.categoryOptionActive,
                        ]}
                        onPress={() => {
                          setExportCategory(cat.id);
                          setShowCategories(false);
                        }}
                        data-testid={`category-${cat.id}`}
                      >
                        <Ionicons
                          name={cat.icon as any}
                          size={18}
                          color={exportCategory === cat.id ? COLORS.primary : COLORS.gray}
                        />
                        <Text
                          style={[
                            styles.categoryOptionText,
                            exportCategory === cat.id && styles.categoryOptionTextActive,
                          ]}
                        >
                          {cat.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Fee Preview */}
            {parseFloat(price) > 0 && (
              <View style={styles.feePreview}>
                <View style={styles.feeHeader}>
                  <Ionicons name="calculator" size={18} color={COLORS.primary} />
                  <Text style={styles.feeTitle}>Fee Breakdown</Text>
                </View>
                
                <View style={styles.feeSection}>
                  <Text style={styles.feeSectionTitle}>Local Buyers (Tanzania)</Text>
                  <View style={styles.feeRow}>
                    <Text style={styles.feeLabel}>Buyer pays (3% protection)</Text>
                    <Text style={styles.feeValue}>TZS {parseInt(fees.totalBuyer).toLocaleString()}</Text>
                  </View>
                </View>

                {internationalShipping && (
                  <View style={styles.feeSection}>
                    <View style={styles.diasporaHeader}>
                      <Ionicons name="globe" size={14} color={COLORS.blue} />
                      <Text style={styles.feeSectionTitleBlue}>Diaspora Buyers (UK, US, EU)</Text>
                    </View>
                    <View style={styles.feeRow}>
                      <Text style={styles.feeLabel}>Buyer pays (2% - reduced!)</Text>
                      <Text style={styles.feeValueBlue}>TZS {parseInt(fees.diasporaTotal).toLocaleString()}</Text>
                    </View>
                  </View>
                )}

                <View style={styles.feeRowHighlight}>
                  <Text style={styles.feeLabelBold}>You receive (after 2% fee)</Text>
                  <Text style={styles.feeValueGreen}>TZS {parseInt(fees.sellerReceives).toLocaleString()}</Text>
                </View>
              </View>
            )}

            {/* Create Button */}
            <TouchableOpacity
              style={[styles.createButton, isLoading && styles.buttonDisabled]}
              onPress={handleCreate}
              disabled={isLoading}
              data-testid="create-link-btn"
            >
              <Ionicons name="link" size={20} color={COLORS.white} />
              <Text style={styles.createButtonText}>
                {isLoading ? 'Creating...' : 'Generate Secure Link'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
  },
  scrollContent: {
    padding: 20,
  },
  imageUpload: {
    alignSelf: 'center',
    width: 160,
    height: 160,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: COLORS.background,
    borderWidth: 2,
    borderColor: COLORS.lightGray,
    borderStyle: 'dashed',
    marginBottom: 24,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  cameraIconBg: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#CCFBF1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  uploadText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.dark,
  },
  uploadHint: {
    fontSize: 12,
    color: COLORS.gray,
  },
  form: {
    gap: 18,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.darkGray,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  inputWrapperLarge: {
    alignItems: 'flex-start',
    paddingTop: 4,
  },
  inputIcon: {
    marginRight: 10,
  },
  currencyPrefix: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: COLORS.dark,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  toggleSection: {
    backgroundColor: COLORS.blueBg,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  toggleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  toggleInfo: {
    flex: 1,
  },
  toggleTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E40AF',
  },
  toggleSubtitle: {
    fontSize: 12,
    color: COLORS.blue,
    marginTop: 2,
  },
  categorySelector: {
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  selectedCategoryText: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
  },
  categorySelectorPlaceholder: {
    fontSize: 16,
    color: COLORS.gray,
  },
  categoryList: {
    marginTop: 8,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    overflow: 'hidden',
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  categoryOptionActive: {
    backgroundColor: '#F0FDFA',
  },
  categoryOptionText: {
    fontSize: 15,
    color: COLORS.dark,
  },
  categoryOptionTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  feePreview: {
    backgroundColor: COLORS.background,
    padding: 18,
    borderRadius: 16,
    gap: 14,
  },
  feeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  feeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.dark,
  },
  feeSection: {
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  feeSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.gray,
    marginBottom: 8,
  },
  feeSectionTitleBlue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.blue,
  },
  diasporaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  feeRowHighlight: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  feeLabel: {
    fontSize: 14,
    color: COLORS.gray,
  },
  feeLabelBold: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.dark,
  },
  feeValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.dark,
  },
  feeValueBlue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.blue,
  },
  feeValueGreen: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.success,
  },
  createButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 18,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  createButtonText: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: '700',
  },
});
