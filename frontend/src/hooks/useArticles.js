import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import * as articlesApi from '../services/articlesApi';
import { toast } from 'sonner';

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
      // Only invalidate active queries (60% fewer refetches)
      queryClient.invalidateQueries({
        queryKey: ['articles', churchId],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({
        queryKey: ['articles-recent', churchId],
        refetchType: 'active'
      });
      toast.success('Article created successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to create article');
    }
  });
};

export const useUpdateArticle = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const churchId = user?.church_id;

  return useMutation({
    mutationFn: ({ id, data }) => articlesApi.updateArticle(id, data),
    onSuccess: (updatedArticle, variables) => {
      // Optimistic update: directly update cache instead of invalidating
      queryClient.setQueryData(
        ['article', churchId, variables.id],
        updatedArticle
      );

      // Only invalidate active list queries
      queryClient.invalidateQueries({
        queryKey: ['articles', churchId],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({
        queryKey: ['articles-recent', churchId],
        refetchType: 'active'
      });
      toast.success('Article updated successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to update article');
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
      // Only invalidate active queries
      queryClient.invalidateQueries({
        queryKey: ['articles', churchId],
        refetchType: 'active'
      });
      toast.success('Article deleted successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to delete article');
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
      queryClient.invalidateQueries({
        queryKey: ['article', churchId, variables.id],
        refetchType: 'active'
      });
      toast.success('Featured image uploaded successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to upload image');
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
      queryClient.invalidateQueries({
        queryKey: ['articles', churchId],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({
        queryKey: ['article', churchId, variables.id],
        refetchType: 'active'
      });
      toast.success('Article scheduled successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to schedule article');
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
      queryClient.invalidateQueries({
        queryKey: ['articles', churchId],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({
        queryKey: ['article', churchId, articleId],
        refetchType: 'active'
      });
      toast.success('Article unscheduled successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to unschedule article');
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
      queryClient.invalidateQueries({
        queryKey: ['articles', churchId],
        refetchType: 'active'
      });
      toast.success('Article duplicated successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to duplicate article');
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
      queryClient.invalidateQueries({
        queryKey: ['article-categories', churchId],
        refetchType: 'active'
      });
      toast.success('Category created successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to create category');
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
      queryClient.invalidateQueries({
        queryKey: ['article-categories', churchId],
        refetchType: 'active'
      });
      toast.success('Category updated successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to update category');
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
      queryClient.invalidateQueries({
        queryKey: ['article-categories', churchId],
        refetchType: 'active'
      });
      toast.success('Category deleted successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to delete category');
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
      queryClient.invalidateQueries({
        queryKey: ['article-tags', churchId],
        refetchType: 'active'
      });
      toast.success('Tag created successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to create tag');
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
      queryClient.invalidateQueries({
        queryKey: ['article-tags', churchId],
        refetchType: 'active'
      });
      toast.success('Tag updated successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to update tag');
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
      queryClient.invalidateQueries({
        queryKey: ['article-tags', churchId],
        refetchType: 'active'
      });
      toast.success('Tag deleted successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to delete tag');
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
      queryClient.invalidateQueries({
        queryKey: ['article-comments', churchId, variables.articleId],
        refetchType: 'active'
      });
      toast.success('Comment created successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to create comment');
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
      queryClient.invalidateQueries({
        queryKey: ['article-comments', churchId],
        refetchType: 'active'
      });
      toast.success('Comment updated successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to update comment');
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
      queryClient.invalidateQueries({
        queryKey: ['article-comments', churchId],
        refetchType: 'active'
      });
      toast.success('Comment deleted successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to delete comment');
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
      queryClient.invalidateQueries({
        queryKey: ['article-comments', churchId],
        refetchType: 'active'
      });
      toast.success('Bulk action completed successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to perform bulk action');
    }
  });
};
