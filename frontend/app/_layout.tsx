import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#FFFFFF' },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="forgot-password" />
        <Stack.Screen name="auth-callback" />
        <Stack.Screen name="seller" />
        <Stack.Screen name="pay/[code]" />
        <Stack.Screen name="checkout/[code]" />
        <Stack.Screen name="track/[orderId]" />
        <Stack.Screen name="confirm/[orderId]" />
      </Stack>
    </SafeAreaProvider>
  );
}
