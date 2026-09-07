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

import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type TextVariant = 'display' | 'title' | 'heading' | 'body' | 'label' | 'caption' | 'mono';

const TEXT_STYLES: Record<TextVariant, TextStyle> = {
  display: { fontSize: 34, fontWeight: '800', letterSpacing: -0.8 },
  title: { fontSize: 24, fontWeight: '700', letterSpacing: -0.4 },
  heading: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  body: { fontSize: 15, fontWeight: '500' },
  label: { fontSize: 13, fontWeight: '600' },
  caption: { fontSize: 12, fontWeight: '600', letterSpacing: 0.2 },
  mono: { fontSize: 15, fontWeight: '600', fontFamily: Fonts.mono },
};

export function Text({
  variant = 'body',
  dim,
  accent,
  danger,
  center,
  style,
  ...rest
}: TextProps & {
  variant?: TextVariant;
  dim?: boolean;
  accent?: boolean;
  danger?: boolean;
  center?: boolean;
}) {
  const c = useTheme();
  const color = danger ? c.danger : accent ? c.accent : dim ? c.textDim : c.text;
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
      {children}
    </SafeAreaView>
  );
}

export function Card({ style, tone = 'surface', ...rest }: ViewProps & { tone?: 'surface' | 'surface2' }) {
  const c = useTheme();
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: tone === 'surface' ? c.surface : c.surface2,
          borderRadius: Radius.lg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: c.border,
          padding: Spacing.four,
        },
        style,
      ]}
    />
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  const c = useTheme();
  return (
    <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: c.border }, style]} />
  );
}

export function Row({ style, gap = Spacing.three, ...rest }: ViewProps & { gap?: number }) {
  return (
    <View
      {...rest}
      style={[{ flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', gap }, style]}
    />
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
          paddingVertical: small ? Spacing.two + 2 : Spacing.three + 2,
          paddingHorizontal: small ? Spacing.three : Spacing.four,
          borderRadius: Radius.md,
          borderWidth: variant === 'ghost' || variant === 'danger' ? StyleSheet.hairlineWidth : 0,
          borderColor: variant === 'danger' ? c.danger : c.border,
          opacity: disabled ? 0.4 : pressed ? 0.75 : 1,
        },
        style as StyleProp<ViewStyle>,
      ]}>
      {loading ? (
        <ActivityIndicator color={fg} size="small" />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={small ? 15 : 17} color={fg} /> : null}
          <RNText style={{ color: fg, fontSize: small ? 14 : 15, fontWeight: '700' }}>
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
  style,
  ...rest
}: PressableProps & {
  name: keyof typeof Ionicons.glyphMap;
  size?: number;
  color?: string;
}) {
  const c = useTheme();
  return (
    <Pressable
      hitSlop={8}
      {...rest}
      style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1 }, style as StyleProp<ViewStyle>]}>
      <Ionicons name={name} size={size} color={color ?? c.textDim} />
    </Pressable>
  );
}

export function Field({
  label,
  suffix,
  style,
  containerStyle,
  ...rest
}: TextInputProps & {
  label?: string;
  suffix?: string;
  containerStyle?: StyleProp<ViewStyle>;
}) {
  const c = useTheme();
  return (
    <View style={[{ gap: Spacing.one, flex: 1 }, containerStyle]}>
      {label ? (
        <Text variant="caption" dim style={{ textTransform: 'uppercase' }}>
          {label}
        </Text>
      ) : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: c.surface2,
          borderRadius: Radius.sm,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: c.border,
          paddingHorizontal: Spacing.three,
        }}>
        <TextInput
          placeholderTextColor={c.textDim}
          {...rest}
          style={[
            {
              flex: 1,
              color: c.text,
              fontSize: 16,
              fontWeight: '600',
              paddingVertical: Spacing.three,
            },
            style,
          ]}
        />
        {suffix ? (
          <Text variant="caption" dim>
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
  tone,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  tone?: string;
}) {
  const c = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        paddingVertical: Spacing.two,
        paddingHorizontal: Spacing.three,
        borderRadius: Radius.pill,
        backgroundColor: selected ? c.accent : c.surface2,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: selected ? c.accent : c.border,
        opacity: pressed ? 0.7 : 1,
      })}>
      <RNText
        style={{
          color: selected ? c.onAccent : (tone ?? c.textDim),
          fontSize: 13,
          fontWeight: '700',
        }}>
        {label}
      </RNText>
    </Pressable>
  );
}

export function StatTile({
  label,
  value,
  unit,
  accent,
}: {
  label: string;
  value: string;
  unit?: string;
  accent?: boolean;
}) {
  const c = useTheme();
  return (
    <View style={{ flex: 1, gap: Spacing.half }}>
      <RNText
        numberOfLines={1}
        style={{ fontSize: 22, fontWeight: '800', color: accent ? c.accent : c.text }}>
        {value}
        {unit ? (
          <RNText style={{ fontSize: 13, fontWeight: '700', color: c.textDim }}> {unit}</RNText>
        ) : null}
      </RNText>
      <Text variant="caption" dim numberOfLines={1}>
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
    <Row style={{ justifyContent: 'space-between', paddingHorizontal: Spacing.one }}>
      <Text variant="caption" dim style={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>
        {title}
      </Text>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text variant="caption" accent>
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
    <View style={{ alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.six }}>
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: Radius.pill,
          backgroundColor: c.surface2,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Ionicons name={icon} size={26} color={c.textDim} />
      </View>
      <Text variant="heading" center>
        {title}
      </Text>
      {hint ? (
        <Text variant="body" dim center style={{ maxWidth: 280 }}>
          {hint}
        </Text>
      ) : null}
      {action && onAction ? <Button title={action} onPress={onAction} small /> : null}
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
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
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
            <Text variant="heading">{title}</Text>
            <IconButton name="close" size={24} onPress={onClose} />
          </Row>
        </SafeAreaView>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: Spacing.four, gap: Spacing.three, paddingBottom: Spacing.seven }}>
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
