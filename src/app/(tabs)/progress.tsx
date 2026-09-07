import React, { useMemo, useState } from 'react';
import { ScrollView, useWindowDimensions, View } from 'react-native';

import { BarChart, LineChart, type Point } from '@/components/chart';
import { ExercisePicker } from '@/components/exercise-picker';
import { Button, Card, Chip, EmptyState, Row, Screen, SectionHeader, StatTile, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import {
  formatDate,
  formatDuration,
  num,
  toDisplayWeight,
} from '@/lib/format';
import { exerciseHistory, metricFor, records, weeklyTotals } from '@/lib/stats';
import { useStore } from '@/lib/store';

type WeeklyMetric = 'volume' | 'sessions' | 'distance';

export default function ProgressScreen() {
  const { width } = useWindowDimensions();
  const { sessions, exerciseById, settings } = useStore();
  const [weekly, setWeekly] = useState<WeeklyMetric>('volume');
  const [exerciseId, setExerciseId] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);

  const chartWidth = Math.min(width, 800) - Spacing.four * 2 - Spacing.four * 2;

  const finished = useMemo(() => sessions.filter((s) => s.finishedAt), [sessions]);
  const weeks = useMemo(() => weeklyTotals(finished, 10), [finished]);

  /** Ejercicios con al menos un registro, del más reciente al más antiguo. */
  const trained = useMemo(() => {
    const seen: string[] = [];
    for (const s of finished) {
      for (const e of s.entries) if (!seen.includes(e.exerciseId)) seen.push(e.exerciseId);
    }
    return seen;
  }, [finished]);

  const selectedId = exerciseId ?? trained[0] ?? null;
  const exercise = selectedId ? exerciseById(selectedId) : undefined;
  const history = useMemo(
    () => (selectedId ? exerciseHistory(finished, selectedId) : []),
    [finished, selectedId],
  );
  const pr = useMemo(() => records(history), [history]);
  const metric = exercise ? metricFor(exercise.kind) : metricFor('strength');

  const weeklyPoints: Point[] = weeks.map((w) => ({
    label: w.label,
    value:
      weekly === 'volume'
        ? toDisplayWeight(w.volumeKg, settings.unit)
        : weekly === 'distance'
          ? w.distanceKm
          : w.sessions,
  }));

  const seriesPoints: Point[] = history.map((p) => ({
    label: formatDate(p.date),
    value: Number(p[metric.key] ?? 0),
  }));

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ padding: Spacing.four, gap: Spacing.three, paddingBottom: Spacing.seven }}
        showsVerticalScrollIndicator={false}>
        <Text variant="display">Progreso</Text>

        {finished.length === 0 ? (
          <Card>
            <EmptyState
              icon="trending-up-outline"
              title="Todavía no hay datos"
              hint="Cierra un par de entrenos y aquí verás cómo evoluciona tu volumen, tus kilómetros y cada ejercicio."
            />
          </Card>
        ) : (
          <>
            <SectionHeader title="Últimas 10 semanas" />
            <Card style={{ gap: Spacing.three }}>
              <Row gap={Spacing.two}>
                <Chip label="Volumen" selected={weekly === 'volume'} onPress={() => setWeekly('volume')} />
                <Chip label="Entrenos" selected={weekly === 'sessions'} onPress={() => setWeekly('sessions')} />
                <Chip label="Distancia" selected={weekly === 'distance'} onPress={() => setWeekly('distance')} />
              </Row>
              <BarChart
                data={weeklyPoints}
                width={chartWidth}
                suffix={weekly === 'volume' ? settings.unit : weekly === 'distance' ? 'km' : ''}
              />
            </Card>

            <SectionHeader title="Por ejercicio" />

            {trained.length === 0 ? null : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.two }}>
                {trained.slice(0, 12).map((id) => (
                  <Chip
                    key={id}
                    label={exerciseById(id)?.name ?? 'Ejercicio'}
                    selected={id === selectedId}
                    onPress={() => setExerciseId(id)}
                  />
                ))}
              </ScrollView>
            )}

            <Button
              title={exercise ? `Cambiar (${exercise.name})` : 'Elegir ejercicio'}
              icon="search"
              variant="secondary"
              small
              onPress={() => setPicking(true)}
            />

            {exercise && history.length > 0 ? (
              <Card style={{ gap: Spacing.four }}>
                <View>
                  <Text variant="heading">{exercise.name}</Text>
                  <Text variant="caption" dim>
                    {metric.label} · {history.length} registros
                  </Text>
                </View>

                <LineChart
                  data={seriesPoints}
                  width={chartWidth}
                  suffix={metric.suffix}
                  format={
                    exercise.kind === 'time'
                      ? (v) => formatDuration(v)
                      : (v) => num(exercise.kind === 'strength' ? toDisplayWeight(v, settings.unit) : v, 1)
                  }
                />

                <Row style={{ alignItems: 'flex-start' }}>
                  {exercise.kind === 'strength' ? (
                    <>
                      <StatTile
                        label="Mejor peso"
                        value={num(toDisplayWeight(pr.maxWeightKg, settings.unit), 1)}
                        unit={settings.unit}
                        accent
                      />
                      <StatTile label="Con" value={`${pr.maxWeightReps}`} unit="reps" />
                      <StatTile
                        label="1RM est."
                        value={num(toDisplayWeight(pr.best1RM, settings.unit), 1)}
                        unit={settings.unit}
                      />
                    </>
                  ) : exercise.kind === 'cardio' ? (
                    <>
                      <StatTile label="Más lejos" value={num(pr.longestKm, 2)} unit="km" accent />
                      <StatTile
                        label="Mejor ritmo"
                        value={pr.bestPaceSecPerKm ? formatDuration(pr.bestPaceSecPerKm) : '—'}
                        unit="/km"
                      />
                      <StatTile label="Sesiones" value={String(pr.totalSessions)} />
                    </>
                  ) : (
                    <>
                      <StatTile label="Mejor serie" value={formatDuration(pr.longestHoldSec)} accent />
                      <StatTile label="Sesiones" value={String(pr.totalSessions)} />
                    </>
                  )}
                </Row>

                <View style={{ gap: Spacing.two }}>
                  <Text variant="caption" dim style={{ textTransform: 'uppercase' }}>
                    Últimos registros
                  </Text>
                  {[...history]
                    .reverse()
                    .slice(0, 5)
                    .map((p) => (
                      <Row key={p.sessionId} style={{ justifyContent: 'space-between' }}>
                        <Text variant="body" dim>
                          {formatDate(p.date)}
                        </Text>
                        <Text variant="mono">
                          {exercise.kind === 'strength'
                            ? `${num(toDisplayWeight(p.topWeightKg, settings.unit), 1)} ${settings.unit} × ${p.topReps}`
                            : exercise.kind === 'cardio'
                              ? `${num(p.distanceKm, 2)} km · ${formatDuration(p.durationSec)}`
                              : formatDuration(p.bestHoldSec)}
                        </Text>
                      </Row>
                    ))}
                </View>
              </Card>
            ) : (
              <Card>
                <EmptyState
                  icon="analytics-outline"
                  title="Sin registros de este ejercicio"
                  hint="Elige otro ejercicio o regístralo en tu próximo entreno."
                />
              </Card>
            )}
          </>
        )}
      </ScrollView>

      <ExercisePicker
        visible={picking}
        onClose={() => setPicking(false)}
        onPick={(picked) => {
          if (picked[0]) setExerciseId(picked[0].id);
        }}
      />
    </Screen>
  );
}
