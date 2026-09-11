import React from 'react';
import { View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

import { Row, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface Point {
  label: string;
  value: number;
}

const PAD_Y = 10;
/** Carril de la derecha reservado para las etiquetas del eje. */
const AXIS_W = 44;

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
    y: (v: number) => PAD_Y + (1 - (v - lo) / (hi - lo)) * (height - PAD_Y * 2),
  };
}

/** Gráfico de línea con área, pensado para series cortas (8–30 puntos). */
export function LineChart({
  data,
  height = 150,
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

  const plotW = Math.max(40, width - AXIS_W);
  const values = data.map((d) => d.value);
  const { max, min, y } = scale(values, height);
  const step = data.length > 1 ? (plotW - PAD_Y * 2) / (data.length - 1) : 0;
  const x = (i: number) => PAD_Y + i * step;

  const line = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`)
    .join(' ');

  const area =
    data.length > 1
      ? `${line} L${x(data.length - 1).toFixed(1)},${height} L${x(0).toFixed(1)},${height} Z`
      : '';

  // Tres referencias: máximo, punto medio y mínimo de la serie.
  const guides = min === max ? [max] : [max, (max + min) / 2, min];

  return (
    <View style={{ gap: Spacing.two }}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={c.accent} stopOpacity="0.3" />
            <Stop offset="1" stopColor={c.accent} stopOpacity="0" />
          </LinearGradient>
        </Defs>

        {guides.map((v, i) => (
          <React.Fragment key={i}>
            <Line
              x1={0}
              x2={plotW}
              y1={y(v)}
              y2={y(v)}
              stroke={c.border}
              strokeWidth={1}
              strokeDasharray="3 5"
            />
            <SvgText
              x={width}
              y={y(v) + 3.5}
              fill={c.textFaint}
              fontSize={10}
              fontWeight="700"
              textAnchor="end"
            >
              {fmt(v)}
            </SvgText>
          </React.Fragment>
        ))}

        {area ? <Path d={area} fill="url(#fade)" /> : null}
        {data.length > 1 ? (
          <Path
            d={line}
            stroke={c.accent}
            strokeWidth={2.5}
            fill="none"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ) : null}

        {data.map((d, i) => {
          const isLast = i === data.length - 1;
          return (
            <Circle
              key={i}
              cx={x(i)}
              cy={y(d.value)}
              r={isLast ? 5 : 2.5}
              fill={isLast ? c.accent : c.surface}
              stroke={c.accent}
              strokeWidth={2}
            />
          );
        })}
      </Svg>

      <Row style={{ justifyContent: 'space-between' }}>
        <Text variant="caption" faint>
          {data[0].label}
        </Text>
        <Text variant="caption" dim>
          {min === max ? fmt(max) : `${fmt(min)} – ${fmt(max)}`} {suffix}
        </Text>
        <Text variant="caption" faint>
          {data[data.length - 1].label}
        </Text>
      </Row>
    </View>
  );
}

/** Barras verticales, para totales por semana. */
export function BarChart({
  data,
  height = 130,
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
  if (data.length === 0) return null;

  const fmt = format ?? ((v: number) => String(Math.round(v)));
  const plotW = Math.max(40, width - AXIS_W);
  const dataMax = Math.max(...data.map((d) => d.value), 0);
  const max = Math.max(dataMax, 1);
  const slot = plotW / data.length;
  const barW = Math.max(6, Math.min(30, slot * 0.6));
  const top = 12;

  return (
    <View style={{ gap: Spacing.two }}>
      <Svg width={width} height={height}>
        {/* Techo y suelo, para que las barras tengan contra qué medirse. */}
        {[
          { v: max, y: top },
          { v: max / 2, y: top + (height - top) / 2 },
        ].map((g, i) => (
          <React.Fragment key={i}>
            <Line
              x1={0}
              x2={plotW}
              y1={g.y}
              y2={g.y}
              stroke={c.border}
              strokeWidth={1}
              strokeDasharray="3 5"
            />
            <SvgText
              x={width}
              y={g.y + 3.5}
              fill={c.textFaint}
              fontSize={10}
              fontWeight="700"
              textAnchor="end"
            >
              {fmt(g.v)}
            </SvgText>
          </React.Fragment>
        ))}
        <Line x1={0} x2={plotW} y1={height} y2={height} stroke={c.border} strokeWidth={1} />

        {data.map((d, i) => {
          const h = d.value > 0 ? Math.max(3, (d.value / max) * (height - top)) : 0;
          const isLast = i === data.length - 1;
          return (
            <Rect
              key={i}
              x={i * slot + (slot - barW) / 2}
              y={height - h}
              width={barW}
              height={h}
              rx={4}
              // La semana en curso destaca; las anteriores son el contexto.
              fill={isLast ? c.accent : c.surface3}
            />
          );
        })}
      </Svg>

      <Row style={{ justifyContent: 'space-between' }}>
        <Text variant="caption" faint>
          {data[0].label}
        </Text>
        <Text variant="caption" dim>
          máx {fmt(dataMax)} {suffix}
        </Text>
        <Text variant="caption" faint>
          {data[data.length - 1].label}
        </Text>
      </Row>
    </View>
  );
}
