import React, { useMemo, useState } from 'react';
import { ScrollView, useWindowDimensions, View } from 'react-native';

import { BarChart, LineChart, type Point } from '@/components/chart';
import { ExercisePicker } from '@/components/exercise-picker';
import {
  Card,
  Chip,
  Divider,
  EmptyState,
  IconButton,
  Row,
  Screen,
  ScreenTitle,
  SectionHeader,
  Segmented,
  StatTile,
  Text,
} from '@/components/ui';
import { MaxContentWidth, Spacing, Tabular } from '@/constants/theme';
import { useTabBarPadding } from '@/hooks/use-tab-bar-padding';
import { formatDate, formatDuration, num, toDisplayWeight } from '@/lib/format';
import { exerciseHistory, metricFor, records, weeklyTotals } from '@/lib/stats';
import { useStore } from '@/lib/store';

type WeeklyMetric = 'volume' | 'sessions' | 'distance';

export default function ProgressScreen() {
  const { width } = useWindowDimensions();
  const bottomPadding = useTabBarPadding();
  const { sessions, exerciseById, settings } = useStore();
  const [weekly, setWeekly] = useState<WeeklyMetric>('volume');
  const [exerciseId, setExerciseId] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);

  // Ancho de pantalla menos el padding del scroll y el de la tarjeta.
  const chartWidth = Math.min(width, MaxContentWidth) - Spacing.four * 4;

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

  const weeklySuffix = weekly === 'volume' ? settings.unit : weekly === 'distance' ? 'km' : '';

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{
          padding: Spacing.four,
          gap: Spacing.three,
          paddingBottom: bottomPadding,
        }}
        showsVerticalScrollIndicator={false}>
        <ScreenTitle title="Progreso" overline="Cómo vas evolucionando" />

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
            <Card style={{ gap: Spacing.four }}>
              <Segmented<WeeklyMetric>
                value={weekly}
                onChange={setWeekly}
                options={[
                  { value: 'volume', label: 'Volumen' },
                  { value: 'sessions', label: 'Entrenos' },
                  { value: 'distance', label: 'Distancia' },
                ]}
              />
              <BarChart
                data={weeklyPoints}
                width={chartWidth}
                suffix={weeklySuffix}
                format={(v) => num(v, weekly === 'distance' ? 1 : 0)}
              />
            </Card>

            <SectionHeader title="Por ejercicio" />

            <Row gap={Spacing.two} style={{ alignItems: 'center' }}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: Spacing.two, paddingRight: Spacing.two }}
                style={{ flex: 1 }}>
                {trained.slice(0, 12).map((id) => (
                  <Chip
                    key={id}
                    label={exerciseById(id)?.name ?? 'Ejercicio'}
                    selected={id === selectedId}
                    onPress={() => setExerciseId(id)}
                  />
                ))}
              </ScrollView>
              {/* Buscar cualquier otro ejercicio del catálogo. */}
              <IconButton name="search" size={19} surface onPress={() => setPicking(true)} />
            </Row>

            {exercise && history.length > 0 ? (
              <Card style={{ gap: Spacing.four }}>
                <View style={{ gap: Spacing.half }}>
                  <Text variant="title">{exercise.name}</Text>
                  <Text variant="caption" faint>
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
                      : (v) =>
                          num(
                            exercise.kind === 'strength' ? toDisplayWeight(v, settings.unit) : v,
                            1,
                          )
                  }
                />

                <Divider />

                <Row style={{ alignItems: 'flex-start' }} gap={Spacing.four}>
                  {exercise.kind === 'strength' ? (
                    <>
                      <StatTile
                        label="Mejor peso"
                        value={num(toDisplayWeight(pr.maxWeightKg, settings.unit), 1)}
                        unit={settings.unit}
                        accent
                      />
                      <StatTile label="En esa serie" value={`${pr.maxWeightReps}`} unit="reps" />
                      <StatTile
                        label="1RM estimado"
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
                      <StatTile
                        label="Mejor serie"
                        value={formatDuration(pr.longestHoldSec)}
                        accent
                      />
                      <StatTile label="Sesiones" value={String(pr.totalSessions)} />
                    </>
                  )}
                </Row>

                <View style={{ gap: Spacing.three }}>
                  <Text variant="overline" faint>
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
                        <Text variant="label" style={Tabular}>
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
