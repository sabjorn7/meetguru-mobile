import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Card, PillButton, SegmentedTabs, TextField } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthContext';
import { fetchProfile } from '@/features/profile/api';
import {
  canStream,
  createBackingCourse,
  createStream,
  type Stream,
} from '@/features/streams/api';
import { createLive, type LiveCredentials } from '@/features/streams/peertubeLive';
import { errorMessage } from '@/lib/errors';
import { colors, radius, spacing } from '@/theme';

const DURATIONS = [
  { value: '1', label: '1 мес.' },
  { value: '3', label: '3 мес.' },
  { value: '6', label: '6 мес.' },
  { value: '12', label: '12 мес.' },
];

export default function NewStreamScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [roleChecked, setRoleChecked] = useState(false);
  const [allowed, setAllowed] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [paid, setPaid] = useState<'free' | 'paid'>('free');
  const [price, setPrice] = useState('');
  const [months, setMonths] = useState('3');
  const [submitting, setSubmitting] = useState(false);

  const [created, setCreated] = useState<{ stream: Stream; creds: LiveCredentials } | null>(null);
  const [revealKey, setRevealKey] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const profile = user ? await fetchProfile(user.id).catch(() => null) : null;
      if (!mounted) return;
      setAllowed(canStream(profile?.role));
      setRoleChecked(true);
    })();
    return () => {
      mounted = false;
    };
  }, [user]);

  async function handleCreate() {
    if (!user) return;
    const name = title.trim();
    if (!name) {
      Alert.alert('Проверьте форму', 'Введите название эфира.');
      return;
    }
    const priceValue = paid === 'paid' ? Math.round(Number(price)) : 0;
    if (paid === 'paid' && (!priceValue || priceValue <= 0)) {
      Alert.alert('Проверьте форму', 'Введите цену эфира.');
      return;
    }

    setSubmitting(true);
    try {
      // 1) create the PeerTube live (gives us the video uuid + OBS creds)
      const live = await createLive({ name, description: description.trim() });

      // 2) paid streams get a hidden backing course (draft, out of catalog) for the
      //    untouched BuyCourse pipeline to grant access on purchase.
      let backingCourseId: string | null = null;
      const accessMonths = paid === 'paid' ? Number(months) : null;
      if (paid === 'paid') {
        backingCourseId = await createBackingCourse({
          owner: user.id,
          title: name,
          price: priceValue,
          months: Number(months),
        });
      }

      // 3) the streams metadata row
      const stream = await createStream({
        author: user.id,
        title: name,
        description: description.trim(),
        price: priceValue,
        peertube_video_id: live.video.uuid,
        access_months: accessMonths,
        backing_course_id: backingCourseId,
      });
      if (!stream) throw new Error('Эфир создан, но строка не вернулась.');

      setCreated({
        stream,
        creds: { rtmpUrl: live.rtmpUrl, rtmpsUrl: live.rtmpsUrl, streamKey: live.streamKey },
      });
    } catch (e) {
      Alert.alert('Ошибка', errorMessage(e, 'Не удалось создать эфир.'));
    } finally {
      setSubmitting(false);
    }
  }

  if (!roleChecked) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: 'Создать эфир' }} />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!allowed) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: 'Создать эфир' }} />
        <AppText variant="body" style={{ color: colors.muted, textAlign: 'center' }}>
          Создавать эфиры могут спикеры и учебные заведения.
        </AppText>
      </View>
    );
  }

  // ---- Success state: show OBS creds + link to the created stream ----
  if (created) {
    return (
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: spacing.xxl + insets.bottom }]}
      >
        <Stack.Screen options={{ title: 'Эфир создан' }} />
        <View style={styles.successHead}>
          <Ionicons name="checkmark-circle" size={28} color={colors.success} />
          <AppText variant="h2" style={{ flex: 1 }}>
            Эфир создан
          </AppText>
        </View>
        <AppText variant="body" style={{ color: colors.muted }}>
          Настройте OBS по данным ниже, нажмите «Начать трансляцию» в OBS, затем откройте эфир и
          нажмите «Я в эфире».
        </AppText>

        <Card style={styles.credsBox} elevated>
          <AppText variant="label">RTMP-сервер</AppText>
          <AppText variant="bodyMedium" selectable style={styles.mono}>
            {created.creds.rtmpUrl ?? '—'}
          </AppText>
          <View style={styles.keyHeader}>
            <AppText variant="label">Ключ трансляции</AppText>
            <AppText
              variant="label"
              style={{ color: colors.primary }}
              onPress={() => setRevealKey((v) => !v)}
            >
              {revealKey ? 'Скрыть' : 'Показать'}
            </AppText>
          </View>
          <AppText variant="bodyMedium" selectable style={styles.mono}>
            {revealKey ? created.creds.streamKey ?? '—' : '••••••••••••••••'}
          </AppText>
          <AppText variant="caption" style={{ color: colors.faint }}>
            Удерживайте значение, чтобы скопировать.
          </AppText>
        </Card>

        <PillButton
          label="Открыть эфир"
          onPress={() => router.replace(`/streams/${created.stream.id}`)}
        />
      </ScrollView>
    );
  }

  // ---- Form ----
  return (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingBottom: spacing.xxl + insets.bottom }]}
      keyboardShouldPersistTaps="handled"
    >
      <Stack.Screen options={{ title: 'Создать эфир' }} />

      <TextField
        label="Название"
        value={title}
        onChangeText={setTitle}
        placeholder="Название эфира"
      />
      <TextField
        label="Описание"
        value={description}
        onChangeText={setDescription}
        placeholder="О чём эфир (необязательно)"
        multiline
      />

      <View style={styles.field}>
        <AppText variant="label" style={{ color: colors.muted }}>
          Доступ
        </AppText>
        <SegmentedTabs
          options={[
            { value: 'free', label: 'Бесплатно' },
            { value: 'paid', label: 'Платно' },
          ]}
          value={paid}
          onChange={(v) => setPaid(v as 'free' | 'paid')}
        />
      </View>

      {paid === 'paid' ? (
        <>
          <TextField
            label="Цена, ₽"
            value={price}
            onChangeText={setPrice}
            placeholder="0"
            keyboardType="number-pad"
          />
          <View style={styles.field}>
            <AppText variant="label" style={{ color: colors.muted }}>
              Доступ к записи
            </AppText>
            <SegmentedTabs options={DURATIONS} value={months} onChange={setMonths} />
          </View>
        </>
      ) : null}

      <PillButton label="Создать эфир" onPress={handleCreate} loading={submitting} />
      <AppText variant="caption" style={{ color: colors.faint, textAlign: 'center' }}>
        Будет создана онлайн-трансляция на PeerTube. Данные для OBS покажутся после создания.
      </AppText>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    backgroundColor: colors.bg,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.bg,
  },
  field: {
    gap: spacing.sm,
  },
  successHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  credsBox: {
    gap: spacing.xs,
    padding: spacing.lg,
  },
  keyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  mono: {
    color: colors.ink,
  },
});
