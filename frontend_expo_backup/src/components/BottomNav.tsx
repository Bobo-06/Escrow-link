import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '../constants/theme';

interface BottomNavProps {
  active: 'home' | 'history' | 'support' | 'profile';
  onHome: () => void;
  onHistory: () => void;
  onSupport: () => void;
  onProfile: () => void;
}

const TABS = [
  { icon: '🏠', label: 'Nyumbani', labelEn: 'Home', id: 'home' as const },
  { icon: '📋', label: 'Historia', labelEn: 'History', id: 'history' as const },
  { icon: '💬', label: 'Msaada', labelEn: 'Support', id: 'support' as const },
  { icon: '👤', label: 'Wasifu', labelEn: 'Profile', id: 'profile' as const },
];

export function BottomNav({ active, onHome, onHistory, onSupport, onProfile }: BottomNavProps) {
  const handlers = { home: onHome, history: onHistory, support: onSupport, profile: onProfile };

  return (
    <View style={styles.container}>
      {TABS.map((tab) => (
        <TouchableOpacity
          key={tab.id}
          style={styles.tab}
          onPress={handlers[tab.id]}
          activeOpacity={0.7}
        >
          <Text style={[styles.icon, active !== tab.id && styles.iconInactive]}>{tab.icon}</Text>
          <Text style={[styles.label, active === tab.id && styles.labelActive]}>{tab.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.ink,
    flexDirection: 'row',
    paddingTop: 8,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    paddingVertical: 4,
  },
  icon: {
    fontSize: 20,
  },
  iconInactive: {
    opacity: 0.4,
  },
  label: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.3)',
  },
  labelActive: {
    color: COLORS.gold,
  },
});
