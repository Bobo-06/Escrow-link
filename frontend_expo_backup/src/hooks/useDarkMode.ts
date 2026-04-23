import { useState, useEffect, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function useDarkMode() {
  const systemScheme = useColorScheme();
  const [dark, setDark] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      const saved = await AsyncStorage.getItem('st_theme');
      if (saved) {
        setDark(saved === 'dark');
      } else {
        setDark(systemScheme === 'dark');
      }
      setLoaded(true);
    };
    load();
  }, [systemScheme]);

  const toggle = useCallback(async () => {
    const newValue = !dark;
    setDark(newValue);
    await AsyncStorage.setItem('st_theme', newValue ? 'dark' : 'light');
  }, [dark]);

  const setTheme = useCallback(async (isDark: boolean) => {
    setDark(isDark);
    await AsyncStorage.setItem('st_theme', isDark ? 'dark' : 'light');
  }, []);

  return { dark, toggle, setTheme, loaded };
}

// Theme colors
export const DARK_THEME = {
  ink: '#F4F3EF',
  surface: '#0A0A0F',
  surface2: '#141420',
  text: '#F4F3EF',
  text2: 'rgba(244,243,239,0.55)',
  cardBg: '#1A1A26',
  border: '#2A2A3A',
};

export const LIGHT_THEME = {
  ink: '#0A0A0F',
  surface: '#F4F3EF',
  surface2: '#ECEAE3',
  text: '#0A0A0F',
  text2: 'rgba(10,10,15,0.55)',
  cardBg: '#FFFFFF',
  border: '#E2DED5',
};
