import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/features/auth/AuthContext';

import {
  checkCourseAccess,
  fetchCourseBySlug,
  fetchCourseLessons,
  type CourseDetail,
  type LessonItem,
} from './api';

type UseCourseDetailState = {
  course: CourseDetail | null;
  lessons: LessonItem[];
  hasAccess: boolean;
  notFound: boolean;
  loading: boolean;
  error: string | null;
  /** Re-check access only (e.g. after returning from the web purchase flow). */
  refreshAccess: () => void;
};

function isFreeCourse(course: CourseDetail): boolean {
  return course.Free === true || (course.Price ?? 0) === 0;
}

export function useCourseDetail(slug: string | undefined): UseCourseDetailState {
  const { user } = useAuth();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [lessons, setLessons] = useState<LessonItem[]>([]);
  const [hasAccess, setHasAccess] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!slug) return;

    setLoading(true);
    setError(null);
    setNotFound(false);

    (async () => {
      try {
        const detail = await fetchCourseBySlug(slug);
        if (!mounted) return;
        if (!detail) {
          setNotFound(true);
          return;
        }
        setCourse(detail);

        const [courseLessons, access] = await Promise.all([
          fetchCourseLessons(detail.id),
          user ? checkCourseAccess(detail.id, user.id, isFreeCourse(detail)) : Promise.resolve(false),
        ]);
        if (!mounted) return;
        setLessons(courseLessons);
        setHasAccess(access);
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : 'Не удалось загрузить курс.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [slug, user]);

  const refreshAccess = useCallback(() => {
    if (!course || !user) return;
    checkCourseAccess(course.id, user.id, isFreeCourse(course))
      .then(setHasAccess)
      .catch(() => {
        // Keep the current access state on a transient re-check failure.
      });
  }, [course, user]);

  return { course, lessons, hasAccess, notFound, loading, error, refreshAccess };
}
