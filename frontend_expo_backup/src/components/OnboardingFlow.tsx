import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, RADIUS } from '../constants/theme';

const { width, height } = Dimensions.get('window');

const SCREENS = [
  {
    icon: '🛡️',
    title: 'Biashara Salama',
    titleEn: 'Trade Safely',
    body: 'Pesa yako inashikwa benki iliyoidhinishwa na Benki Kuu ya Tanzania — si mkoba wa kidijitali.',
    bodyEn: 'Your funds are held in a BOT-licensed bank — not a digital wallet.',
    colors: ['#0A0A0F', '#1A1A26'] as [string, string],
    accent: '#C8A96E',
  },
  {
    icon: '📲',
    title: 'Njia 5 za Malipo',
    titleEn: '5 Payment Methods',
    body: 'M-Pesa, Airtel Money, Tigo Pesa, NALA kwa diaspora, na Selcom — chagua unayopenda.',
    bodyEn: 'M-Pesa, Airtel Money, Tigo Pesa, NALA for diaspora, and Selcom.',
    colors: ['#1A1A26', '#0A1A0A'] as [string, string],
    accent: '#4BB543',
  },
  {
    icon: '⚖️',
    title: 'AI Inasuluhisha',
    titleEn: 'AI Mediates Disputes',
    body: 'Msuluhishi wetu wa AI anashughulikia matatizo ndani ya masaa 24. Pesa inabaki salama hadi suluhisho.',
    bodyEn: 'Our AI mediator resolves issues within 24h. Funds stay locked until resolved.',
    colors: ['#0A1A0A', '#1A2A1A'] as [string, string],
    accent: '#1A7A5A',
  },
  {
    icon: '🇹🇿',
    title: 'Imefanywa Tanzania',
    titleEn: 'Made in Tanzania',
    body: 'SecureTrade imejengwa kwa ushirikiano na taasisi za Tanzania. Sisi ni wa kweli.',
    bodyEn: 'Built in partnership with Tanzanian institutions. We are legitimate.',
    colors: ['#1A2A1A', '#0A0A0F'] as [string, string],
    accent: '#22A878',
  },
];

interface OnboardingFlowProps {
  onComplete: () => void;
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [idx, setIdx] = useState(0);
  const fadeAnim = useState(new Animated.Value(1))[0];

  const sc = SCREENS[idx];

  const next = () => {
    if (idx >= SCREENS.length - 1) {
      complete();
      return;
    }
    Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setIdx(i => i + 1);
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    });
  };

  const skip = () => complete();

  const complete = async () => {
    await AsyncStorage.setItem('st_onboarded', 'true');
    onComplete();
  };

  return (
    <LinearGradient colors={sc.colors} style={styles.container}>
      {/* Skip Button */}
      <TouchableOpacity style={styles.skipBtn} onPress={skip}>
        <Text style={styles.skipText}>Ruka / Skip</Text>
      </TouchableOpacity>

      {/* Dots */}
      <View style={styles.dots}>
        {SCREENS.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { width: i === idx ? 20 : 6, backgroundColor: i === idx ? sc.accent : 'rgba(255,255,255,0.25)' },
            ]}
          />
        ))}
      </View>

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Icon */}
        <Text style={styles.icon}>{sc.icon}</Text>

        {/* Title */}
        <Text style={[styles.title, { color: sc.accent }]}>{sc.title}</Text>
        <Text style={styles.titleEn}>{sc.titleEn}</Text>

        {/* Body */}
        <Text style={styles.body}>{sc.body}</Text>
        <Text style={styles.bodyEn}>{sc.bodyEn}</Text>
      </Animated.View>

      {/* CTA */}
      <TouchableOpacity
        style={[styles.ctaBtn, { backgroundColor: sc.accent }]}
        onPress={next}
        activeOpacity={0.85}
      >
        <Text style={styles.ctaText}>
          {idx === SCREENS.length - 1 ? 'Anza Sasa / Get Started →' : 'Endelea / Continue →'}
        </Text>
      </TouchableOpacity>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  skipBtn: {
    position: 'absolute',
    top: 60,
    right: 20,
  },
  skipText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
  },
  dots: {
    position: 'absolute',
    top: 60,
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  content: {
    alignItems: 'center',
  },
  icon: {
    fontSize: 72,
    marginBottom: 28,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 32,
  },
  titleEn: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 22,
  },
  body: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  bodyEn: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  ctaBtn: {
    position: 'absolute',
    bottom: 60,
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: RADIUS.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
  ctaText: {
    color: '#0A0A0F',
    fontSize: 15,
    fontWeight: '700',
  },
});
