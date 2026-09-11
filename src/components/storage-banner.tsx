import Ionicons from '@expo/vector-icons/Ionicons';
import { router, usePathname } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { Button, Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useStore } from '@/lib/store';

/**
 * Avisos de que el almacenamiento del teléfono no está haciendo su trabajo.
 *
 * Salen en todas las pantallas y ocupan sitio a propósito: si lo que apuntas
 * vive solo en memoria vas a perderlo, y hay que enterarse durante el entreno,
 * no después. Llevan botón porque mandar al usuario a buscar Ajustes a mano en
 * mitad de una serie no es un aviso, es un acertijo.
 */
export function StorageBanner() {
  const { saveError, readError } = useStore();
  const path = usePathname();
  // En Ajustes el botón sobra: ya estás donde te mandaba.
  const action = path === '/settings' ? undefined : () => router.push('/settings');

  if (!saveError && !readError) return null;

  return (
    <View style={{ gap: Spacing.two, margin: Spacing.four, marginBottom: 0 }}>
      {readError ? (
        <Notice
          title="No se pudo leer lo que tenías guardado"
          body={`La app no entiende ${readError} que hay en este teléfono. No se ha tocado nada y no se va a escribir encima, así que lo que hagas ahora tampoco se guardará ahí hasta que decidas qué hacer.`}
          actionLabel="Ver qué hacer"
          onAction={action}
        />
      ) : null}

      {saveError ? (
        <Notice
          title="No se pudo guardar en el teléfono"
          body={`Falló al guardar ${saveError}. Lo que apuntes ahora se perderá al cerrar la app: saca una copia antes de seguir.`}
          actionLabel="Sacar una copia"
          onAction={action}
        />
      ) : null}
    </View>
  );
}

function Notice({
  title,
  body,
  actionLabel,
  onAction,
}: {
  title: string;
  body: string;
  actionLabel: string;
  onAction?: () => void;
}) {
  const c = useTheme();
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={{
        padding: Spacing.three,
        gap: Spacing.two,
        borderRadius: Radius.md,
        backgroundColor: c.accentSoft,
        borderWidth: 1,
        borderColor: c.accent,
        flexDirection: 'row',
        alignItems: 'flex-start',
      }}
    >
      <Ionicons name="warning" size={20} color={c.accent} style={{ marginTop: 2 }} />
      <View style={{ flex: 1, gap: Spacing.two }}>
        {/* 16 y 15 px: es el único sitio de la app donde el texto pequeño
            costaría datos. `dim` sobre el fondo del aviso da 5,9:1. */}
        <Text variant="heading">{title}</Text>
        <Text variant="body" dim style={{ lineHeight: 21 }}>
          {body}
        </Text>
        {onAction ? (
          <Button
            title={actionLabel}
            variant="secondary"
            small
            style={{ alignSelf: 'flex-start' }}
            onPress={onAction}
          />
        ) : null}
      </View>
    </View>
  );
}
