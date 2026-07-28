import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

type Props = {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  size?: number;
};

/** A row of five tappable stars for selecting a 1–5 rating. */
export function RatingInput({ value, onChange, disabled, size = 32 }: Props) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Pressable
          key={star}
          onPress={() => onChange(star)}
          disabled={disabled}
          hitSlop={4}
          style={styles.star}
        >
          <Ionicons
            name={star <= value ? 'star' : 'star-outline'}
            size={size}
            color={star <= value ? '#f59e0b' : '#cbd5e1'}
          />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 6,
  },
  star: {
    padding: 2,
  },
});
