import { View, type ViewProps } from 'react-native';

import { colors, radius, shadow } from '@/theme';

type Props = ViewProps & {
  /** Add the soft floating shadow (default true). */
  elevated?: boolean;
};

/** White rounded surface used for cards across the app. */
export function Card({ elevated = true, style, ...rest }: Props) {
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: colors.card,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
        },
        elevated && shadow,
        style,
      ]}
    />
  );
}
