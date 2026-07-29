import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, type ViewStyle } from 'react-native';

import { colors, radius } from '@/theme';

type IoniconName = keyof typeof Ionicons.glyphMap;

type Props = {
  name: IoniconName;
  onPress?: () => void;
  size?: number;
  color?: string;
  /** Filled tinted circle vs outlined white circle. */
  variant?: 'outline' | 'tinted';
  style?: ViewStyle;
};

/** Circular icon button (outlined or tinted) — headers, favorites, back. */
export function IconButton({
  name,
  onPress,
  size = 20,
  color = colors.ink,
  variant = 'outline',
  style,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.base,
        variant === 'tinted' ? styles.tinted : styles.outline,
        pressed && styles.pressed,
        style,
      ]}
    >
      <Ionicons name={name} size={size} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outline: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  tinted: {
    backgroundColor: colors.primarySoft,
  },
  pressed: {
    opacity: 0.6,
  },
});
