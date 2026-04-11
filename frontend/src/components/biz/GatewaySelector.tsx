import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, GATEWAY_CONFIG, calcGatewayFee, formatTZS } from '../constants/bizSalama';
import { LinearGradient } from 'expo-linear-gradient';

interface GatewaySelectorProps {
  amount: number;
  selected: string;
  onSelect: (gatewayId: string) => void;
}

export default function GatewaySelector({ amount, selected, onSelect }: GatewaySelectorProps) {
  const gateways = Object.values(GATEWAY_CONFIG);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Chagua Njia ya Malipo · Select Payment</Text>
      
      <ScrollView showsVerticalScrollIndicator={false}>
        {gateways.map((gw) => {
          const isSelected = selected === gw.id;
          const fee = calcGatewayFee(gw.id, amount);
          
          return (
            <TouchableOpacity
              key={gw.id}
              style={[
                styles.gatewayCard,
                isSelected && styles.gatewayCardSelected,
                isSelected && { borderColor: gw.color }
              ]}
              onPress={() => onSelect(gw.id)}
              activeOpacity={0.8}
            >
              <View style={styles.gatewayHeader}>
                <View style={[styles.gatewayIcon, { backgroundColor: gw.color + '20' }]}>
                  <Ionicons name={gw.icon as any} size={24} color={gw.color} />
                </View>
                
                <View style={styles.gatewayInfo}>
                  <View style={styles.gatewayNameRow}>
                    <Text style={styles.gatewayName}>{gw.label}</Text>
                    {gw.badge && (
                      <View style={[styles.badge, { backgroundColor: gw.color + '30' }]}>
                        <Text style={[styles.badgeText, { color: gw.color }]}>{gw.badge}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.gatewaySublabel}>{gw.sublabel}</Text>
                </View>

                <View style={[
                  styles.radioOuter,
                  isSelected && { borderColor: gw.color }
                ]}>
                  {isSelected && (
                    <View style={[styles.radioInner, { backgroundColor: gw.color }]} />
                  )}
                </View>
              </View>

              <View style={styles.gatewayFooter}>
                <View style={styles.feeInfo}>
                  <Text style={styles.feeLabel}>Ada / Fee:</Text>
                  <Text style={[styles.feeValue, { color: gw.color }]}>
                    {fee === 0 ? 'Bure · Free' : formatTZS(fee)}
                  </Text>
                </View>
                <View style={styles.settlementInfo}>
                  <Ionicons name="time-outline" size={14} color={COLORS.textMuted} />
                  <Text style={styles.settlementText}>{gw.settlement}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  gatewayCard: {
    backgroundColor: COLORS.ink3,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  gatewayCardSelected: {
    backgroundColor: COLORS.ink2,
  },
  gatewayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  gatewayIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  gatewayInfo: {
    flex: 1,
  },
  gatewayNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  gatewayName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  gatewaySublabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.textMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  gatewayFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.ink,
  },
  feeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  feeLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  feeValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  settlementInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  settlementText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
});
