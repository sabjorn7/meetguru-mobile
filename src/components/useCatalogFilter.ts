import { useMemo, useState } from 'react';

type Options<T> = {
  items: T[];
  getTitle: (item: T) => string | null;
  getCategory: (item: T) => string | null;
};

type CatalogFilterState<T> = {
  query: string;
  setQuery: (value: string) => void;
  selectedCategory: string | null;
  setSelectedCategory: (category: string | null) => void;
  categories: string[];
  filtered: T[];
};

/** Client-side search (by title) + category filter over an already-loaded list. */
export function useCatalogFilter<T>({ items, getTitle, getCategory }: Options<T>): CatalogFilterState<T> {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      const category = getCategory(item)?.trim();
      if (category) set.add(category);
    }
    return [...set].sort((a, b) => a.localeCompare(b, 'ru'));
  }, [items, getCategory]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return items.filter((item) => {
      if (selectedCategory && getCategory(item)?.trim() !== selectedCategory) return false;
      if (normalizedQuery) {
        const title = getTitle(item)?.toLowerCase() ?? '';
        if (!title.includes(normalizedQuery)) return false;
      }
      return true;
    });
  }, [items, query, selectedCategory, getTitle, getCategory]);

  return { query, setQuery, selectedCategory, setSelectedCategory, categories, filtered };
}
