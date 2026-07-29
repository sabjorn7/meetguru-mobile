import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/features/auth/AuthContext';
import { errorMessage } from '@/lib/errors';

import { fetchBalance, fetchPurchases, fetchSales, type Purchase, type Sale } from './api';

type UseFinanceState = {
  balance: number;
  purchases: Purchase[];
  sales: Sale[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => void;
};

export function useFinance(): UseFinanceState {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (isRefresh: boolean) => {
      if (!user) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const [b, p, s] = await Promise.all([
          fetchBalance(user.id),
          fetchPurchases(user.id),
          fetchSales(user.id),
        ]);
        setBalance(b);
        setPurchases(p);
        setSales(s);
      } catch (e) {
        setError(errorMessage(e, 'Не удалось загрузить финансы.'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user],
  );

  useEffect(() => {
    load(false);
  }, [load]);

  const refresh = useCallback(() => load(true), [load]);

  return { balance, purchases, sales, loading, refreshing, error, refresh };
}
