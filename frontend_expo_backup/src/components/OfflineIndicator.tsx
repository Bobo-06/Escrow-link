import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { COLORS } from '../constants/theme';
import NetInfo from '@react-native-community/netinfo';

export const OfflineIndicator = () => {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleOnline = () => setOnline(true);
      const handleOffline = () => setOnline(false);
      
      setOnline(navigator.onLine);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    } else {
      const unsubscribe = NetInfo.addEventListener(state => {
        setOnline(state.isConnected ?? true);
      });
      return () => unsubscribe();
    }
  }, []);

  if (online) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>📵 Huna mtandao · Offline — Muamala umehifadhiwa · Transaction queued</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.amber,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  text: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
});
