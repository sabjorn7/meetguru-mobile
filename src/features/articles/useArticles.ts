import { useCallback, useEffect, useState } from 'react';

import { fetchArticles, type ArticleListItem } from './api';

type UseArticlesState = {
  articles: ArticleListItem[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => void;
};

export function useArticles(): UseArticlesState {
  const [articles, setArticles] = useState<ArticleListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh: boolean) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      setArticles(await fetchArticles());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить статьи.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  const refresh = useCallback(() => load(true), [load]);

  return { articles, loading, refreshing, error, refresh };
}
