import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants/theme';

export const StatusBar = () => (
  <View style={styles.statusBar}>
    <Text style={styles.time}>9:41</Text>
    <Text style={styles.title}>SecureTrade TZ</Text>
    <Text style={styles.battery}>⚡ 84%</Text>
  </View>
);

const styles = StyleSheet.create({
  statusBar: {
    backgroundColor: COLORS.ink,
    paddingHorizontal: 20,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  time: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '500',
  },
  title: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  battery: {
    color: COLORS.white,
    fontSize: 12,
  },
});
