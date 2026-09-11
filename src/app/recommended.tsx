import { Stack, router } from 'expo-router';
import { ScrollView } from 'react-native';
import { IconButton, Screen } from '@/components/ui';
import { WeeklyPlanner } from '@/components/weekly-planner';
import { useStore } from '@/lib/store';

export default function RecommendedScreen() {
  const store = useStore();
  return (
    <Screen edges={[]}>
      <Stack.Screen
        options={{
          title: 'Crear mi semana',
          headerLeft: () => (
            <IconButton
              name="arrow-back"
              accessibilityLabel="Volver"
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            />
          ),
        }}
      />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
        {store.ready ? <WeeklyPlanner /> : null}
      </ScrollView>
    </Screen>
  );
}
