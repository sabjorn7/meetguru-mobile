import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { AppText, Card, SegmentedTabs } from '@/components/ui';
import type { Purchase, Sale } from '@/features/finance/api';
import { useFinance } from '@/features/finance/useFinance';
import { colors, radius, spacing } from '@/theme';

const money = new Intl.NumberFormat('ru-RU');
const dateFmt = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });

function formatMoney(value: number): string {
  return `${money.format(Math.round(value))} ₽`;
}
function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : dateFmt.format(d);
}

type Tab = 'purchases' | 'sales';

function Tag({ label, tone }: { label: string; tone: 'muted' | 'success' | 'danger' }) {
  const color = tone === 'success' ? colors.success : tone === 'danger' ? colors.danger : colors.muted;
  const bg = tone === 'success' ? '#dcfce7' : tone === 'danger' ? '#fef2f2' : colors.primarySoft;
  return (
    <View style={[styles.tag, { backgroundColor: bg }]}>
      <AppText variant="label" style={{ color }}>
        {label}
      </AppText>
    </View>
  );
}

function PurchaseRow({ item }: { item: Purchase }) {
  return (
    <Card style={styles.row}>
      <View style={styles.iconCircle}>
        <Ionicons name="bag-handle" size={18} color={colors.primary} />
      </View>
      <View style={styles.body}>
        <AppText variant="bodyMedium" numberOfLines={2} style={{ color: colors.ink }}>
          {item.label ?? (item.subscription ? 'Подписка' : 'Покупка курса')}
        </AppText>
        <AppText variant="caption" style={{ color: colors.faint }}>
          {formatDate(item.createdAt)}
        </AppText>
      </View>
      <View style={styles.right}>
        <AppText variant="subtitle" style={{ color: colors.ink }}>
          {formatMoney(item.summ)}
        </AppText>
        <Tag
          label={item.paid ? 'Оплачен' : 'Ожидает'}
          tone={item.paid ? 'success' : 'muted'}
        />
      </View>
    </Card>
  );
}

function SaleRow({ item }: { item: Sale }) {
  return (
    <Card style={styles.row}>
      <View style={styles.iconCircle}>
        <Ionicons name="cash" size={18} color={colors.primary} />
      </View>
      <View style={styles.body}>
        <AppText variant="bodyMedium" numberOfLines={2} style={{ color: colors.ink }}>
          {item.name}
        </AppText>
        <AppText variant="caption" style={{ color: colors.faint }}>
          {formatDate(item.createdAt)}
          {item.category ? ` · ${item.category}` : ''}
        </AppText>
      </View>
      <View style={styles.right}>
        <AppText variant="subtitle" style={{ color: item.refund ? colors.danger : colors.success }}>
          {item.refund ? '−' : '+'}
          {formatMoney(item.amount)}
        </AppText>
        {item.refund ? <Tag label="Возврат" tone="danger" /> : null}
      </View>
    </Card>
  );
}

export default function FinanceScreen() {
  const { balance, purchases, sales, loading, refreshing, error, refresh } = useFinance();
  const [tab, setTab] = useState<Tab>('purchases');

  if (loading) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: 'Финансы' }} />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const isPurchases = tab === 'purchases';
  const data: (Purchase | Sale)[] = isPurchases ? purchases : sales;

  const header = (
    <View style={styles.header}>
      {balance > 0 ? (
        <Card style={styles.balanceCard} elevated>
          <AppText variant="caption" style={{ color: colors.muted }}>
            Баланс
          </AppText>
          <AppText variant="h1" style={{ color: colors.primary }}>
            {formatMoney(balance)}
          </AppText>
        </Card>
      ) : null}

      <SegmentedTabs
        options={[
          { value: 'purchases', label: `Покупки${purchases.length ? ` (${purchases.length})` : ''}` },
          { value: 'sales', label: `Продажи${sales.length ? ` (${sales.length})` : ''}` },
        ]}
        value={tab}
        onChange={setTab}
      />

      {error ? (
        <AppText variant="caption" style={{ color: colors.danger }}>
          {error}
        </AppText>
      ) : null}
    </View>
  );

  return (
    <FlatList
      data={data}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) =>
        isPurchases ? (
          <PurchaseRow item={item as Purchase} />
        ) : (
          <SaleRow item={item as Sale} />
        )
      }
      contentContainerStyle={styles.list}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListHeaderComponent={header}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />
      }
      ListEmptyComponent={
        <AppText variant="body" style={styles.empty}>
          {isPurchases ? 'Пока нет покупок' : 'Пока нет продаж'}
        </AppText>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: {
    padding: spacing.lg,
    flexGrow: 1,
    backgroundColor: colors.bg,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  header: {
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  balanceCard: {
    padding: spacing.lg,
    gap: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 2 },
  right: { alignItems: 'flex-end', gap: 4 },
  tag: {
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  separator: { height: spacing.md },
  empty: {
    color: colors.muted,
    textAlign: 'center',
    paddingTop: spacing.xl,
  },
});
