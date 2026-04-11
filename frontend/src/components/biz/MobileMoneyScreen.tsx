import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, GATEWAY_CONFIG, formatTZS, FX_RATE } from '../constants/bizSalama';
import { LinearGradient } from 'expo-linear-gradient';

interface MobileMoneyScreenProps {
  gateway: 'mpesa' | 'airtel';
  amount: number;
  phone: string;
  onSuccess: (txId: string) => void;
  onCancel: () => void;
}

export default function MobileMoneyScreen({ gateway, amount, phone, onSuccess, onCancel }: MobileMoneyScreenProps) {
  const [stage, setStage] = useState<'init' | 'waiting' | 'success' | 'failed'>('init');
  const [timeLeft, setTimeLeft] = useState(60);
  const [phoneInput, setPhoneInput] = useState(phone);
  
  const gw = GATEWAY_CONFIG[gateway];

  useEffect(() => {
    if (stage === 'waiting' && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
    if (stage === 'waiting' && timeLeft === 0) {
      // Simulate success for demo
      const txId = `TX${Date.now()}`;
      setStage('success');
      setTimeout(() => onSuccess(txId), 1500);
    }
  }, [stage, timeLeft]);

  const initiateSTKPush = () => {
    if (!phoneInput || phoneInput.length < 10) return;
    setStage('waiting');
    setTimeLeft(60);
    
    // Simulate STK push success after random time (demo)
    const randomTime = Math.floor(Math.random() * 15000) + 5000;
    setTimeout(() => {
      const txId = `TX${Date.now()}`;
      setStage('success');
      setTimeout(() => onSuccess(txId), 1500);
    }, randomTime);
  };

  if (stage === 'success') {
    return (
      <View style={styles.container}>
        <LinearGradient colors={[COLORS.emeraldDark, COLORS.emerald]} style={styles.successCard}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={64} color={COLORS.surface} />
          </View>
          <Text style={styles.successTitle}>Malipo Yamefanikiwa!</Text>
          <Text style={styles.successSubtitle}>Payment Successful</Text>
          <Text style={styles.successAmount}>{formatTZS(amount)}</Text>
        </LinearGradient>
      </View>
    );
  }

  if (stage === 'waiting') {
    return (
      <View style={styles.container}>
        <LinearGradient colors={gw.bgGrad} style={styles.waitingCard}>
          <ActivityIndicator size="large" color={COLORS.surface} />
          <Text style={styles.waitingTitle}>Subiri ujumbe wa {gw.label}</Text>
          <Text style={styles.waitingSubtitle}>Check your phone for the STK push</Text>
          <Text style={styles.waitingPhone}>{phoneInput}</Text>
          
          <View style={styles.timerContainer}>
            <Ionicons name="time-outline" size={20} color={COLORS.surface} />
            <Text style={styles.timerText}>{timeLeft}s</Text>
          </View>
          
          <Text style={styles.waitingHint}>Weka PIN yako kumaliza malipo</Text>
          <Text style={styles.waitingHintEn}>Enter your PIN to complete payment</Text>
        </LinearGradient>

        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelText}>Ghairi / Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={gw.bgGrad} style={styles.headerCard}>
        <Ionicons name={gw.icon as any} size={48} color={COLORS.surface} />
        <Text style={styles.headerTitle}>{gw.label}</Text>
        <Text style={styles.headerSubtitle}>{gw.sublabel}</Text>
      </LinearGradient>

      <View style={styles.formSection}>
        <Text style={styles.inputLabel}>Nambari ya Simu / Phone Number</Text>
        <View style={styles.inputWrapper}>
          <Text style={styles.inputPrefix}>+255</Text>
          <TextInput
            style={styles.input}
            value={phoneInput.replace('+255', '')}
            onChangeText={(text) => setPhoneInput(`+255${text.replace(/\D/g, '')}`)}
            placeholder="7XX XXX XXX"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="phone-pad"
            maxLength={9}
          />
        </View>

        <View style={styles.amountDisplay}>
          <Text style={styles.amountLabel}>Kiasi / Amount</Text>
          <Text style={styles.amountValue}>{formatTZS(amount)}</Text>
        </View>

        <TouchableOpacity onPress={initiateSTKPush} activeOpacity={0.85}>
          <LinearGradient colors={gw.bgGrad} style={styles.payButton}>
            <Ionicons name="shield-checkmark" size={20} color={COLORS.surface} />
            <Text style={styles.payButtonText}>Lipa Sasa / Pay Now</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.securityNote}>
          <Ionicons name="lock-closed" size={14} color={COLORS.textMuted} />
          <Text style={styles.securityText}>Malipo yanalindwa na Biz-Salama Escrow</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
        <Text style={styles.cancelText}>Rudi Nyuma / Go Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  headerCard: {
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.surface,
    marginTop: 12,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  formSection: {
    backgroundColor: COLORS.ink2,
    borderRadius: 20,
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.ink3,
    borderRadius: 14,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  inputPrefix: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 18,
    color: COLORS.textPrimary,
    letterSpacing: 1,
  },
  amountDisplay: {
    backgroundColor: COLORS.goldPale,
    padding: 16,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  amountLabel: {
    fontSize: 14,
    color: COLORS.gold,
  },
  amountValue: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.gold,
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    borderRadius: 14,
  },
  payButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.surface,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
  },
  securityText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  waitingCard: {
    padding: 32,
    borderRadius: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  waitingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.surface,
    marginTop: 20,
    textAlign: 'center',
  },
  waitingSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  waitingPhone: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.surface,
    marginTop: 16,
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  timerText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.surface,
  },
  waitingHint: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 20,
    textAlign: 'center',
  },
  waitingHintEn: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  successCard: {
    padding: 40,
    borderRadius: 24,
    alignItems: 'center',
  },
  successIcon: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.surface,
  },
  successSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  successAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.surface,
    marginTop: 20,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  cancelText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
});
