import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, ProgressBar, Row, Segmented, Sheet, Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  DEFAULT_PROFILE,
  EQUIPMENT_HINT,
  EQUIPMENT_LABEL,
  EQUIPMENT_ORDER,
  GOAL_HINT,
  GOAL_LABEL,
  GOAL_ORDER,
  type Equipment,
  type Goal,
  type TrainingProfile,
} from '@/lib/types';

const DAYS = ['2', '3', '4', '5', '6'] as const;
const MINUTES = ['30', '45', '60', '75', '90'] as const;

const STEPS = ['Material', 'Días', 'Tiempo', 'Objetivo', 'Experiencia'];

/** Fila con marca de selección, para listas donde cada opción necesita explicación. */
function OptionRow({
  title,
  hint,
  selected,
  multiple,
  onPress,
}: {
  title: string;
  hint?: string;
  selected: boolean;
  multiple?: boolean;
  onPress: () => void;
}) {
  const c = useTheme();
  const icon = multiple
    ? selected
      ? 'checkbox'
      : 'square-outline'
    : selected
      ? 'radio-button-on'
      : 'radio-button-off';

  return (
    <Pressable
      accessibilityRole={multiple ? 'checkbox' : 'radio'}
      accessibilityState={{ checked: selected }}
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three,
        padding: Spacing.three,
        borderRadius: Radius.md,
        backgroundColor: selected ? c.accentSoft : c.surface,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: selected ? c.accent : c.border,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Ionicons name={icon} size={22} color={selected ? c.accent : c.textFaint} />
      <View style={{ flex: 1, gap: Spacing.half }}>
        <Text variant="heading">{title}</Text>
        {hint ? (
          <Text variant="caption" faint style={{ lineHeight: 17 }}>
            {hint}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

/**
 * Cuestionario de cuatro pasos que recoge con qué material cuentas, cuánto
 * puedes entrenar y qué buscas. Con eso se genera el plan.
 *
 * Se monta con una `key` nueva cada vez que se abre, así que arranca siempre
 * en el primer paso sin necesidad de reiniciar el estado a mano.
 */
export function ProfileWizard({
  visible,
  initial,
  onClose,
  onDone,
}: {
  visible: boolean;
  initial?: TrainingProfile | null;
  onClose: () => void;
  onDone: (profile: TrainingProfile) => void;
}) {
  const c = useTheme();
  const [step, setStep] = useState(0);
  const [equipment, setEquipment] = useState<Equipment[]>(
    initial?.equipment ?? DEFAULT_PROFILE.equipment,
  );
  const [days, setDays] = useState(String(initial?.daysPerWeek ?? DEFAULT_PROFILE.daysPerWeek));
  const [minutes, setMinutes] = useState(
    String(initial?.minutesPerSession ?? DEFAULT_PROFILE.minutesPerSession),
  );
  const [goal, setGoal] = useState<Goal>(initial?.goal ?? DEFAULT_PROFILE.goal);

  const [experience, setExperience] = useState<'beginner' | 'regular'>(
    initial?.experience ?? 'beginner',
  );
  const last = step === STEPS.length - 1;

  const toggle = (item: Equipment) =>
    setEquipment((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item],
    );

  const next = () => {
    if (!last) {
      setStep(step + 1);
      return;
    }
    onDone({
      equipment,
      experience,
      daysPerWeek: Number(days),
      minutesPerSession: Number(minutes),
      goal,
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Tu plan a medida"
      footer={
        <Row gap={Spacing.two}>
          {step > 0 ? (
            <Button
              title="Atrás"
              icon="arrow-back"
              variant="secondary"
              style={{ flex: 1 }}
              onPress={() => setStep(step - 1)}
            />
          ) : null}
          <Button
            title={last ? 'Ver mis rutinas' : 'Siguiente'}
            icon={last ? 'sparkles' : 'arrow-forward'}
            style={{ flex: 2 }}
            onPress={next}
          />
        </Row>
      }
    >
      <View style={{ gap: Spacing.two }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text variant="overline" accent>
            Paso {step + 1} de {STEPS.length}
          </Text>
          <Text variant="overline" faint>
            {STEPS[step]}
          </Text>
        </Row>
        <ProgressBar value={(step + 1) / STEPS.length} height={5} />
      </View>

      {step === 0 ? (
        <>
          <Text variant="title">¿Con qué puedes entrenar?</Text>
          <Text variant="body" dim style={{ lineHeight: 21 }}>
            Marca todo lo que tengas a mano. Solo te propondré ejercicios que puedas hacer de
            verdad. El peso corporal se da por hecho.
          </Text>
          <View style={{ gap: Spacing.two }}>
            {EQUIPMENT_ORDER.map((item) => (
              <OptionRow
                key={item}
                multiple
                title={EQUIPMENT_LABEL[item]}
                hint={EQUIPMENT_HINT[item]}
                selected={equipment.includes(item)}
                onPress={() => toggle(item)}
              />
            ))}
          </View>
          {equipment.length === 0 ? (
            <Text variant="caption" faint style={{ lineHeight: 17 }}>
              Sin marcar nada te haré un plan solo de peso corporal. Funciona, pero se queda corto
              en espalda y pierna.
            </Text>
          ) : null}
        </>
      ) : null}

      {step === 1 ? (
        <>
          <Text variant="title">¿Cuántos días a la semana?</Text>
          <Text variant="body" dim style={{ lineHeight: 21 }}>
            Sé realista: es mejor cumplir tres días que apuntarte a seis y fallar. Con esto decido
            si cada sesión toca todo el cuerpo o se reparte.
          </Text>
          <Segmented<string>
            value={days}
            onChange={setDays}
            options={DAYS.map((d) => ({ value: d, label: d }))}
          />
          <View
            style={{
              padding: Spacing.three,
              borderRadius: Radius.md,
              backgroundColor: c.surface,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: c.border,
            }}
          >
            <Text variant="body" dim style={{ lineHeight: 21 }}>
              {days === '2'
                ? 'Dos días: cuerpo completo en cada sesión, centrado en los básicos.'
                : days === '3'
                  ? 'Tres sesiones por semana. Al final ajustaremos el reparto a tu experiencia.'
                  : days === '4'
                    ? 'Cuatro días: torso y pierna, dos veces cada uno.'
                    : days === '5'
                      ? 'Cinco días: empuje, tirón, pierna y dos sesiones de repaso.'
                      : 'Seis días: empuje, tirón y pierna dos veces. Mucho volumen, cuida el descanso.'}
            </Text>
          </View>
        </>
      ) : null}

      {step === 2 ? (
        <>
          <Text variant="title">¿Cuánto dura tu entreno?</Text>
          <Text variant="body" dim style={{ lineHeight: 21 }}>
            Minutos por sesión, contando el calentamiento. Ajusto cuántos ejercicios entran para que
            no se te haga eterno.
          </Text>
          <Segmented<string>
            value={minutes}
            onChange={setMinutes}
            options={MINUTES.map((m) => ({ value: m, label: m }))}
          />
          <Text variant="caption" faint center>
            minutos por sesión
          </Text>
        </>
      ) : null}

      {step === 3 ? (
        <>
          <Text variant="title">¿Qué buscas?</Text>
          <Text variant="body" dim style={{ lineHeight: 21 }}>
            Esto decide las series, las repeticiones y los descansos. Puedes cambiarlo luego y ver
            el plan para otro objetivo sin repetir el cuestionario.
          </Text>
          <View style={{ gap: Spacing.two }}>
            {GOAL_ORDER.map((g) => (
              <OptionRow
                key={g}
                title={GOAL_LABEL[g]}
                hint={GOAL_HINT[g]}
                selected={goal === g}
                onPress={() => setGoal(g)}
              />
            ))}
          </View>
        </>
      ) : null}
      {step === 4 ? (
        <View style={{ gap: Spacing.four }}>
          <Text variant="title">¿Cómo llevas el entrenamiento?</Text>
          <Text dim style={{ lineHeight: 22 }}>
            Esto nos ayuda a elegir el reparto de la semana. Siempre puedes editar las rutinas.
          </Text>
          <OptionRow
            title="Estoy empezando"
            hint="Estoy aprendiendo los movimientos o retomando el hábito."
            selected={experience === 'beginner'}
            onPress={() => setExperience('beginner')}
          />
          <OptionRow
            title="Entreno con regularidad"
            hint="Ya conozco los ejercicios y registro mis entrenos."
            selected={experience === 'regular'}
            onPress={() => setExperience('regular')}
          />
        </View>
      ) : null}
    </Sheet>
  );
}
