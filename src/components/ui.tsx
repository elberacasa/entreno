import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text as RNText,
  TextInput,
  View,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { StorageBanner } from '@/components/storage-banner';

import { Fonts, Radius, Spacing, Tabular, elevation } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type TextVariant =
  | 'metric'
  | 'metricSm'
  | 'display'
  | 'title'
  | 'heading'
  | 'body'
  | 'label'
  | 'caption'
  | 'overline'
  | 'mono';

/**
 * Escala tipográfica: las cifras van muy grandes y muy pesadas porque son lo
 * que se lee de un vistazo entre series; el texto de apoyo se queda pequeño y
 * apagado para no competir.
 */
const TEXT_STYLES: Record<TextVariant, TextStyle> = {
  metric: { fontSize: 40, fontWeight: '800', letterSpacing: -1.6, ...Tabular },
  metricSm: { fontSize: 26, fontWeight: '800', letterSpacing: -0.9, ...Tabular },
  display: { fontSize: 32, fontWeight: '800', letterSpacing: -1 },
  title: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  heading: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  body: { fontSize: 15, fontWeight: '500' },
  label: { fontSize: 13, fontWeight: '700' },
  caption: { fontSize: 12, fontWeight: '600' },
  overline: { fontSize: 11, fontWeight: '800', letterSpacing: 1.1, textTransform: 'uppercase' },
  mono: { fontSize: 15, fontWeight: '600', fontFamily: Fonts.mono, ...Tabular },
};

export function Text({
  variant = 'body',
  dim,
  faint,
  accent,
  danger,
  success,
  center,
  style,
  ...rest
}: TextProps & {
  variant?: TextVariant;
  dim?: boolean;
  faint?: boolean;
  accent?: boolean;
  danger?: boolean;
  success?: boolean;
  center?: boolean;
}) {
  const c = useTheme();
  const color = danger
    ? c.danger
    : success
      ? c.success
      : accent
        ? c.accent
        : faint
          ? c.textFaint
          : dim
            ? c.textDim
            : c.text;

  return (
    <RNText
      {...rest}
      style={[TEXT_STYLES[variant], { color }, center && { textAlign: 'center' }, style]}
    />
  );
}

export function Screen({
  children,
  edges = ['top'],
  style,
}: {
  children?: React.ReactNode;
  edges?: readonly Edge[];
  style?: StyleProp<ViewStyle>;
}) {
  const c = useTheme();
  return (
    <SafeAreaView edges={edges} style={[{ flex: 1, backgroundColor: c.bg }, style]}>
      <StorageBanner />
      {children}
    </SafeAreaView>
  );
}

/** Cabecera grande de las pantallas de pestaña, con acción opcional a la derecha. */
export function ScreenTitle({
  title,
  overline,
  right,
}: {
  title: string;
  overline?: string;
  right?: React.ReactNode;
}) {
  return (
    <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end', minHeight: 44 }}>
      <View style={{ flex: 1, gap: Spacing.half }}>
        {overline ? (
          <Text variant="overline" faint>
            {overline}
          </Text>
        ) : null}
        <Text variant="display" numberOfLines={1}>
          {title}
        </Text>
      </View>
      {right}
    </Row>
  );
}

export function Card({
  style,
  tone = 'surface',
  raised,
  ...rest
}: ViewProps & { tone?: 'surface' | 'surface2' | 'accent'; raised?: boolean }) {
  const c = useTheme();
  const bg = { surface: c.surface, surface2: c.surface2, accent: c.accentSoft }[tone];

  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: bg,
          borderRadius: Radius.lg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: tone === 'accent' ? c.accentDim : c.border,
          padding: Spacing.four,
        },
        raised && elevation(2, c.shadow),
        style,
      ]}
    />
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  const c = useTheme();
  return <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: c.border }, style]} />;
}

export function Row({ style, gap = Spacing.three, ...rest }: ViewProps & { gap?: number }) {
  return (
    <View
      {...rest}
      style={[{ flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', gap }, style]}
    />
  );
}

/** Barra de progreso fina. `value` va de 0 a 1. */
export function ProgressBar({
  value,
  height = 4,
  color,
  track,
  style,
}: {
  value: number;
  height?: number;
  color?: string;
  track?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useTheme();
  const pct = Math.min(100, Math.max(0, value * 100));
  return (
    <View
      style={[
        {
          height,
          borderRadius: height / 2,
          backgroundColor: track ?? c.surface3,
          overflow: 'hidden',
        },
        style,
      ]}>
      <View
        style={{ width: `${pct}%`, height: '100%', backgroundColor: color ?? c.accent }}
      />
    </View>
  );
}

export function Badge({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'accent' | 'success' | 'danger';
}) {
  const c = useTheme();
  const fg = { neutral: c.textDim, accent: c.accent, success: c.success, danger: c.danger }[tone];
  const bg = {
    neutral: c.surface2,
    accent: c.accentSoft,
    success: c.surface2,
    danger: c.surface2,
  }[tone];

  return (
    <View
      style={{
        paddingHorizontal: Spacing.two,
        paddingVertical: 3,
        borderRadius: Radius.sm,
        backgroundColor: bg,
      }}>
      <RNText style={{ color: fg, fontSize: 11, fontWeight: '800', ...Tabular }}>{label}</RNText>
    </View>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  title,
  icon,
  variant = 'primary',
  small,
  loading,
  disabled,
  style,
  ...rest
}: PressableProps & {
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  variant?: ButtonVariant;
  small?: boolean;
  loading?: boolean;
}) {
  const c = useTheme();

  const bg = {
    primary: c.accent,
    secondary: c.surface2,
    ghost: 'transparent',
    danger: 'transparent',
  }[variant];

  const fg = {
    primary: c.onAccent,
    secondary: c.text,
    ghost: c.text,
    danger: c.danger,
  }[variant];

  return (
    <Pressable
      {...rest}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: Spacing.two,
          backgroundColor: bg,
          // Alto fijo: así los botones de una misma fila quedan siempre iguales
          // aunque uno de los textos sea más largo.
          height: small ? 38 : 50,
          paddingHorizontal: small ? Spacing.three : Spacing.four,
          borderRadius: small ? Radius.md : Radius.md,
          borderWidth: variant === 'ghost' || variant === 'danger' ? StyleSheet.hairlineWidth : 0,
          borderColor: variant === 'danger' ? c.danger : c.border,
          opacity: disabled ? 0.35 : pressed ? 0.7 : 1,
        },
        style as StyleProp<ViewStyle>,
      ]}>
      {loading ? (
        <ActivityIndicator color={fg} size="small" />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={small ? 15 : 18} color={fg} /> : null}
          {/* Una sola línea: si no cabe se encoge, nunca parte el botón en dos. */}
          <RNText
            numberOfLines={1}
            style={{
              color: fg,
              fontSize: small ? 13 : 15,
              fontWeight: '700',
              letterSpacing: -0.2,
              flexShrink: 1,
            }}>
            {title}
          </RNText>
        </>
      )}
    </Pressable>
  );
}

export function IconButton({
  name,
  size = 20,
  color,
  surface,
  style,
  ...rest
}: PressableProps & {
  name: keyof typeof Ionicons.glyphMap;
  size?: number;
  color?: string;
  /** Lo dibuja dentro de un círculo, para que se vea que se puede tocar. */
  surface?: boolean;
}) {
  const c = useTheme();
  return (
    <Pressable
      hitSlop={10}
      {...rest}
      style={({ pressed }) => [
        surface && {
          width: size + Spacing.four,
          height: size + Spacing.four,
          borderRadius: Radius.pill,
          backgroundColor: c.surface2,
          alignItems: 'center',
          justifyContent: 'center',
        },
        { opacity: pressed ? 0.5 : 1 },
        style as StyleProp<ViewStyle>,
      ]}>
      <Ionicons name={name} size={size} color={color ?? c.textDim} />
    </Pressable>
  );
}

export function Field({
  label,
  suffix,
  full,
  style,
  containerStyle,
  ...rest
}: TextInputProps & {
  label?: string;
  suffix?: string;
  /**
   * El campo ocupa su propia línea en lugar de repartirse el ancho con otros.
   *
   * Hace falta la prop porque en React Native `flex: 0` también pone
   * `flexBasis: 0`: usarlo para "que no crezca" colapsaba el campo a altura
   * cero y los campos se pisaban unos a otros.
   */
  full?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}) {
  const c = useTheme();
  return (
    <View
      style={[
        { gap: Spacing.two },
        full ? { alignSelf: 'stretch' } : { flex: 1 },
        containerStyle,
      ]}>
      {label ? (
        <Text variant="overline" faint>
          {label}
        </Text>
      ) : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: c.surface2,
          borderRadius: Radius.md,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: c.border,
          paddingHorizontal: Spacing.three,
        }}>
        <TextInput
          placeholderTextColor={c.textFaint}
          {...rest}
          style={[
            {
              flex: 1,
              minWidth: 0,
              color: c.text,
              fontSize: 16,
              fontWeight: '600',
              paddingVertical: Spacing.three,
            },
            style,
          ]}
        />
        {suffix ? (
          <Text variant="label" faint>
            {suffix}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  icon,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const c = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.one + 2,
        height: 34,
        paddingHorizontal: Spacing.three,
        borderRadius: Radius.pill,
        backgroundColor: selected ? c.accent : c.surface2,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: selected ? c.accent : c.border,
        opacity: pressed ? 0.7 : 1,
      })}>
      {icon ? (
        <Ionicons name={icon} size={14} color={selected ? c.onAccent : c.textDim} />
      ) : null}
      <RNText
        numberOfLines={1}
        style={{
          color: selected ? c.onAccent : c.textDim,
          fontSize: 13,
          fontWeight: '700',
        }}>
        {label}
      </RNText>
    </Pressable>
  );
}

/** Selector segmentado; para 2–4 opciones excluyentes cabe mejor que los chips. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const c = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: c.surface2,
        borderRadius: Radius.md,
        padding: 3,
        gap: 3,
      }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={({ pressed }) => ({
              flex: 1,
              height: 32,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: Radius.sm + 1,
              backgroundColor: active ? c.accent : 'transparent',
              opacity: pressed && !active ? 0.6 : 1,
            })}>
            <RNText
              numberOfLines={1}
              style={{
                color: active ? c.onAccent : c.textDim,
                fontSize: 13,
                fontWeight: '700',
              }}>
              {o.label}
            </RNText>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Una cifra grande con su unidad y su etiqueta. La unidad no roba peso al número. */
export function StatTile({
  label,
  value,
  unit,
  accent,
  size = 'md',
}: {
  label: string;
  value: string;
  unit?: string;
  accent?: boolean;
  size?: 'md' | 'lg';
}) {
  const c = useTheme();
  return (
    <View style={{ flex: 1, gap: Spacing.half }}>
      <Text
        variant={size === 'lg' ? 'metric' : 'metricSm'}
        accent={accent}
        numberOfLines={1}
        adjustsFontSizeToFit>
        {value}
        {unit ? (
          <RNText
            style={{
              fontSize: size === 'lg' ? 15 : 12,
              fontWeight: '700',
              color: c.textFaint,
              letterSpacing: 0,
            }}>
            {' '}
            {unit}
          </RNText>
        ) : null}
      </Text>
      <Text variant="caption" faint numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export function SectionHeader({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <Row
      style={{
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.one,
        marginTop: Spacing.two,
      }}>
      <Text variant="overline" faint numberOfLines={1} style={{ flex: 1 }}>
        {title}
      </Text>
      {action ? (
        <Pressable onPress={onAction} hitSlop={10}>
          <Text variant="label" accent>
            {action}
          </Text>
        </Pressable>
      ) : null}
    </Row>
  );
}

export function EmptyState({
  icon = 'barbell-outline',
  title,
  hint,
  action,
  onAction,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  hint?: string;
  action?: string;
  onAction?: () => void;
}) {
  const c = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.five }}>
      <View
        style={{
          width: 60,
          height: 60,
          borderRadius: Radius.pill,
          backgroundColor: c.surface2,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: c.border,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Ionicons name={icon} size={26} color={c.textFaint} />
      </View>
      <Text variant="heading" center>
        {title}
      </Text>
      {hint ? (
        <Text variant="body" dim center style={{ maxWidth: 300, lineHeight: 21 }}>
          {hint}
        </Text>
      ) : null}
      {action && onAction ? (
        <Button title={action} onPress={onAction} small style={{ marginTop: Spacing.one }} />
      ) : null}
    </View>
  );
}

/** Hoja modal que sube desde abajo, con cabecera y contenido scrolleable. */
export function Sheet({
  visible,
  onClose,
  title,
  children,
  footer,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const c = useTheme();
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: c.surface }}>
          <Row
            style={{
              justifyContent: 'space-between',
              paddingHorizontal: Spacing.four,
              paddingVertical: Spacing.three,
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: c.border,
            }}>
            <Text variant="title">{title}</Text>
            <IconButton name="close" size={22} surface onPress={onClose} />
          </Row>
        </SafeAreaView>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            padding: Spacing.four,
            gap: Spacing.three,
            paddingBottom: Spacing.seven,
          }}>
          {children}
        </ScrollView>
        {footer ? (
          <SafeAreaView edges={['bottom']} style={{ backgroundColor: c.surface }}>
            <View
              style={{
                padding: Spacing.four,
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: c.border,
              }}>
              {footer}
            </View>
          </SafeAreaView>
        ) : null}
      </View>
    </Modal>
  );
}
