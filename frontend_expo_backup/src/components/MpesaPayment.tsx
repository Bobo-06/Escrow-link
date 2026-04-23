import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { COLORS, RADIUS, SHADOWS, formatTZS } from '../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';

interface MpesaPaymentScreenProps {
  amount: number;
  onSuccess: (data: { phone: string; method: string }) => void;
  onBack: () => void;
}

export const MpesaPaymentScreen: React.FC<MpesaPaymentScreenProps> = ({
  amount,
  onSuccess,
  onBack,
}) => {
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState<'enter' | 'waiting' | 'success' | 'failed'>('enter');
  const [timeLeft, setTimeLeft] = useState(60);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const initiateSTK = () => {
    if (phone.length < 9) return;
    setStep('waiting');
    setTimeLeft(60);

    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          setStep('failed');
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    // Simulate STK push response
    setTimeout(() => {
      clearInterval(timerRef.current!);
      setStep('success');
      onSuccess({ phone: '255' + phone, method: 'mpesa' });
    }, 4500);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[COLORS.mpesa, COLORS.mpesaDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backBtnText}>\u2190</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Lipa na M-Pesa</Text>
          <Text style={styles.headerSub}>Salama \u00b7 Haraka \u00b7 Tanzania</Text>
        </View>
        <View style={styles.mpesaLogo}>
          <Text style={styles.mpesaLogoText}>M</Text>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        {step === 'enter' && (
          <>
            {/* Amount Card */}
            <LinearGradient
              colors={[COLORS.ink, '#1a2a1a']}
              style={styles.amountCard}
            >
              <Text style={styles.amountLabel}>KIASI CHA KULIPA / AMOUNT</Text>
              <Text style={styles.amountValue}>{formatTZS(amount)}</Text>
              <Text style={styles.amountSub}>\u2248 ${(amount / 2580).toFixed(0)} USD \u00b7 Imeshikwa salama / Held securely</Text>
              <View style={styles.escrowBadge}>
                <Text style={styles.escrowBadgeText}>\ud83d\udd12 Escrow Protected</Text>
              </View>
            </LinearGradient>

            {/* Phone Input */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Nambari ya M-Pesa / M-Pesa Number</Text>
              <View style={styles.phoneInputWrap}>
                <View style={styles.flagCode}>
                  <Text style={styles.flagCodeText}>\ud83c\uddf9\ud83c\uddff +255</Text>
                </View>
                <TextInput
                  style={styles.phoneInput}
                  value={phone}
                  onChangeText={t => setPhone(t.replace(/\D/g, '').slice(0, 9))}
                  placeholder="7XX XXX XXX"
                  placeholderTextColor="rgba(10,10,15,0.4)"
                  keyboardType="phone-pad"
                  maxLength={9}
                />
              </View>
            </View>

            {/* How it works */}
            <View style={styles.stepsCard}>
              <Text style={styles.stepsTitle}>Jinsi inavyofanya kazi / How it works</Text>
              {[
                ['1', "Utapokea ujumbe wa M-Pesa", "You'll get an M-Pesa PIN prompt"],
                ['2', 'Ingiza PIN yako', 'Enter your M-Pesa PIN'],
                ['3', 'Pesa imeshikwa salama', 'Funds locked in SecureTrade escrow'],
              ].map(([n, sw, en]) => (
                <View key={n} style={styles.stepRow}>
                  <View style={styles.stepNum}>
                    <Text style={styles.stepNumText}>{n}</Text>
                  </View>
                  <View>
                    <Text style={styles.stepTextSw}>{sw}</Text>
                    <Text style={styles.stepTextEn}>{en}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitBtn, phone.length < 9 && styles.submitBtnDisabled]}
              onPress={initiateSTK}
              disabled={phone.length < 9}
              activeOpacity={0.8}
            >
              <Text style={styles.submitBtnText}>\ud83d\udcf2 Tuma Ombi la M-Pesa / Send Request</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 'waiting' && (
          <View style={styles.centerContent}>
            <View style={styles.mpesaSpinner}>
              <Text style={styles.mpesaSpinnerText}>M</Text>
            </View>
            <Text style={styles.waitTitle}>Angalia simu yako!</Text>
            <Text style={styles.waitSub}>Check your phone for M-Pesa prompt</Text>
            <View style={styles.countdown}>
              <Text style={styles.countdownNum}>{timeLeft}</Text>
            </View>
            <Text style={styles.waitInstructions}>Ingiza PIN yako ya M-Pesa / Enter your PIN</Text>
          </View>
        )}

        {step === 'success' && (
          <View style={styles.centerContent}>
            <View style={styles.successCircle}>
              <Text style={styles.successIcon}>\u2713</Text>
            </View>
            <Text style={styles.successTitle}>Malipo Yamefaulu!</Text>
            <Text style={styles.successSub}>Payment successful \u00b7 {formatTZS(amount)} secured</Text>
            <View style={styles.successInfo}>
              <Text style={styles.successInfoText}>\u2713 Pesa yako ipo salama \u00b7 Your money is safe</Text>
              <Text style={styles.successInfoSubtext}>Itatolewa kwa muuzaji tu baada ya kukubali \u00b7 Released only when you confirm</Text>
            </View>
          </View>
        )}

        {step === 'failed' && (
          <View style={styles.centerContent}>
            <View style={styles.failedCircle}>
              <Text style={styles.failedIcon}>\u23f1\ufe0f</Text>
            </View>
            <Text style={styles.failedTitle}>Muda Umekwisha / Timed Out</Text>
            <Text style={styles.failedSub}>Hakuna pesa iliyokatwa \u00b7 No money was deducted</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => setStep('enter')}>
              <Text style={styles.retryBtnText}>Jaribu Tena / Try Again</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  header: {
    padding: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    color: COLORS.white,
    fontSize: 16,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },
  headerSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
  },
  mpesaLogo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mpesaLogoText: {
    color: COLORS.mpesa,
    fontSize: 16,
    fontWeight: '900',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  amountCard: {
    borderRadius: RADIUS.lg,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  amountLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 6,
  },
  amountValue: {
    color: COLORS.white,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  amountSub: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    marginTop: 6,
  },
  escrowBadge: {
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  escrowBadgeText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '600',
  },
  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(10,10,15,0.5)',
    marginBottom: 8,
  },
  phoneInputWrap: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.surface3,
    overflow: 'hidden',
  },
  flagCode: {
    paddingHorizontal: 12,
    paddingVertical: 14,
    backgroundColor: COLORS.surface,
    borderRightWidth: 1,
    borderRightColor: COLORS.surface3,
  },
  flagCodeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: 'monospace',
  },
  stepsCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: 14,
    paddingHorizontal: 16,
  },
  stepsTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(10,10,15,0.4)',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10,
  },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.mpesa,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '800',
  },
  stepTextSw: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.ink,
  },
  stepTextEn: {
    fontSize: 11,
    color: 'rgba(10,10,15,0.5)',
    marginTop: 2,
  },
  submitBtn: {
    marginTop: 20,
    backgroundColor: COLORS.mpesa,
    padding: 16,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    ...SHADOWS.mpesa,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  mpesaSpinner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.mpesa,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  mpesaSpinnerText: {
    color: COLORS.white,
    fontSize: 28,
    fontWeight: '900',
  },
  waitTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.ink,
    marginBottom: 8,
  },
  waitSub: {
    fontSize: 14,
    color: 'rgba(10,10,15,0.5)',
  },
  countdown: {
    marginVertical: 20,
  },
  countdownNum: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.mpesa,
  },
  waitInstructions: {
    fontSize: 13,
    color: 'rgba(10,10,15,0.6)',
    textAlign: 'center',
  },
  successCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.emerald,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  successIcon: {
    color: COLORS.white,
    fontSize: 32,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.ink,
    marginBottom: 8,
  },
  successSub: {
    fontSize: 13,
    color: 'rgba(10,10,15,0.5)',
  },
  successInfo: {
    marginTop: 20,
    backgroundColor: COLORS.emeraldPale,
    padding: 16,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  successInfoText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.emerald,
  },
  successInfoSubtext: {
    fontSize: 12,
    color: 'rgba(10,10,15,0.5)',
    marginTop: 4,
    textAlign: 'center',
  },
  failedCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  failedIcon: {
    fontSize: 32,
  },
  failedTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.ink,
    marginBottom: 8,
  },
  failedSub: {
    fontSize: 13,
    color: 'rgba(10,10,15,0.5)',
  },
  retryBtn: {
    marginTop: 20,
    backgroundColor: COLORS.ink,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
  },
  retryBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
});
