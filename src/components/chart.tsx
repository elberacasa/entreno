import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Row, Text } from '@/components/ui';

export interface Point {
  label: string;
  value: number;
}

const PAD = 6;

function scale(values: number[], height: number) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  // Un poco de aire arriba y abajo; si todo es igual, centramos la línea.
  const span = max - min || Math.abs(max) || 1;
  const lo = min - span * 0.15;
  const hi = max + span * 0.15;
  return {
    max,
    min,
    y: (v: number) => PAD + (1 - (v - lo) / (hi - lo)) * (height - PAD * 2),
  };
}

/** Gráfico de línea con área, pensado para series cortas (8–30 puntos). */
export function LineChart({
  data,
  height = 140,
  width = 320,
  suffix = '',
  format,
}: {
  data: Point[];
  height?: number;
  width?: number;
  suffix?: string;
  format?: (v: number) => string;
}) {
  const c = useTheme();
  const fmt = format ?? ((v: number) => String(Math.round(v * 10) / 10));

  if (data.length === 0) return null;

  const values = data.map((d) => d.value);
  const { max, min, y } = scale(values, height);
  const step = data.length > 1 ? (width - PAD * 2) / (data.length - 1) : 0;
  const x = (i: number) => PAD + i * step;

  const line = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`)
    .join(' ');

  const area =
    data.length > 1
      ? `${line} L${x(data.length - 1).toFixed(1)},${height} L${x(0).toFixed(1)},${height} Z`
      : '';

  return (
    <View style={{ gap: Spacing.two }}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={c.accent} stopOpacity="0.28" />
            <Stop offset="1" stopColor={c.accent} stopOpacity="0" />
          </LinearGradient>
        </Defs>

        {area ? <Path d={area} fill="url(#fade)" /> : null}
        {data.length > 1 ? (
          <Path d={line} stroke={c.accent} strokeWidth={2.5} fill="none" strokeLinejoin="round" />
        ) : null}

        {data.map((d, i) => (
          <Circle
            key={i}
            cx={x(i)}
            cy={y(d.value)}
            r={i === data.length - 1 ? 4.5 : 2.5}
            fill={i === data.length - 1 ? c.accent : c.surface}
            stroke={c.accent}
            strokeWidth={2}
          />
        ))}
      </Svg>

      <Row style={{ justifyContent: 'space-between' }}>
        <Text variant="caption" dim>
          {data[0].label}
        </Text>
        <Text variant="caption" dim>
          {min === max ? `${fmt(max)} ${suffix}` : `${fmt(min)} – ${fmt(max)} ${suffix}`}
        </Text>
        <Text variant="caption" dim>
          {data[data.length - 1].label}
        </Text>
      </Row>
    </View>
  );
}

/** Barras verticales, para totales por semana. */
export function BarChart({
  data,
  height = 120,
  width = 320,
  suffix = '',
}: {
  data: Point[];
  height?: number;
  width?: number;
  suffix?: string;
}) {
  const c = useTheme();
  if (data.length === 0) return null;

  const max = Math.max(...data.map((d) => d.value), 1);
  const slot = width / data.length;
  const barW = Math.max(6, Math.min(28, slot * 0.55));

  return (
    <View style={{ gap: Spacing.two }}>
      <Svg width={width} height={height}>
        {data.map((d, i) => {
          const h = Math.max(d.value > 0 ? 3 : 0, (d.value / max) * (height - 4));
          const isLast = i === data.length - 1;
          return (
            <Rect
              key={i}
              x={i * slot + (slot - barW) / 2}
              y={height - h}
              width={barW}
              height={h}
              rx={3}
              fill={isLast ? c.accent : c.border}
            />
          );
        })}
      </Svg>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text variant="caption" dim>
          {data[0].label}
        </Text>
        <Text variant="caption" dim>
          máx {Math.round(max)} {suffix}
        </Text>
        <Text variant="caption" dim>
          {data[data.length - 1].label}
        </Text>
      </Row>
    </View>
  );
}
