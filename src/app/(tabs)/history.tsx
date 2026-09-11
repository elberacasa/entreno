import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { TrainingCalendar } from '@/components/training-calendar';
import {
  Button,
  Card,
  Field,
  Row,
  Screen,
  ScreenTitle,
  SectionHeader,
  Text,
} from '@/components/ui';
import { useTabBarPadding } from '@/hooks/use-tab-bar-padding';
import { useTheme } from '@/hooks/use-theme';
import { formatDuration, sessionDurationSec, sessionSetCount, sessionSummary } from '@/lib/format';
import { localDay } from '@/lib/training-insights';
import { useStore } from '@/lib/store';

export default function HistoryScreen() {
  const { date } = useLocalSearchParams<{ date?: string }>();
  return <History key={date ?? 'default'} initialDate={date} />;
}
function History({ initialDate }: { initialDate?: string }) {
  const c = useTheme();
  const store = useStore();
  const { width } = useWindowDimensions();
  const paddingBottom = useTabBarPadding();
  const initial =
    initialDate && /^\d{4}-\d{2}-\d{2}$/.test(initialDate)
      ? new Date(`${initialDate}T12:00:00`)
      : new Date();
  const [month, setMonth] = useState(() => new Date(initial.getFullYear(), initial.getMonth(), 1));
  const [selected, setSelected] = useState<string | null>(initialDate ?? null);
  const [query, setQuery] = useState('');
  const finished = useMemo(
    () =>
      store.sessions
        .filter((s) => s.finishedAt)
        .sort((a, b) => Date.parse(b.finishedAt!) - Date.parse(a.finishedAt!)),
    [store.sessions],
  );
  const monthSessions = finished.filter((s) => {
    const date = new Date(s.finishedAt!);
    return date.getFullYear() === month.getFullYear() && date.getMonth() === month.getMonth();
  });
  const visible = monthSessions.filter(
    (s) =>
      (!selected || localDay(new Date(s.finishedAt!)) === selected) &&
      s.name.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es')),
  );
  const planned = store.schedule.filter((s) => selected && localDay(new Date(s.at)) === selected);
  const time = monthSessions.reduce((sum, s) => sum + (sessionDurationSec(s) ?? 0), 0);
  return (
    <Screen>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom, gap: 24 }}
      >
        <ScreenTitle title="Tu historial" />
        <Text dim>Un registro de todo lo que has hecho.</Text>
        <View style={{ flexDirection: width >= 900 ? 'row' : 'column', gap: 28 }}>
          <View style={{ flex: width >= 900 ? 1 : undefined, gap: 20 }}>
            <Card style={{ padding: 16 }}>
              <TrainingCalendar
                sessions={finished}
                month={month}
                selected={selected}
                onMonth={(date) => {
                  setMonth(date);
                  setSelected(null);
                }}
                onSelect={(day) => setSelected(selected === day ? null : day)}
              />
            </Card>
            <Row style={{ justifyContent: 'space-between' }}>
              <View>
                <Text variant="metricSm">{monthSessions.length}</Text>
                <Text variant="caption" dim>
                  Sesiones este mes
                </Text>
              </View>
              <View>
                <Text variant="metricSm">{formatDuration(time)}</Text>
                <Text variant="caption" dim>
                  Tiempo registrado
                </Text>
              </View>
              <View>
                <Text variant="metricSm">
                  {monthSessions.reduce((sum, s) => sum + sessionSetCount(s), 0)}
                </Text>
                <Text variant="caption" dim>
                  Series
                </Text>
              </View>
            </Row>
          </View>
          <View style={{ flex: width >= 900 ? 1 : undefined, gap: 16 }}>
            <SectionHeader
              title={
                selected
                  ? new Date(`${selected}T12:00:00`).toLocaleDateString('es', {
                      day: 'numeric',
                      month: 'long',
                    })
                  : 'Sesiones del mes'
              }
              action={selected ? 'Todo el mes' : undefined}
              onAction={() => setSelected(null)}
            />
            <Field
              label="Buscar en este mes"
              placeholder="Nombre de la sesión"
              value={query}
              onChangeText={setQuery}
            />
            {planned.map((item) => (
              <Card key={item.id} tone="accent" style={{ gap: 8 }}>
                <Text variant="caption" accent>
                  Programada
                </Text>
                <Text variant="title">{store.routineById(item.routineId)?.name ?? 'Rutina'}</Text>
                <Button
                  title="Ver mi plan"
                  variant="secondary"
                  onPress={() => router.push('/routines')}
                />
              </Card>
            ))}
            {visible.length ? (
              visible.map((session) => (
                <Pressable
                  key={session.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Ver series de ${session.name}`}
                  onPress={() => router.push(`/session/${session.id}`)}
                  style={({ pressed }) => ({
                    paddingVertical: 18,
                    borderBottomWidth: 1,
                    borderColor: c.border,
                    opacity: pressed ? 0.65 : 1,
                  })}
                >
                  <Row>
                    <View style={{ alignItems: 'center', width: 44, gap: 2 }}>
                      <Text variant="title">{new Date(session.finishedAt!).getDate()}</Text>
                      <Text variant="caption" dim>
                        {new Date(session.finishedAt!).toLocaleDateString('es', {
                          weekday: 'short',
                        })}
                      </Text>
                    </View>
                    <View style={{ flex: 1, gap: 5 }}>
                      <Text variant="heading">{session.name}</Text>
                      <Text variant="caption" dim>
                        {sessionSummary(session, store.settings.unit)}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={c.textDim} />
                  </Row>
                </Pressable>
              ))
            ) : (
              <Card style={{ padding: 24, gap: 10, borderStyle: 'dashed' }}>
                <Text variant="title">
                  {query
                    ? 'Sin coincidencias.'
                    : selected
                      ? 'Este día está libre.'
                      : 'Un mes por escribir.'}
                </Text>
                <Text dim>
                  {query
                    ? 'Prueba otro nombre o cambia de mes.'
                    : 'Las sesiones aparecerán aquí cuando las termines y guardes.'}
                </Text>
                {!query && !selected ? (
                  <Button
                    title="Ir a entrenar"
                    variant="secondary"
                    onPress={() => router.push('/')}
                  />
                ) : null}
              </Card>
            )}
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
