import { useEffect, useState } from 'react';

import {
  fetchArticleAuthor,
  fetchArticleBySlug,
  fetchArticleComments,
  type ArticleAuthor,
  type ArticleComment,
  type ArticleDetail,
} from './api';

type UseArticleDetailState = {
  article: ArticleDetail | null;
  author: ArticleAuthor | null;
  comments: ArticleComment[];
  notFound: boolean;
  loading: boolean;
  error: string | null;
};

export function useArticleDetail(slug: string | undefined): UseArticleDetailState {
  const [article, setArticle] = useState<ArticleDetail | null>(null);
  const [author, setAuthor] = useState<ArticleAuthor | null>(null);
  const [comments, setComments] = useState<ArticleComment[]>([]);
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
        const detail = await fetchArticleBySlug(slug);
        if (!mounted) return;
        if (!detail) {
          setNotFound(true);
          return;
        }
        setArticle(detail);

        const [authorData, commentsData] = await Promise.all([
          detail.Creator ? fetchArticleAuthor(detail.Creator) : Promise.resolve(null),
          fetchArticleComments(detail.id),
        ]);
        if (!mounted) return;
        setAuthor(authorData);
        setComments(commentsData);
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : 'Не удалось загрузить статью.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [slug]);

  return { article, author, comments, notFound, loading, error };
}
