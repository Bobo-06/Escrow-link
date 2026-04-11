import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, RADIUS, formatTZS } from '../constants/theme';

const KYC_TIERS = {
  TIER_1: { max: 500000, required: ['phone'], label: 'Uthibitisho wa Simu / Phone Verified' },
  TIER_2: { max: 2000000, required: ['phone', 'nid'], label: 'Kitambulisho cha NIDA / NIDA ID' },
  TIER_3: { max: 10000000, required: ['phone', 'nid', 'selfie'], label: 'Picha ya Uso / Selfie + NIDA' },
};

interface KYCGateProps {
  amountTzs: number;
  userKycLevel?: number;
  onPass: () => void;
  onFail: () => void;
}

export function KYCGate({ amountTzs, userKycLevel = 1, onPass, onFail }: KYCGateProps) {
  const [step, setStep] = useState<'check' | 'nid' | 'selfie'>('check');
  const [nid, setNid] = useState('');
  const [selfieUri, setSelfieUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const required = amountTzs <= KYC_TIERS.TIER_1.max ? 1 : amountTzs <= KYC_TIERS.TIER_2.max ? 2 : 3;

  useEffect(() => {
    if (userKycLevel >= required) {
      onPass();
    } else {
      setStep(required === 2 ? 'nid' : 'selfie');
    }
  }, []);

  const submitNID = async () => {
    if (nid.length < 8) return;
    setLoading(true);
    // Simulate verification
    await new Promise((r) => setTimeout(r, 2000));
    setLoading(false);
    if (required === 2) {
      onPass();
    } else {
      setStep('selfie');
    }
  };

  const takeSelfie = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      setSelfieUri(result.assets[0].uri);
    }
  };

  const submitSelfie = async () => {
    if (!selfieUri) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 2000));
    setLoading(false);
    onPass();
  };

  if (step === 'nid') {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.content}>
          <Text style={styles.icon}>🪪</Text>
          <Text style={styles.title}>Thibitisha NIDA</Text>
          <Text style={styles.subtitle}>Verify Your NIDA ID</Text>
          <Text style={styles.desc}>
            Miamala zaidi ya {formatTZS(500000)} inahitaji uthibitisho wa kitambulisho cha NIDA.
          </Text>
          <Text style={styles.descEn}>Transactions above TSh 500,000 require NIDA verification.</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Nambari ya NIDA</Text>
            <TextInput
              style={styles.input}
              value={nid}
              onChangeText={setNid}
              placeholder="XXXXXXXXXXXXXXXXXXXX"
              placeholderTextColor="rgba(10,10,15,0.4)"
              keyboardType="number-pad"
              maxLength={20}
            />
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, nid.length < 8 && styles.submitBtnDisabled]}
            onPress={submitNID}
            disabled={nid.length < 8 || loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.submitBtnText}>Thibitisha NIDA / Verify NIDA</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.backBtn} onPress={onFail}>
            <Text style={styles.backBtnText}>Rudi / Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (step === 'selfie') {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.content}>
          <Text style={styles.icon}>🤳</Text>
          <Text style={styles.title}>Picha ya Uso</Text>
          <Text style={styles.subtitle}>Take a Selfie</Text>
          <Text style={styles.desc}>
            Miamala zaidi ya {formatTZS(2000000)} inahitaji picha yako kwa uthibitisho.
          </Text>

          {selfieUri ? (
            <Image source={{ uri: selfieUri }} style={styles.selfiePreview} />
          ) : (
            <TouchableOpacity style={styles.cameraBtn} onPress={takeSelfie}>
              <Ionicons name="camera" size={48} color={COLORS.gold} />
              <Text style={styles.cameraBtnText}>Piga Picha / Take Photo</Text>
            </TouchableOpacity>
          )}

          {selfieUri && (
            <>
              <TouchableOpacity style={styles.submitBtn} onPress={submitSelfie} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.submitBtnText}>Wasilisha / Submit</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.retakeBtn} onPress={() => setSelfieUri(null)}>
                <Text style={styles.retakeBtnText}>Piga Tena / Retake</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity style={styles.backBtn} onPress={onFail}>
            <Text style={styles.backBtnText}>Rudi / Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  content: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 64,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.ink,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(10,10,15,0.5)',
    marginTop: 4,
    marginBottom: 16,
  },
  desc: {
    fontSize: 13,
    color: COLORS.ink,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 4,
  },
  descEn: {
    fontSize: 12,
    color: 'rgba(10,10,15,0.5)',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 24,
  },
  inputGroup: {
    width: '100%',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(10,10,15,0.5)',
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.surface3,
    borderRadius: RADIUS.md,
    padding: 14,
    fontSize: 16,
    fontFamily: 'monospace',
    letterSpacing: 2,
    textAlign: 'center',
  },
  submitBtn: {
    width: '100%',
    backgroundColor: COLORS.emerald,
    padding: 16,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    marginBottom: 8,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },
  backBtn: {
    width: '100%',
    padding: 14,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.surface3,
    alignItems: 'center',
  },
  backBtnText: {
    color: COLORS.ink,
    fontSize: 14,
    fontWeight: '600',
  },
  cameraBtn: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: COLORS.surface2,
    borderWidth: 2,
    borderColor: COLORS.gold,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  cameraBtnText: {
    color: COLORS.gold,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
  },
  selfiePreview: {
    width: 160,
    height: 160,
    borderRadius: 80,
    marginBottom: 24,
    borderWidth: 3,
    borderColor: COLORS.emerald,
  },
  retakeBtn: {
    paddingVertical: 10,
  },
  retakeBtnText: {
    color: COLORS.gold,
    fontSize: 13,
    fontWeight: '600',
  },
});
