import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { DialogProvider } from '@/components/dialog';
import { AppThemeProvider } from '@/components/theme-provider';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { StoreProvider } from '@/lib/store';

export default function RootLayout() {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const c = dark ? Colors.dark : Colors.light;

  const base = dark ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      primary: c.accent,
      background: c.bg,
      card: c.bg,
      text: c.text,
      border: c.border,
    },
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppThemeProvider>
        <StoreProvider>
          <ThemeProvider value={navTheme}>
            <DialogProvider>
              <StatusBar style={dark ? 'light' : 'dark'} />
              <Stack
                screenOptions={{
                  headerTitleStyle: { fontWeight: '800', fontSize: 17 },
                  headerStyle: { backgroundColor: c.bg },
                  headerTintColor: c.accent,
                  headerShadowVisible: false,
                  contentStyle: { backgroundColor: c.bg },
                }}>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen
                  name="session/[id]"
                  options={{ title: 'Entrenamiento', headerBackTitle: 'Atrás' }}
                />
                <Stack.Screen
                  name="routine/[id]"
                  options={{ title: 'Rutina', headerBackTitle: 'Atrás' }}
                />
                <Stack.Screen name="recommended" options={{ title: 'Plan recomendado' }} />
                <Stack.Screen name="exercises" options={{ title: 'Ejercicios' }} />
                <Stack.Screen name="settings" options={{ title: 'Ajustes' }} />
              </Stack>
            </DialogProvider>
          </ThemeProvider>
        </StoreProvider>
      </AppThemeProvider>
    </GestureHandlerRootView>
  );
}
