import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Svg, { Rect, Line } from 'react-native-svg';
import { Card, Chip, Field, Row, Screen, SectionHeader, Text } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { num, parseNum, toDisplayWeight } from '@/lib/format';
import { plateLoad, PLATES } from '@/lib/training-insights';
import { useStore } from '@/lib/store';

export default function TrainingTools() {
  const c = useTheme();
  const { settings } = useStore();
  const params = useLocalSearchParams<{ weight?: string }>();
  const unit = settings.unit;
  const [target, setTarget] = useState(() =>
    params.weight ? String(toDisplayWeight(Number(params.weight), unit)) : '',
  );
  const [bar, setBar] = useState(unit === 'kg' ? '20' : '45');
  const [plates, setPlates] = useState<number[]>([...PLATES[unit]]);
  const result = useMemo(() => {
    const total = parseNum(target);
    const emptyBar = parseNum(bar);
    return total != null && emptyBar != null ? plateLoad(total, emptyBar, plates) : null;
  }, [target, bar, plates]);
  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: 'Discos para tu barra' }} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 24, gap: 24, paddingBottom: 48 }}
      >
        <View style={{ gap: 8 }}>
          <Text variant="display">Carga sin cuentas.</Text>
          <Text dim>
            Introduce el peso total, incluida la barra. Te mostramos qué colocar a cada lado.
          </Text>
        </View>
        <Row style={{ alignItems: 'flex-start' }}>
          <Field
            label="Peso total"
            value={target}
            onChangeText={setTarget}
            keyboardType="decimal-pad"
            placeholder={unit === 'kg' ? 'Ej. 80' : 'Ej. 135'}
            suffix={unit}
            containerStyle={{ flex: 1 }}
          />
          <Field
            label="Barra vacía"
            value={bar}
            onChangeText={setBar}
            keyboardType="decimal-pad"
            suffix={unit}
            containerStyle={{ flex: 1 }}
          />
        </Row>
        <View style={{ gap: 12 }}>
          <SectionHeader title="Discos disponibles" />
          <Text variant="caption" dim>
            Selecciona los tamaños que tienes. Se asumen pares suficientes de cada tamaño.
          </Text>
          <Row style={{ flexWrap: 'wrap' }} gap={8}>
            {PLATES[unit].map((plate) => (
              <Chip
                key={plate}
                label={`${num(plate)} ${unit}`}
                selected={plates.includes(plate)}
                onPress={() =>
                  setPlates((current) =>
                    current.includes(plate)
                      ? current.filter((p) => p !== plate)
                      : [...current, plate],
                  )
                }
              />
            ))}
          </Row>
        </View>
        {result ? (
          <Card style={{ padding: 24, gap: 20 }}>
            <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <View>
                <Text variant="caption" dim>
                  Total montado
                </Text>
                <Text variant="metric">
                  {num(result.total)} <Text variant="heading">{unit}</Text>
                </Text>
              </View>
              <Text variant="caption" style={{ color: result.exact ? c.success : c.warn }}>
                {result.exact ? 'Carga exacta' : 'Aproximación inferior'}
              </Text>
            </Row>
            <Svg
              height={110}
              width="100%"
              viewBox="0 0 340 110"
              role="img"
              accessibilityLabel={`Barra con ${num(result.perSide)} ${unit} en cada lado`}
            >
              <Line
                x1={8}
                y1={55}
                x2={332}
                y2={55}
                stroke={c.borderStrong}
                strokeWidth={10}
                strokeLinecap="round"
              />
              <Rect x={142} y={50} width={56} height={10} rx={4} fill={c.textDim} />
              {result.plates.slice(0, 6).map((plate, index) => {
                const height = 34 + (plate.weight / PLATES[unit][0]) * 55;
                return (
                  <React.Fragment key={plate.weight}>
                    <Rect
                      x={112 - index * 17}
                      y={55 - height / 2}
                      width={13}
                      height={height}
                      rx={4}
                      fill={index % 2 ? c.accentDim : c.accent}
                    />
                    <Rect
                      x={215 + index * 17}
                      y={55 - height / 2}
                      width={13}
                      height={height}
                      rx={4}
                      fill={index % 2 ? c.accentDim : c.accent}
                    />
                  </React.Fragment>
                );
              })}
            </Svg>
            <Text variant="heading">
              En cada lado: {num(result.perSide)} {unit}
            </Text>
            {result.plates.length ? (
              result.plates.map((plate) => (
                <Row key={plate.weight} style={{ justifyContent: 'space-between' }}>
                  <Text>
                    {plate.quantity} × disco de {num(plate.weight)} {unit}
                  </Text>
                  <Text variant="caption" dim>
                    {num(plate.quantity * plate.weight)} {unit}
                  </Text>
                </Row>
              ))
            ) : (
              <Text dim>Solo la barra, sin discos.</Text>
            )}
            {!result.exact ? (
              <Text style={{ color: c.warn }}>
                Con estos tamaños no se puede montar {target} {unit}. La propuesta se queda por
                debajo; no cambia lo registrado en tu sesión.
              </Text>
            ) : null}
            <Text variant="caption" dim>
              El dibujo muestra los tamaños. Usa las cantidades de la lista en ambos lados.
            </Text>
          </Card>
        ) : (
          <Card style={{ gap: 8 }}>
            <Text variant="heading">
              {target ? 'Revisa el peso' : 'Lista para tu siguiente serie'}
            </Text>
            <Text dim>
              {target
                ? 'El total debe ser al menos el peso de la barra, con un máximo de 1.000. Usa valores positivos.'
                : 'Añade un peso total para ver la combinación de discos.'}
            </Text>
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}
