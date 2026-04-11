import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, RADIUS } from '../constants/theme';

interface TrustStripProps {
  items?: Array<{ icon: string; label: string }>;
}

export const TrustStrip: React.FC<TrustStripProps> = ({ items }) => {
  const defaultItems = [
    { icon: '🔒', label: 'Escrow' },
    { icon: '📲', label: 'M-Pesa' },
    { icon: '✓', label: 'KYC' },
    { icon: '↩', label: 'Dispute' },
  ];

  const displayItems = items || defaultItems;

  return (
    <View style={styles.container}>
      {displayItems.map((item, index) => (
        <View key={index} style={styles.item}>
          <Text style={styles.icon}>{item.icon}</Text>
          <Text style={styles.label}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: COLORS.emeraldPale,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(26,122,90,0.1)',
  },
  item: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  icon: {
    fontSize: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.emerald,
  },
});
