import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { colors, fonts, radius, spacing } from '@/theme';

import { AppText } from './AppText';

type Props = TextInputProps & {
  label?: string;
};

/** Themed text input (Raleway, rounded, card background). */
export function TextField({ label, style, multiline, ...rest }: Props) {
  return (
    <View style={styles.group}>
      {label ? (
        <AppText variant="label" style={styles.label}>
          {label}
        </AppText>
      ) : null}
      <TextInput
        {...rest}
        multiline={multiline}
        placeholderTextColor={colors.faint}
        style={[styles.input, multiline && styles.multiline, style]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: spacing.xs,
  },
  label: {
    color: colors.muted,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.ink,
  },
  multiline: {
    minHeight: 84,
    textAlignVertical: 'top',
  },
});
