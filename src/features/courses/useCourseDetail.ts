import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/features/auth/AuthContext';

import {
  checkCourseAccess,
  fetchCourseBySlug,
  fetchCourseLessons,
  fetchCourseMembership,
  fetchStudentsCount,
  type CourseDetail,
  type LessonItem,
} from './api';

type UseCourseDetailState = {
  course: CourseDetail | null;
  lessons: LessonItem[];
  studentsCount: number;
  hasAccess: boolean;
  /** Member of the course (bought or added free) — may leave a review. */
  canReview: boolean;
  /** The user's access-expiry date for this course (end_period), or null. */
  accessUntil: string | null;
  notFound: boolean;
  loading: boolean;
  error: string | null;
  /** Re-check access only (e.g. after returning from the web purchase flow). */
  refreshAccess: () => void;
  /** Re-fetch course, lessons and access (e.g. after posting a rating/review). */
  reload: () => void;
};

function isFreeCourse(course: CourseDetail): boolean {
  return course.Free === true || (course.Price ?? 0) === 0;
}

export function useCourseDetail(slug: string | undefined): UseCourseDetailState {
  const { user } = useAuth();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [lessons, setLessons] = useState<LessonItem[]>([]);
  const [studentsCount, setStudentsCount] = useState(0);
  const [hasAccess, setHasAccess] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [accessUntil, setAccessUntil] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

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

        const [courseLessons, students, access, membership] = await Promise.all([
          fetchCourseLessons(detail.id),
          fetchStudentsCount(detail.id),
          user ? checkCourseAccess(detail.id, user.id, isFreeCourse(detail)) : Promise.resolve(false),
          user
            ? fetchCourseMembership(detail.id, user.id)
            : Promise.resolve({ isMember: false, endPeriod: null }),
        ]);
        if (!mounted) return;
        setLessons(courseLessons);
        setStudentsCount(students);
        setHasAccess(access);
        setCanReview(membership.isMember);
        setAccessUntil(membership.endPeriod);
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : 'Не удалось загрузить курс.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [slug, user, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const refreshAccess = useCallback(() => {
    if (!course || !user) return;
    checkCourseAccess(course.id, user.id, isFreeCourse(course))
      .then(setHasAccess)
      .catch(() => {
        // Keep the current access state on a transient re-check failure.
      });
  }, [course, user]);

  return {
    course,
    lessons,
    studentsCount,
    hasAccess,
    canReview,
    accessUntil,
    notFound,
    loading,
    error,
    refreshAccess,
    reload,
  };
}
