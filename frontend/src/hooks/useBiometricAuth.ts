import { useState, useEffect, useCallback } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function useBiometricAuth() {
  const [supported, setSupported] = useState(false);
  const [enrolled, setEnrolled] = useState(false);
  const [biometricType, setBiometricType] = useState<string>('');

  useEffect(() => {
    const check = async () => {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (!compatible) return;

      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      setSupported(compatible);

      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        setBiometricType('Face ID');
      } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        setBiometricType('Fingerprint');
      }

      const userEnrolled = await AsyncStorage.getItem('st_biometric_enrolled');
      setEnrolled(!!userEnrolled && isEnrolled);
    };
    check();
  }, []);

  const enroll = useCallback(async () => {
    if (!supported) throw new Error('Biometric not supported');
    
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Thibitisha ili kuwasha / Verify to enable',
      cancelLabel: 'Ghairi / Cancel',
      disableDeviceFallback: false,
    });

    if (result.success) {
      await AsyncStorage.setItem('st_biometric_enrolled', 'true');
      setEnrolled(true);
      return true;
    }
    return false;
  }, [supported]);

  const authenticate = useCallback(async (promptMessage?: string) => {
    if (!supported || !enrolled) return false;

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: promptMessage || 'Thibitisha utambulisho / Verify identity',
      cancelLabel: 'Ghairi / Cancel',
      disableDeviceFallback: false,
    });

    return result.success;
  }, [supported, enrolled]);

  const unenroll = useCallback(async () => {
    await AsyncStorage.removeItem('st_biometric_enrolled');
    setEnrolled(false);
  }, []);

  return { supported, enrolled, biometricType, enroll, authenticate, unenroll };
}
