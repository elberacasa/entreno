import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabBarHeight } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type TabIcon = keyof typeof Ionicons.glyphMap;

const TABS: { name: string; title: string; icon: TabIcon; iconOff: TabIcon }[] = [
  { name: 'index', title: 'Hoy', icon: 'flame', iconOff: 'flame-outline' },
  { name: 'routines', title: 'Rutinas', icon: 'layers', iconOff: 'layers-outline' },
  { name: 'history', title: 'Historial', icon: 'calendar', iconOff: 'calendar-outline' },
  { name: 'progress', title: 'Progreso', icon: 'stats-chart', iconOff: 'stats-chart-outline' },
];

export default function TabsLayout() {
  const c = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.accent,
        tabBarInactiveTintColor: c.textFaint,
        tabBarStyle: {
          backgroundColor: c.surface,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: c.border,
          // Alto explícito + área segura. Nada de `paddingTop`: la fila de
          // pestañas se reparte lo que quede y, si le falta sitio, encoge la
          // etiqueta hasta cortarla (en la web se quedaba en 8 px de alto).
          height: TabBarHeight + insets.bottom,
          paddingBottom: insets.bottom,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 0.1,
          lineHeight: 14,
          marginTop: 3,
          // El icono se lleva su alto; la etiqueta no cede el suyo.
          flexShrink: 0,
        },
      }}>
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? tab.icon : tab.iconOff} size={23} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
