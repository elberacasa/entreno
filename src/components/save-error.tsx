import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useStore } from '@/lib/store';

/**
 * Aviso de que el teléfono no está guardando.
 *
 * Sale en todas las pantallas y ocupa sitio a propósito: si lo que apuntas
 * vive solo en memoria, vas a perderlo al recargar y hay que enterarse
 * durante el entreno, no después.
 */
export function SaveErrorBanner() {
  const c = useTheme();
  const { saveError } = useStore();

  if (!saveError) return null;

  return (
    <View
      style={{
        margin: Spacing.four,
        marginBottom: 0,
        padding: Spacing.three,
        gap: Spacing.two,
        borderRadius: Radius.md,
        backgroundColor: c.accentSoft,
        borderWidth: 1,
        borderColor: c.accent,
        flexDirection: 'row',
        alignItems: 'flex-start',
      }}>
      <Ionicons name="warning" size={18} color={c.accent} style={{ marginTop: 1 }} />
      <View style={{ flex: 1, gap: Spacing.half }}>
        <Text variant="label">No se pudo guardar en el teléfono</Text>
        <Text variant="caption" dim style={{ lineHeight: 18 }}>
          Falló al guardar {saveError}. Lo que apuntes ahora se perderá al cerrar la app: copia el
          backup desde Ajustes antes de seguir.
        </Text>
      </View>
    </View>
  );
}
