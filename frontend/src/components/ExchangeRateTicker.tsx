import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { COLORS } from '../constants/theme';

const RATES = {
  USD: 2580,
  GBP: 3240,
  EUR: 2810,
  KES: 20,
};

const PAIRS = [
  ['USD', '$'],
  ['GBP', '£'],
  ['EUR', '€'],
  ['KES', 'KSh'],
];

export function ExchangeRateTicker() {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>LIVE RATES</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {PAIRS.map(([code, sym]) => (
          <View key={code} style={styles.rateItem}>
            <Text style={styles.rateSym}>{sym}1 =</Text>
            <Text style={styles.rateValue}>TSh {RATES[code as keyof typeof RATES].toLocaleString()}</Text>
          </View>
        ))}
      </ScrollView>
      <TouchableOpacity style={styles.closeBtn} onPress={() => setVisible(false)}>
        <Text style={styles.closeBtnText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1A1A26',
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  label: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.3)',
    fontWeight: '700',
    marginRight: 12,
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginRight: 16,
  },
  rateSym: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
  },
  rateValue: {
    fontSize: 11,
    color: COLORS.gold,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  closeBtnText: {
    color: 'rgba(255,255,255,0.2)',
    fontSize: 12,
  },
});
