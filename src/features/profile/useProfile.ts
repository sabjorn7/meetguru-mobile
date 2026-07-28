import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/features/auth/AuthContext';
import type { CourseListItem } from '@/features/courses/api';

import { fetchMyCourses, fetchProfile, type Profile } from './api';

type UseProfileState = {
  profile: Profile | null;
  myCourses: CourseListItem[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => void;
};

export function useProfile(): UseProfileState {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [myCourses, setMyCourses] = useState<CourseListItem[]>([]);
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
        const [profileData, courses] = await Promise.all([
          fetchProfile(user.id),
          fetchMyCourses(user.id),
        ]);
        setProfile(profileData);
        setMyCourses(courses);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Не удалось загрузить профиль.');
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

  return { profile, myCourses, loading, refreshing, error, refresh };
}
