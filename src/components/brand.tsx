import React from 'react';
import { View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';

/** Keep paths in sync with public/brand/abenzagym-mark.svg. */
export function BrandMark({ size = 40, color }: { size?: number; color?: string }) {
  const c = useTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" accessibilityLabel="AbenzaGym" role="img">
      <G id="stance-left" fill={color ?? c.accent}>
        <Path d="M13 101 49 19h23l-36 82z" />
      </G>
      <G id="stance-right" fill={color ?? c.accent}>
        <Path d="m76 35 32 66H83L64 58z" />
      </G>
      <G id="lifting-bar" fill={color ?? c.accent}>
        <Path d="M39 76h46v13H39z" />
      </G>
    </Svg>
  );
}

export function Brand() {
  return (
    <View
      accessibilityLabel="AbenzaGym"
      style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
    >
      <BrandMark size={36} />
      <Text variant="title" style={{ fontSize: 29, letterSpacing: -0.4 }}>
        AbenzaGym
      </Text>
    </View>
  );
}
