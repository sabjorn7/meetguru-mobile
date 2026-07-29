import { Text, type TextProps } from 'react-native';

import { text, type TextVariant } from '@/theme';

type Props = TextProps & {
  variant?: TextVariant;
};

/** Text with a typography preset (Raleway family + size/color). */
export function AppText({ variant = 'body', style, ...rest }: Props) {
  return <Text {...rest} style={[text[variant], style]} />;
}
