import { useCallback, useEffect, useState } from 'react';

import { errorMessage } from '@/lib/errors';

import { fetchProfiles, type ProfileListItem } from './api';

type UsePeopleState = {
  people: ProfileListItem[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => void;
};

export function usePeople(): UsePeopleState {
  const [people, setPeople] = useState<ProfileListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh: boolean) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      setPeople(await fetchProfiles());
    } catch (e) {
      setError(errorMessage(e, 'Не удалось загрузить профили.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  const refresh = useCallback(() => load(true), [load]);

  return { people, loading, refreshing, error, refresh };
}
