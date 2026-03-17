import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TrustBadgeProps {
  variant?: 'default' | 'compact';
}

export default function TrustBadge({ variant = 'default' }: TrustBadgeProps) {
  if (variant === 'compact') {
    return (
      <View style={styles.compactContainer}>
        <Ionicons name="lock-closed" size={14} color="#059669" />
        <Text style={styles.compactText}>Protected Payment</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Ionicons name="shield-checkmark" size={24} color="#059669" />
      <View style={styles.textContainer}>
        <Text style={styles.title}>Your payment is protected</Text>
        <Text style={styles.subtitle}>You only pay when you receive your order</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#065F46',
  },
  subtitle: {
    fontSize: 14,
    color: '#047857',
    marginTop: 2,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compactText: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '500',
  },
});
