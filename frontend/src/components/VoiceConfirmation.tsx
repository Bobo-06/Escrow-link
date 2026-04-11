import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { COLORS, RADIUS, SHADOWS } from '../constants/theme';
import * as Speech from 'expo-speech';

interface VoiceConfirmationProps {
  transaction: {
    item: string;
    amount: number;
    seller: string;
  };
}

export const VoiceConfirmation: React.FC<VoiceConfirmationProps> = ({ transaction }) => {
  const [playing, setPlaying] = useState(false);

  const speak = () => {
    if (Platform.OS === 'web') {
      // Web Speech API
      if (!window.speechSynthesis) {
        alert('Voice not supported on this browser');
        return;
      }
      setPlaying(true);
      const text = `Karibu SecureTrade. Muamala wako ni huu: Bidhaa: ${transaction.item}. Kiasi: Shilingi ${transaction.amount.toLocaleString()}. Muuzaji: ${transaction.seller}. Pesa yako imeshikwa salama katika akaunti ya escrow. Itatolewa kwa muuzaji tu baada ya kuthibitisha kupokea bidhaa yako. Asante kwa kutumia SecureTrade.`;
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'sw-TZ';
      utterance.rate = 0.9;
      utterance.onend = () => setPlaying(false);
      window.speechSynthesis.speak(utterance);
    } else {
      // Native Expo Speech
      setPlaying(true);
      const text = `Karibu SecureTrade. Muamala wako ni huu: Bidhaa: ${transaction.item}. Kiasi: Shilingi ${transaction.amount.toLocaleString()}. Muuzaji: ${transaction.seller}. Pesa yako imeshikwa salama.`;
      
      Speech.speak(text, {
        language: 'sw-TZ',
        rate: 0.9,
        onDone: () => setPlaying(false),
        onStopped: () => setPlaying(false),
      });
    }
  };

  const stop = () => {
    if (Platform.OS === 'web') {
      window.speechSynthesis?.cancel();
    } else {
      Speech.stop();
    }
    setPlaying(false);
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={playing ? stop : speak}
      activeOpacity={0.8}
    >
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{playing ? '⏹' : '🔊'}</Text>
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title}>
          {playing ? 'Inasoma… / Reading…' : 'Sikiliza muamala / Listen in Swahili'}
        </Text>
        <Text style={styles.subtitle}>Voice confirmation · Uthibitisho wa sauti</Text>
      </View>
      {playing && (
        <View style={styles.waveContainer}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={[styles.wave, { animationDelay: `${i * 0.2}s` }]} />
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.surface3,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 20,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.ink,
  },
  subtitle: {
    fontSize: 11,
    color: 'rgba(10,10,15,0.5)',
    marginTop: 2,
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  wave: {
    width: 3,
    height: 12,
    backgroundColor: COLORS.emerald,
    borderRadius: 2,
  },
});
