import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, View } from 'react-native';

import { Badge, Row, Sheet, Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { EXERCISE_DEMOS } from '@/lib/demos';
import { describeEquipment, describeExercise, type Exercise } from '@/lib/types';

/** Lo que tarda en pasar de una posición a la otra. */
const FRAME_MS = 900;

export const hasDemo = (exerciseId: string) => (EXERCISE_DEMOS[exerciseId]?.length ?? 0) > 0;

/**
 * Demostración del ejercicio: dos fotos, la posición inicial y la final, que
 * se alternan. Es lo mismo que enseña un gif de técnica pero pesando mucho
 * menos, y además se puede parar para mirar una postura con calma.
 *
 * El reloj sale de `useNow`, así que no hay temporizadores sueltos: cuando se
 * pausa, la suscripción se cancela sola.
 */
export function ExerciseDemo({
  exerciseId,
  height = 200,
}: {
  exerciseId: string;
  height?: number;
}) {
  const c = useTheme();
  const frames = EXERCISE_DEMOS[exerciseId];
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (mounted) setPlaying(!reduced);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (reduced) =>
      setPlaying(!reduced),
    );
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  const animated = playing && (frames?.length ?? 0) > 1;
  const now = useNow(animated, FRAME_MS);
  const index = frames?.length ? Math.floor(now / FRAME_MS) % frames.length : 0;

  if (!frames?.length) {
    return (
      <View
        style={{
          height,
          borderRadius: Radius.md,
          backgroundColor: c.surface2,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: c.border,
          alignItems: 'center',
          justifyContent: 'center',
          gap: Spacing.two,
          padding: Spacing.four,
        }}
      >
        <Ionicons name="image-outline" size={26} color={c.textFaint} />
        <Text variant="caption" faint center style={{ lineHeight: 17 }}>
          Este ejercicio todavía no tiene demostración.
        </Text>
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={playing ? 'Pausar demostración' : 'Reproducir demostración'}
      onPress={() => setPlaying((p) => !p)}
    >
      <View
        style={{
          height,
          borderRadius: Radius.md,
          overflow: 'hidden',
          backgroundColor: c.surface2,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: c.border,
        }}
      >
        <Image
          accessibilityLabel={
            index === 0 ? 'Posición inicial del ejercicio' : 'Posición final del ejercicio'
          }
          source={frames[index]}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          transition={250}
        />

        {/* Al pausar aparece el icono; mientras corre no molesta. */}
        {playing ? null : (
          <View
            style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: Radius.pill,
                backgroundColor: c.scrim,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="play" size={22} color="#FFFFFF" />
            </View>
          </View>
        )}

        <View style={{ position: 'absolute', left: Spacing.two, bottom: Spacing.two }}>
          <Badge label={index === 0 ? 'Inicio' : 'Final'} tone="accent" />
        </View>
      </View>
    </Pressable>
  );
}

/** Hoja con la demostración y la ficha del ejercicio. */
export function ExerciseDemoSheet({
  exercise,
  onClose,
}: {
  exercise: Exercise | null;
  onClose: () => void;
}) {
  return (
    <Sheet visible={exercise != null} onClose={onClose} title={exercise?.name ?? 'Ejercicio'}>
      {exercise ? (
        <>
          <ExerciseDemo exerciseId={exercise.id} height={240} />

          <Row gap={Spacing.two} style={{ flexWrap: 'wrap' }}>
            <Badge label={describeExercise(exercise)} />
            <Badge label={describeEquipment(exercise.equipment)} />
          </Row>

          <Text variant="caption" faint style={{ lineHeight: 17 }}>
            Las dos posiciones se alternan solas. Toca la imagen para pararla y fijarte en una.
            Fotos de free-exercise-db, de dominio público.
          </Text>
        </>
      ) : null}
    </Sheet>
  );
}

/** Miniatura de la posición inicial, para las listas del catálogo. */
export function DemoThumb({ exerciseId, size = 44 }: { exerciseId: string; size?: number }) {
  const c = useTheme();
  const frames = EXERCISE_DEMOS[exerciseId];

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: Radius.sm,
        overflow: 'hidden',
        backgroundColor: c.surface2,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {frames?.length ? (
        <Image source={frames[0]} style={{ width: '100%', height: '100%' }} contentFit="cover" />
      ) : (
        <Ionicons name="barbell-outline" size={size * 0.45} color={c.textFaint} />
      )}
    </View>
  );
}

/** Botón compacto para abrir la demostración desde una lista. */
export function DemoButton({ onPress }: { onPress: () => void }) {
  const c = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.one,
        paddingVertical: 2,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Ionicons name="play-circle-outline" size={15} color={c.accent} />
      <Text variant="caption" accent>
        Cómo se hace
      </Text>
    </Pressable>
  );
}
