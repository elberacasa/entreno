import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button, Chip, Field, Row, Sheet, Text } from '@/components/ui';
import { Radius, Spacing, Tabular } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Routine } from '@/lib/types';

/** Cuántos días hacia adelante se pueden elegir. */
const HORIZON = 28;
const HOURS = ['06:30', '08:00', '12:00', '17:30', '19:00', '20:30'];

const DAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MONTHS = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];

/** Los próximos días, empezando por hoy. */
function nextDays(count: number): Date[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    return d;
  });
}

/** "19:30" -> [19, 30]. Devuelve null si no es una hora válida. */
function parseTime(text: string): [number, number] | null {
  const match = text.trim().match(/^(\d{1,2})[:.]?(\d{2})?$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2] ?? 0);
  if (hours > 23 || minutes > 59) return null;
  return [hours, minutes];
}

function DayCard({
  date,
  selected,
  onPress,
}: {
  date: Date;
  selected: boolean;
  onPress: () => void;
}) {
  const c = useTheme();
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: 58,
        paddingVertical: Spacing.three,
        borderRadius: Radius.md,
        alignItems: 'center',
        gap: 2,
        backgroundColor: selected ? c.accent : c.surface2,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: selected ? c.accent : c.border,
        opacity: pressed ? 0.7 : 1,
      })}>
      <Text
        variant="caption"
        style={{ color: selected ? c.onAccent : c.textFaint, textTransform: 'uppercase' }}>
        {isToday ? 'Hoy' : DAYS[date.getDay()]}
      </Text>
      <Text
        variant="heading"
        style={[Tabular, { color: selected ? c.onAccent : c.text, fontSize: 19 }]}>
        {date.getDate()}
      </Text>
      <Text variant="caption" style={{ color: selected ? c.onAccent : c.textFaint }}>
        {MONTHS[date.getMonth()]}
      </Text>
    </Pressable>
  );
}

/**
 * Elige día y hora para una rutina.
 *
 * No hay selector nativo porque el de React Native no funciona bien en web y
 * la app se usa sobre todo desde el móvil como página. Con la tira de días y
 * unas horas típicas se elige más rápido que con una rueda, y el campo de
 * texto queda para cualquier otra hora.
 */
export function SchedulePicker({
  routine,
  initial,
  onClose,
  onConfirm,
}: {
  routine: Routine | null;
  /** Fecha actual cuando se está reprogramando algo ya puesto. */
  initial?: string | null;
  onClose: () => void;
  onConfirm: (at: Date) => void;
}) {
  const c = useTheme();
  const start = initial ? new Date(initial) : null;

  const [day, setDay] = useState(() => {
    const d = start ?? new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  });
  const [time, setTime] = useState(() =>
    start
      ? `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`
      : '18:00',
  );

  const parsed = parseTime(time);
  const days = nextDays(HORIZON);

  const confirm = () => {
    if (!parsed) return;
    const at = new Date(day);
    at.setHours(parsed[0], parsed[1], 0, 0);
    onConfirm(at);
  };

  return (
    <Sheet
      visible={routine != null}
      onClose={onClose}
      title="Programar entreno"
      footer={
        <Button
          title="Guardar en la agenda"
          icon="calendar"
          disabled={!parsed}
          onPress={confirm}
        />
      }>
      {routine ? (
        <>
          <Text variant="title" numberOfLines={2}>
            {routine.name}
          </Text>

          <Text variant="overline" faint style={{ marginTop: Spacing.two }}>
            Día
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: Spacing.two, paddingRight: Spacing.four }}>
            {days.map((d) => (
              <DayCard
                key={d.getTime()}
                date={d}
                selected={d.getTime() === day}
                onPress={() => setDay(d.getTime())}
              />
            ))}
          </ScrollView>

          <Text variant="overline" faint style={{ marginTop: Spacing.two }}>
            Hora
          </Text>
          <Row style={{ flexWrap: 'wrap' }} gap={Spacing.two}>
            {HOURS.map((h) => (
              <Chip key={h} label={h} selected={time === h} onPress={() => setTime(h)} />
            ))}
          </Row>
          <Field
            label="O escribe otra"
            value={time}
            onChangeText={setTime}
            keyboardType="numbers-and-punctuation"
            placeholder="hh:mm"
            full
          />
          {parsed ? null : (
            <Text variant="caption" danger>
              Esa hora no vale. Escríbela como 07:30 o 19:45.
            </Text>
          )}

          <View
            style={{
              padding: Spacing.three,
              borderRadius: Radius.md,
              backgroundColor: c.surface,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: c.border,
            }}>
            <Text variant="caption" dim style={{ lineHeight: 18 }}>
              Aparecerá en «Hoy» cuando se acerque la fecha. Ojo: la app{' '}
              <Text variant="caption" style={{ fontWeight: '800' }}>
                no te va a avisar con una notificación
              </Text>
              , porque una web instalada en el iPhone no puede mandarlas sin un servidor detrás. Es
              una agenda, no una alarma.
            </Text>
          </View>
        </>
      ) : null}
    </Sheet>
  );
}
