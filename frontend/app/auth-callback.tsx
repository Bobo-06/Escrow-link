import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { useAuthStore } from '../src/store/authStore';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  primary: '#0D9488',
  dark: '#0F172A',
  gray: '#64748B',
  white: '#FFFFFF',
  background: '#F8FAFC',
};

export default function AuthCallback() {
  const router = useRouter();
  const { exchangeSession } = useAuthStore();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Prevent double-processing in React Strict Mode
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processAuth = async () => {
      try {
        let sessionId: string | null = null;

        if (Platform.OS === 'web') {
          // On web, check the URL hash
          // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
          const hash = window.location.hash;
          const search = window.location.search;
          
          console.log('Auth callback - hash:', hash, 'search:', search);
          
          // Check fragment (#session_id=xxx)
          const fragmentMatch = hash.match(/session_id=([^&]+)/);
          if (fragmentMatch) {
            sessionId = fragmentMatch[1];
          }
          
          // Also check query params (?session_id=xxx)
          if (!sessionId) {
            const queryMatch = search.match(/[?&]session_id=([^&#]+)/);
            if (queryMatch) {
              sessionId = queryMatch[1];
            }
          }
        } else {
          // On native, get the URL that opened the app
          const url = await Linking.getInitialURL();
          console.log('Auth callback URL:', url);

          if (url) {
            const fragmentMatch = url.match(/#session_id=([^&]+)/);
            if (fragmentMatch) {
              sessionId = fragmentMatch[1];
            }

            const queryMatch = url.match(/[?&]session_id=([^&#]+)/);
            if (!sessionId && queryMatch) {
              sessionId = queryMatch[1];
            }
          }
        }

        if (sessionId) {
          console.log('Exchanging session_id for token...');
          const user = await exchangeSession(sessionId);
          console.log('Session exchanged successfully:', user.email);
          
          // Redirect to seller dashboard
          router.replace('/seller');
        } else {
          console.log('No session_id found, redirecting to login');
          router.replace('/login');
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        router.replace('/login');
      }
    };

    processAuth();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <View style={styles.iconInner}>
          <Ionicons name="shield-checkmark" size={40} color={COLORS.primary} />
        </View>
      </View>
      <ActivityIndicator size="large" color={COLORS.primary} style={styles.spinner} />
      <Text style={styles.title}>Signing you in...</Text>
      <Text style={styles.subtitle}>Please wait while we verify your account</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 24,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 28,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  iconInner: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: '#CCFBF1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinner: {
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.dark,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.gray,
    textAlign: 'center',
  },
});
