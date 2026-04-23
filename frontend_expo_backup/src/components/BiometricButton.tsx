import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, View, ActivityIndicator } from 'react-native';
import { useBiometricAuth } from '../hooks/useBiometricAuth';
import { COLORS, RADIUS } from '../constants/theme';

interface BiometricButtonProps {
  onSuccess: () => void;
  onFail?: (reason: string) => void;
  label?: string;
}

export function BiometricButton({ onSuccess, onFail, label = 'Thibitisha / Verify' }: BiometricButtonProps) {
  const { supported, enrolled, authenticate, biometricType } = useBiometricAuth();
  const [state, setState] = useState<'idle' | 'scanning' | 'success' | 'fail'>('idle');

  const handlePress = async () => {
    if (!supported) {
      onFail?.('not_supported');
      return;
    }
    
    setState('scanning');
    const ok = await authenticate();
    setState(ok ? 'success' : 'fail');
    
    if (ok) {
      setTimeout(() => onSuccess(), 600);
    } else {
      setTimeout(() => {
        setState('idle');
        onFail?.('failed');
      }, 1500);
    }
  };

  const icons = { idle: '👆', scanning: '⏳', success: '✅', fail: '❌' };
  const labels = {
    idle: label,
    scanning: 'Inasoma… / Scanning…',
    success: 'Imethibitishwa / Verified',
    fail: 'Imeshindwa / Failed',
  };
  const colors = {
    idle: COLORS.emerald,
    scanning: COLORS.amber,
    success: COLORS.emerald,
    fail: COLORS.ruby,
  };

  if (!enrolled) return null;

  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: colors[state] }]}
      onPress={handlePress}
      disabled={state === 'scanning'}
      activeOpacity={0.8}
    >
      {state === 'scanning' ? (
        <ActivityIndicator color={COLORS.white} size="small" />
      ) : (
        <Text style={styles.icon}>{icons[state]}</Text>
      )}
      <Text style={styles.label}>{labels[state]}</Text>
      {biometricType && state === 'idle' && (
        <Text style={styles.type}>{biometricType}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 16,
    borderRadius: RADIUS.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  icon: {
    fontSize: 20,
  },
  label: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },
  type: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
  },
});
