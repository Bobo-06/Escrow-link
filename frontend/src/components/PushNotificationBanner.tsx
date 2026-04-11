import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, RADIUS } from '../constants/theme';

interface PushNotificationBannerProps {
  onEnable?: () => void;
  onDismiss?: () => void;
}

export function PushNotificationBanner({ onEnable, onDismiss }: PushNotificationBannerProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Show banner after 4 seconds
    const timer = setTimeout(() => setVisible(true), 4000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  const handleEnable = () => {
    setVisible(false);
    onEnable?.();
  };

  const handleDismiss = () => {
    setVisible(false);
    onDismiss?.();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>🔔</Text>
      <View style={styles.content}>
        <Text style={styles.title}>Washa Arifa / Enable Notifications</Text>
        <Text style={styles.desc}>
          Pokea arifa wakati bidhaa inasafirishwa au pesa inathibitishwa.
        </Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.enableBtn} onPress={handleEnable}>
          <Text style={styles.enableBtnText}>Washa</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleDismiss}>
          <Text style={styles.dismissText}>Hapana</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 88,
    left: 12,
    right: 12,
    backgroundColor: COLORS.ink,
    borderRadius: RADIUS.lg,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    zIndex: 800,
  },
  icon: {
    fontSize: 24,
  },
  content: {
    flex: 1,
  },
  title: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  desc: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    lineHeight: 16,
  },
  actions: {
    gap: 6,
    alignItems: 'center',
  },
  enableBtn: {
    backgroundColor: COLORS.gold,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  enableBtnText: {
    color: COLORS.ink,
    fontSize: 12,
    fontWeight: '700',
  },
  dismissText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
  },
});
