import React, { useState, useEffect } from 'react';
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
import { productsApi, currencyApi } from '../../src/api/api';

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
  
  // New trade finance fields
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
    const diasporaBuyerFee = priceNum * 0.02; // Lower for international
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
        {/* Green Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Payment Link</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Image Upload */}
          <TouchableOpacity style={styles.imageUpload} onPress={pickImage}>
            {image ? (
              <Image source={{ uri: image }} style={styles.productImage} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="camera" size={32} color="#9CA3AF" />
                <Text style={styles.uploadText}>Upload Photo</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Product Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Handwoven Basket"
                placeholderTextColor="#9CA3AF"
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Price (TZS) *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 45000"
                placeholderTextColor="#9CA3AF"
                value={price}
                onChangeText={setPrice}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe your product..."
                placeholderTextColor="#9CA3AF"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* International Shipping Toggle */}
            <View style={styles.toggleSection}>
              <View style={styles.toggleHeader}>
                <View style={styles.toggleInfo}>
                  <Ionicons name="globe" size={22} color="#3B82F6" />
                  <View>
                    <Text style={styles.toggleTitle}>Enable Diaspora Sales</Text>
                    <Text style={styles.toggleSubtitle}>Accept payments via NALA from UK, US, EU</Text>
                  </View>
                </View>
                <Switch
                  value={internationalShipping}
                  onValueChange={setInternationalShipping}
                  trackColor={{ false: '#D1D5DB', true: '#86EFAC' }}
                  thumbColor={internationalShipping ? '#16A34A' : '#F9FAFB'}
                />
              </View>
            </View>

            {/* Export Category (shown if international enabled) */}
            {internationalShipping && (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Export Category</Text>
                <TouchableOpacity
                  style={styles.categorySelector}
                  onPress={() => setShowCategories(!showCategories)}
                >
                  {selectedCategory ? (
                    <View style={styles.selectedCategory}>
                      <Ionicons name={selectedCategory.icon as any} size={18} color="#16A34A" />
                      <Text style={styles.selectedCategoryText}>{selectedCategory.label}</Text>
                    </View>
                  ) : (
                    <Text style={styles.categorySelectorPlaceholder}>Select category</Text>
                  )}
                  <Ionicons name={showCategories ? 'chevron-up' : 'chevron-down'} size={20} color="#6B7280" />
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
                      >
                        <Ionicons
                          name={cat.icon as any}
                          size={18}
                          color={exportCategory === cat.id ? '#16A34A' : '#6B7280'}
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
                <Text style={styles.feeTitle}>Fee Breakdown</Text>
                
                <View style={styles.feeSection}>
                  <Text style={styles.feeSectionTitle}>Local Buyers (TZ)</Text>
                  <View style={styles.feeRow}>
                    <Text style={styles.feeLabel}>Buyer pays (3% protection)</Text>
                    <Text style={styles.feeValue}>TZS {parseInt(fees.totalBuyer).toLocaleString()}</Text>
                  </View>
                </View>

                {internationalShipping && (
                  <View style={styles.feeSection}>
                    <View style={styles.diasporaHeader}>
                      <Ionicons name="globe" size={16} color="#3B82F6" />
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
            >
              <Ionicons name="link" size={20} color="#FFFFFF" />
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
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#16A34A',
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
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  scrollContent: {
    padding: 20,
  },
  imageUpload: {
    alignSelf: 'center',
    width: 140,
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: '#E5E7EB',
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
  uploadText: {
    fontSize: 14,
    color: '#6B7280',
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#1F2937',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  toggleSection: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  toggleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  toggleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E40AF',
  },
  toggleSubtitle: {
    fontSize: 12,
    color: '#3B82F6',
    marginTop: 2,
  },
  categorySelector: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedCategoryText: {
    fontSize: 16,
    color: '#16A34A',
    fontWeight: '500',
  },
  categorySelectorPlaceholder: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  categoryList: {
    marginTop: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  categoryOptionActive: {
    backgroundColor: '#DCFCE7',
  },
  categoryOptionText: {
    fontSize: 14,
    color: '#374151',
  },
  categoryOptionTextActive: {
    color: '#16A34A',
    fontWeight: '500',
  },
  feePreview: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  feeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  feeSection: {
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  feeSectionTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 6,
  },
  feeSectionTitleBlue: {
    fontSize: 12,
    fontWeight: '500',
    color: '#3B82F6',
  },
  diasporaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
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
    color: '#6B7280',
  },
  feeLabelBold: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  feeValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  feeValueBlue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3B82F6',
  },
  feeValueGreen: {
    fontSize: 16,
    fontWeight: '600',
    color: '#16A34A',
  },
  createButton: {
    backgroundColor: '#16A34A',
    paddingVertical: 16,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
