import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL || '';

export default function LinkCreated() {
  const router = useRouter();
  const { code, name, price } = useLocalSearchParams<{
    productId: string;
    code: string;
    name: string;
    price: string;
  }>();

  const paymentLink = `${API_URL}/pay/${code}`;

  const copyLink = async () => {
    await Clipboard.setStringAsync(paymentLink);
    Alert.alert('Copied!', 'Payment link copied to clipboard');
  };

  const shareOnWhatsApp = async () => {
    const message = `Check out my product: ${name}\nPrice: TZS ${parseFloat(price || '0').toLocaleString()}\n\nBuy securely here: ${paymentLink}`;
    try {
      await Share.share({
        message,
        title: name,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Success Icon */}
        <View style={styles.successIcon}>
          <Ionicons name="checkmark-circle" size={80} color="#059669" />
        </View>

        {/* Success Message */}
        <Text style={styles.title}>Link Created!</Text>
        <Text style={styles.subtitle}>
          Your secure payment link is ready to share
        </Text>

        {/* Link Preview */}
        <View style={styles.linkContainer}>
          <View style={styles.linkBox}>
            <Ionicons name="link" size={20} color="#7C3AED" />
            <Text style={styles.linkText} numberOfLines={1}>
              {paymentLink}
            </Text>
          </View>
        </View>

        {/* Product Info */}
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{name}</Text>
          <Text style={styles.productPrice}>TZS {parseFloat(price || '0').toLocaleString()}</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.whatsappButton}
            onPress={shareOnWhatsApp}
          >
            <Ionicons name="logo-whatsapp" size={24} color="#FFFFFF" />
            <Text style={styles.whatsappButtonText}>Share on WhatsApp</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.copyButton} onPress={copyLink}>
            <Ionicons name="copy-outline" size={20} color="#7C3AED" />
            <Text style={styles.copyButtonText}>Copy Link</Text>
          </TouchableOpacity>
        </View>

        {/* Done Button */}
        <TouchableOpacity
          style={styles.doneButton}
          onPress={() => router.replace('/seller')}
        >
          <Text style={styles.doneButtonText}>Done</Text>
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
  content: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIcon: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  linkContainer: {
    width: '100%',
    marginBottom: 24,
  },
  linkBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  linkText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  productInfo: {
    alignItems: 'center',
    marginBottom: 32,
  },
  productName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  productPrice: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 4,
  },
  actions: {
    width: '100%',
    gap: 12,
    marginBottom: 24,
  },
  whatsappButton: {
    backgroundColor: '#25D366',
    paddingVertical: 18,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  whatsappButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  copyButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 18,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  copyButtonText: {
    color: '#7C3AED',
    fontSize: 16,
    fontWeight: '600',
  },
  doneButton: {
    paddingVertical: 16,
  },
  doneButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '500',
  },
});
