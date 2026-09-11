import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { Row, SectionHeader, Text } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { useStore } from '@/lib/store';
import { DAY_NAMES, primaryGroups, weeklyOccurrences } from '@/lib/weekly-plan';
import { localDay } from '@/lib/training-insights';

export function WeekSchedule({ now = new Date() }: { now?: Date }) {
  const store = useStore();
  const c = useTheme();
  if (!store.settings.weeklyPlan) return null;
  return (
    <View style={{ gap: 14 }}>
      <SectionHeader
        title="Tu semana"
        action="Ajustar"
        onAction={() => router.push('/recommended')}
      />
      <View>
        {weeklyOccurrences(store, now).map(({ weekday, date, routine, completed, missing }) => {
          const today = localDay(date) === localDay(now);
          return (
            <Pressable
              key={weekday}
              accessibilityRole={routine || missing ? 'button' : undefined}
              disabled={!routine && !missing}
              accessibilityLabel={
                routine
                  ? `${DAY_NAMES[weekday]}: ${routine.name}${completed ? ', completada' : ''}`
                  : missing
                    ? 'Recuperar rutina de la semana'
                    : undefined
              }
              onPress={() =>
                router.push(routine ? `/routine-preview/${routine.id}` : '/recommended')
              }
              style={({ pressed }) => ({
                paddingVertical: routine ? 16 : 10,
                paddingHorizontal: 12,
                borderRadius: 12,
                backgroundColor: today ? c.accentSoft : 'transparent',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Row gap={12}>
                <View style={{ width: 36, gap: 2 }}>
                  <Text variant="label" accent={today}>
                    {DAY_NAMES[weekday].slice(0, 3)}
                  </Text>
                  <Text variant="caption" dim>
                    {date.getDate()}
                  </Text>
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text variant={routine ? 'heading' : 'caption'} dim={!routine}>
                    {routine?.name ?? (missing ? 'Rutina eliminada · ajustar semana' : 'Descanso')}
                  </Text>
                  {routine ? (
                    <Text variant="caption" dim>
                      {completed
                        ? 'Completada'
                        : primaryGroups(routine.items, store.exercises).join(' · ')}
                    </Text>
                  ) : null}
                </View>
                {routine ? (
                  <Ionicons
                    name={completed ? 'checkmark-circle' : 'chevron-forward'}
                    size={20}
                    color={completed ? c.success : c.textDim}
                  />
                ) : null}
              </Row>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
