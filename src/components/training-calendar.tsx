import React, { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { IconButton, Row, Text } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { activityByDay, localDay, monthDays } from '@/lib/training-insights';
import type { Session } from '@/lib/types';

export function TrainingCalendar({
  sessions,
  month,
  selected,
  onMonth,
  onSelect,
}: {
  sessions: Session[];
  month: Date;
  selected: string | null;
  onMonth: (month: Date) => void;
  onSelect: (day: string) => void;
}) {
  const c = useTheme();
  const activity = useMemo(() => activityByDay(sessions), [sessions]);
  const cells = monthDays(month);
  const today = localDay(new Date());
  return (
    <View style={{ gap: 16 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <IconButton
          name="chevron-back"
          accessibilityLabel="Mes anterior"
          onPress={() => onMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
        />
        <Text variant="heading">
          {month.toLocaleDateString('es', { month: 'long', year: 'numeric' })}
        </Text>
        <IconButton
          name="chevron-forward"
          accessibilityLabel="Mes siguiente"
          onPress={() => onMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
        />
      </Row>
      <Row gap={0}>
        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day, i) => (
          <Text key={i} variant="caption" dim center style={{ flex: 1 }}>
            {day}
          </Text>
        ))}
      </Row>
      {Array.from({ length: cells.length / 7 }, (_, week) => (
        <Row key={week} gap={4}>
          {cells.slice(week * 7, week * 7 + 7).map((date, index) => {
            if (!date) return <View key={`empty-${index}`} style={{ flex: 1 }} />;
            const key = localDay(date);
            const count = activity.get(key)?.length ?? 0;
            const chosen = selected === key;
            return (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityState={{ selected: chosen }}
                accessibilityLabel={`${date.toLocaleDateString('es', { day: 'numeric', month: 'long' })}, ${count} sesiones`}
                onPress={() => onSelect(key)}
                style={({ pressed }) => ({
                  flex: 1,
                  minHeight: 46,
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                  borderRadius: 12,
                  backgroundColor: chosen ? c.accent : count ? c.accentSoft : 'transparent',
                  borderWidth: today === key ? 1 : 0,
                  borderColor: c.accent,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Text variant="label" style={{ color: chosen ? c.onAccent : c.text }}>
                  {date.getDate()}
                </Text>
                <View
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: 3,
                    backgroundColor: count ? (chosen ? c.onAccent : c.accent) : 'transparent',
                  }}
                />
              </Pressable>
            );
          })}
        </Row>
      ))}
      <Text variant="caption" dim>
        Los días marcados tienen sesiones guardadas. Toca un día para verlas.
      </Text>
    </View>
  );
}
