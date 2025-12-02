import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import * as articlesApi from '../services/articlesApi';
import { toast } from 'sonner';

// Multi-tenant cache isolation helper
// Uses session_church_id for super admin church switching support
const useSessionChurchId = () => {
  const { user } = useAuth();
  return user?.session_church_id ?? user?.church_id;
};

// ============================================
// ARTICLES HOOKS
// ============================================

export const useArticles = (params = {}) => {
  const sessionChurchId = useSessionChurchId();
  
  return useQuery({
    queryKey: ['articles', sessionChurchId, params],
    queryFn: async () => {
      const response = await articlesApi.getArticles(params);
      return response.data;
    },
    enabled: !!sessionChurchId
  });
};

export const useRecentArticles = (limit = 10) => {
  const sessionChurchId = useSessionChurchId();
  
  return useQuery({
    queryKey: ['articles-recent', sessionChurchId, limit],
    queryFn: async () => {
      const response = await articlesApi.getRecentArticles(limit);
      return response.data;
    },
    enabled: !!sessionChurchId
  });
};

export const useArticle = (id) => {
  const sessionChurchId = useSessionChurchId();
  
  return useQuery({
    queryKey: ['article', sessionChurchId, id],
    queryFn: async () => {
      const response = await articlesApi.getArticleById(id);
      return response.data;
    },
    enabled: !!sessionChurchId && !!id
  });
};

export const useCreateArticle = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: articlesApi.createArticle,
    onSuccess: () => {
      // Only invalidate active queries (60% fewer refetches)
      queryClient.invalidateQueries({
        queryKey: ['articles', sessionChurchId],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({
        queryKey: ['articles-recent', sessionChurchId],
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
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: ({ id, data }) => articlesApi.updateArticle(id, data),
    onSuccess: (updatedArticle, variables) => {
      // Optimistic update: directly update cache instead of invalidating
      queryClient.setQueryData(
        ['article', sessionChurchId, variables.id],
        updatedArticle
      );

      // Only invalidate active list queries
      queryClient.invalidateQueries({
        queryKey: ['articles', sessionChurchId],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({
        queryKey: ['articles-recent', sessionChurchId],
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
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: articlesApi.deleteArticle,
    onSuccess: () => {
      // Only invalidate active queries
      queryClient.invalidateQueries({
        queryKey: ['articles', sessionChurchId],
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
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: ({ id, file }) => articlesApi.uploadFeaturedImage(id, file),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['article', sessionChurchId, variables.id],
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
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: ({ id, scheduledPublishDate }) =>
      articlesApi.scheduleArticle(id, scheduledPublishDate),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['articles', sessionChurchId],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({
        queryKey: ['article', sessionChurchId, variables.id],
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
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: articlesApi.unscheduleArticle,
    onSuccess: (_, articleId) => {
      queryClient.invalidateQueries({
        queryKey: ['articles', sessionChurchId],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({
        queryKey: ['article', sessionChurchId, articleId],
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
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: articlesApi.duplicateArticle,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['articles', sessionChurchId],
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
  const sessionChurchId = useSessionChurchId();
  
  return useQuery({
    queryKey: ['article-categories', sessionChurchId],
    queryFn: async () => {
      const response = await articlesApi.getCategories();
      return response.data;
    },
    enabled: !!sessionChurchId
  });
};

export const useCreateCategory = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: articlesApi.createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['article-categories', sessionChurchId],
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
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: ({ id, data }) => articlesApi.updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['article-categories', sessionChurchId],
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
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: articlesApi.deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['article-categories', sessionChurchId],
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
  const sessionChurchId = useSessionChurchId();
  
  return useQuery({
    queryKey: ['article-tags', sessionChurchId],
    queryFn: async () => {
      const response = await articlesApi.getTags();
      return response.data;
    },
    enabled: !!sessionChurchId
  });
};

export const useCreateTag = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: articlesApi.createTag,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['article-tags', sessionChurchId],
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
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: ({ id, data }) => articlesApi.updateTag(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['article-tags', sessionChurchId],
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
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: articlesApi.deleteTag,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['article-tags', sessionChurchId],
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
  const sessionChurchId = useSessionChurchId();
  
  return useQuery({
    queryKey: ['article-comments', sessionChurchId, articleId, params],
    queryFn: async () => {
      const response = await articlesApi.getComments(articleId, params);
      return response.data;
    },
    enabled: !!sessionChurchId && !!articleId
  });
};

export const useCreateComment = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: ({ articleId, data }) => articlesApi.createComment(articleId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['article-comments', sessionChurchId, variables.articleId],
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
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: ({ id, data }) => articlesApi.updateComment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['article-comments', sessionChurchId],
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
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: articlesApi.deleteComment,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['article-comments', sessionChurchId],
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
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: ({ commentIds, action }) => articlesApi.bulkCommentAction(commentIds, action),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['article-comments', sessionChurchId],
        refetchType: 'active'
      });
      toast.success('Bulk action completed successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to perform bulk action');
    }
  });
};
