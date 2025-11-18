import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import * as articlesApi from '../services/articlesApi';

// ============================================
// ARTICLES HOOKS
// ============================================

export const useArticles = (params = {}) => {
  const { user } = useAuth();
  const churchId = user?.church_id;
  
  return useQuery({
    queryKey: ['articles', churchId, params],
    queryFn: async () => {
      const response = await articlesApi.getArticles(params);
      return response.data;
    },
    enabled: !!churchId
  });
};

export const useRecentArticles = (limit = 10) => {
  const { user } = useAuth();
  const churchId = user?.church_id;
  
  return useQuery({
    queryKey: ['articles-recent', churchId, limit],
    queryFn: async () => {
      const response = await articlesApi.getRecentArticles(limit);
      return response.data;
    },
    enabled: !!churchId
  });
};

export const useArticle = (id) => {
  const { user } = useAuth();
  const churchId = user?.church_id;
  
  return useQuery({
    queryKey: ['article', churchId, id],
    queryFn: async () => {
      const response = await articlesApi.getArticleById(id);
      return response.data;
    },
    enabled: !!churchId && !!id
  });
};

export const useCreateArticle = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const churchId = user?.church_id;
  
  return useMutation({
    mutationFn: articlesApi.createArticle,
    onSuccess: () => {
      queryClient.invalidateQueries(['articles', churchId]);
      queryClient.invalidateQueries(['articles-recent', churchId]);
    }
  });
};

export const useUpdateArticle = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const churchId = user?.church_id;
  
  return useMutation({
    mutationFn: ({ id, data }) => articlesApi.updateArticle(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries(['articles', churchId]);
      queryClient.invalidateQueries(['article', churchId, variables.id]);
      queryClient.invalidateQueries(['articles-recent', churchId]);
    }
  });
};

export const useDeleteArticle = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const churchId = user?.church_id;
  
  return useMutation({
    mutationFn: articlesApi.deleteArticle,
    onSuccess: () => {
      queryClient.invalidateQueries(['articles', churchId]);
    }
  });
};

export const useUploadFeaturedImage = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const churchId = user?.church_id;
  
  return useMutation({
    mutationFn: ({ id, file }) => articlesApi.uploadFeaturedImage(id, file),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries(['article', churchId, variables.id]);
    }
  });
};

export const useGeneratePreviewLink = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: articlesApi.generatePreviewLink
  });
};

export const useScheduleArticle = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const churchId = user?.church_id;
  
  return useMutation({
    mutationFn: ({ id, scheduledPublishDate }) => 
      articlesApi.scheduleArticle(id, scheduledPublishDate),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries(['articles', churchId]);
      queryClient.invalidateQueries(['article', churchId, variables.id]);
    }
  });
};

export const useUnscheduleArticle = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const churchId = user?.church_id;
  
  return useMutation({
    mutationFn: articlesApi.unscheduleArticle,
    onSuccess: (_, articleId) => {
      queryClient.invalidateQueries(['articles', churchId]);
      queryClient.invalidateQueries(['article', churchId, articleId]);
    }
  });
};

export const useDuplicateArticle = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const churchId = user?.church_id;
  
  return useMutation({
    mutationFn: articlesApi.duplicateArticle,
    onSuccess: () => {
      queryClient.invalidateQueries(['articles', churchId]);
    }
  });
};

// ============================================
// CATEGORIES HOOKS
// ============================================

export const useCategories = () => {
  const { user } = useAuth();
  const churchId = user?.church_id;
  
  return useQuery({
    queryKey: ['article-categories', churchId],
    queryFn: async () => {
      const response = await articlesApi.getCategories();
      return response.data;
    },
    enabled: !!churchId
  });
};

export const useCreateCategory = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const churchId = user?.church_id;
  
  return useMutation({
    mutationFn: articlesApi.createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries(['article-categories', churchId]);
    }
  });
};

export const useUpdateCategory = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const churchId = user?.church_id;
  
  return useMutation({
    mutationFn: ({ id, data }) => articlesApi.updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['article-categories', churchId]);
    }
  });
};

export const useDeleteCategory = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const churchId = user?.church_id;
  
  return useMutation({
    mutationFn: articlesApi.deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries(['article-categories', churchId]);
    }
  });
};

// ============================================
// TAGS HOOKS
// ============================================

export const useTags = () => {
  const { user } = useAuth();
  const churchId = user?.church_id;
  
  return useQuery({
    queryKey: ['article-tags', churchId],
    queryFn: async () => {
      const response = await articlesApi.getTags();
      return response.data;
    },
    enabled: !!churchId
  });
};

export const useCreateTag = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const churchId = user?.church_id;
  
  return useMutation({
    mutationFn: articlesApi.createTag,
    onSuccess: () => {
      queryClient.invalidateQueries(['article-tags', churchId]);
    }
  });
};

export const useUpdateTag = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const churchId = user?.church_id;
  
  return useMutation({
    mutationFn: ({ id, data }) => articlesApi.updateTag(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['article-tags', churchId]);
    }
  });
};

export const useDeleteTag = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const churchId = user?.church_id;
  
  return useMutation({
    mutationFn: articlesApi.deleteTag,
    onSuccess: () => {
      queryClient.invalidateQueries(['article-tags', churchId]);
    }
  });
};

// ============================================
// COMMENTS HOOKS
// ============================================

export const useComments = (articleId, params = {}) => {
  const { user } = useAuth();
  const churchId = user?.church_id;
  
  return useQuery({
    queryKey: ['article-comments', churchId, articleId, params],
    queryFn: async () => {
      const response = await articlesApi.getComments(articleId, params);
      return response.data;
    },
    enabled: !!churchId && !!articleId
  });
};

export const useCreateComment = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const churchId = user?.church_id;
  
  return useMutation({
    mutationFn: ({ articleId, data }) => articlesApi.createComment(articleId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries(['article-comments', churchId, variables.articleId]);
    }
  });
};

export const useUpdateComment = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const churchId = user?.church_id;
  
  return useMutation({
    mutationFn: ({ id, data }) => articlesApi.updateComment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['article-comments', churchId]);
    }
  });
};

export const useDeleteComment = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const churchId = user?.church_id;
  
  return useMutation({
    mutationFn: articlesApi.deleteComment,
    onSuccess: () => {
      queryClient.invalidateQueries(['article-comments', churchId]);
    }
  });
};

export const useBulkCommentAction = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const churchId = user?.church_id;
  
  return useMutation({
    mutationFn: ({ commentIds, action }) => articlesApi.bulkCommentAction(commentIds, action),
    onSuccess: () => {
      queryClient.invalidateQueries(['article-comments', churchId]);
    }
  });
};
