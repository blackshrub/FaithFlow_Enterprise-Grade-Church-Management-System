import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import exploreService from '../services/exploreService';
import { toast } from 'sonner';

// Multi-tenant cache isolation helper
// Uses session_church_id for super admin church switching support
const useSessionChurchId = () => {
  const { user } = useAuth();
  return user?.session_church_id ?? user?.church_id;
};

// ============================================
// DASHBOARD & STATS HOOKS
// ============================================

export const useExploreDashboardStats = () => {
  const sessionChurchId = useSessionChurchId();

  return useQuery({
    queryKey: ['explore', sessionChurchId, 'dashboard-stats'],
    queryFn: () => exploreService.getDashboardStats(),
    staleTime: 60000, // 1 minute
    enabled: !!sessionChurchId
  });
};

// ============================================
// CONTENT LIST HOOKS
// ============================================

export const useExploreContentList = (contentType, params = {}) => {
  const sessionChurchId = useSessionChurchId();

  return useQuery({
    queryKey: ['explore', sessionChurchId, 'content', contentType, params],
    queryFn: () => exploreService.listContent(contentType, params),
    staleTime: 30000, // 30 seconds
    enabled: !!sessionChurchId && !!contentType
  });
};

export const useExploreContent = (contentType, contentId) => {
  const sessionChurchId = useSessionChurchId();

  return useQuery({
    queryKey: ['explore', sessionChurchId, 'content', contentType, contentId],
    queryFn: () => exploreService.getContent(contentType, contentId),
    staleTime: 60000, // 1 minute - content doesn't change frequently
    enabled: !!sessionChurchId && !!contentType && !!contentId
  });
};

// ============================================
// CONTENT MUTATION HOOKS
// ============================================

export const useCreateExploreContent = (contentType) => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: (data) => exploreService.createContent(contentType, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['explore', sessionChurchId, 'content', contentType],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({
        queryKey: ['explore', sessionChurchId, 'dashboard-stats'],
        refetchType: 'active'
      });
      toast.success('Content created successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to create content');
    }
  });
};

export const useUpdateExploreContent = (contentType) => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: ({ contentId, data }) => exploreService.updateContent(contentType, contentId, data),
    onSuccess: (_, variables) => {
      // Optimistic update: directly update cache
      queryClient.invalidateQueries({
        queryKey: ['explore', sessionChurchId, 'content', contentType, variables.contentId],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({
        queryKey: ['explore', sessionChurchId, 'content', contentType],
        refetchType: 'active'
      });
      toast.success('Content updated successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to update content');
    }
  });
};

export const useDeleteExploreContent = (contentType) => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: (contentId) => exploreService.deleteContent(contentType, contentId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['explore', sessionChurchId, 'content', contentType],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({
        queryKey: ['explore', sessionChurchId, 'dashboard-stats'],
        refetchType: 'active'
      });
      toast.success('Content deleted successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to delete content');
    }
  });
};

export const useBulkDeleteExploreContent = (contentType) => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: (contentIds) => exploreService.bulkDeleteContent(contentType, contentIds),
    onSuccess: (_, contentIds) => {
      queryClient.invalidateQueries({
        queryKey: ['explore', sessionChurchId, 'content', contentType],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({
        queryKey: ['explore', sessionChurchId, 'dashboard-stats'],
        refetchType: 'active'
      });
      toast.success(`${contentIds.length} items deleted successfully`);
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to delete content');
    }
  });
};

// ============================================
// SCHEDULING HOOKS
// ============================================

export const useExploreSchedule = (startDate, endDate) => {
  const sessionChurchId = useSessionChurchId();

  return useQuery({
    queryKey: ['explore', sessionChurchId, 'schedule', startDate, endDate],
    queryFn: () => exploreService.getSchedule(startDate, endDate),
    enabled: !!sessionChurchId && !!startDate && !!endDate
  });
};

export const useExploreScheduledContent = (params = {}) => {
  const sessionChurchId = useSessionChurchId();

  return useQuery({
    queryKey: ['explore', sessionChurchId, 'scheduled-content', params],
    queryFn: () => exploreService.getScheduledContent(params),
    staleTime: 30000,
    enabled: !!sessionChurchId && !!params.start_date && !!params.end_date
  });
};

export const useScheduleExploreContent = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: ({ contentType, contentId, scheduledDate }) =>
      exploreService.scheduleContent(contentType, contentId, scheduledDate),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['explore', sessionChurchId, 'schedule'],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({
        queryKey: ['explore', sessionChurchId, 'content', variables.contentType],
        refetchType: 'active'
      });
      toast.success('Content scheduled successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to schedule content');
    }
  });
};

export const useUnscheduleExploreContent = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: ({ contentType, contentId }) =>
      exploreService.unscheduleContent(contentType, contentId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['explore', sessionChurchId, 'schedule'],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({
        queryKey: ['explore', sessionChurchId, 'content', variables.contentType],
        refetchType: 'active'
      });
      toast.success('Content unscheduled');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to unschedule content');
    }
  });
};

// ============================================
// ANALYTICS HOOKS
// ============================================

export const useExploreAnalytics = (params = {}) => {
  const sessionChurchId = useSessionChurchId();

  return useQuery({
    queryKey: ['explore', sessionChurchId, 'analytics', 'overview', params],
    queryFn: () => exploreService.getAnalytics(params),
    staleTime: 60000,
    enabled: !!sessionChurchId
  });
};

export const useExploreChurchAnalytics = (params = {}) => {
  const sessionChurchId = useSessionChurchId();

  return useQuery({
    queryKey: ['explore', sessionChurchId, 'analytics', 'churches', params],
    queryFn: () => exploreService.getChurchAnalytics(params),
    staleTime: 60000,
    enabled: !!sessionChurchId
  });
};

export const useExploreTopContent = (params = {}) => {
  const sessionChurchId = useSessionChurchId();

  return useQuery({
    queryKey: ['explore', sessionChurchId, 'analytics', 'top-content', params],
    queryFn: () => exploreService.getTopContent(params),
    staleTime: 60000,
    enabled: !!sessionChurchId
  });
};

// ============================================
// AI GENERATION HOOKS
// ============================================

export const useExploreAIConfig = () => {
  const sessionChurchId = useSessionChurchId();

  return useQuery({
    queryKey: ['explore', sessionChurchId, 'ai', 'config'],
    queryFn: () => exploreService.getAIConfig(),
    staleTime: 300000, // 5 minutes
    enabled: !!sessionChurchId
  });
};

export const useGenerateExploreContent = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: (params) => exploreService.generateContent(params),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['explore', sessionChurchId, 'ai', 'queue'],
        refetchType: 'active'
      });
      toast.success('Content generation started');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to start generation');
    }
  });
};

export const useExploreGenerationQueue = () => {
  const sessionChurchId = useSessionChurchId();

  return useQuery({
    queryKey: ['explore', sessionChurchId, 'ai', 'queue'],
    queryFn: () => exploreService.getGenerationQueue(),
    refetchInterval: 5000, // Poll every 5 seconds for active jobs
    enabled: !!sessionChurchId
  });
};

export const useAcceptGeneratedContent = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: ({ jobId, edits }) => exploreService.acceptGeneratedContent(jobId, edits),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['explore', sessionChurchId, 'ai', 'queue'],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({
        queryKey: ['explore', sessionChurchId, 'content'],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({
        queryKey: ['explore', sessionChurchId, 'dashboard-stats'],
        refetchType: 'active'
      });
      toast.success('Content accepted and saved');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to accept content');
    }
  });
};

export const useRejectGeneratedContent = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: (jobId) => exploreService.rejectGeneratedContent(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['explore', sessionChurchId, 'ai', 'queue'],
        refetchType: 'active'
      });
      toast.success('Content rejected');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to reject content');
    }
  });
};

export const useRegenerateExploreContent = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: (jobId) => exploreService.regenerateContent(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['explore', sessionChurchId, 'ai', 'queue'],
        refetchType: 'active'
      });
      toast.success('Regeneration started');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to regenerate');
    }
  });
};

// ============================================
// AI PROMPT CONFIG HOOKS
// ============================================

export const useExplorePromptConfig = () => {
  const sessionChurchId = useSessionChurchId();

  return useQuery({
    queryKey: ['explore', sessionChurchId, 'ai', 'prompt-config'],
    queryFn: () => exploreService.getPromptConfig(),
    staleTime: 300000,
    enabled: !!sessionChurchId
  });
};

export const useExplorePromptConfigByType = (contentType) => {
  const sessionChurchId = useSessionChurchId();

  return useQuery({
    queryKey: ['explore', sessionChurchId, 'ai', 'prompt-config', contentType],
    queryFn: () => exploreService.getPromptConfigByType(contentType),
    enabled: !!sessionChurchId && !!contentType
  });
};

export const useUpdateExplorePromptConfig = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: (config) => exploreService.updatePromptConfig(config),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['explore', sessionChurchId, 'ai', 'prompt-config'],
        refetchType: 'active'
      });
      toast.success('Prompt configuration updated');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to update configuration');
    }
  });
};

export const useUpdateExplorePromptConfigByType = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: ({ contentType, config }) =>
      exploreService.updatePromptConfigByType(contentType, config),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['explore', sessionChurchId, 'ai', 'prompt-config'],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({
        queryKey: ['explore', sessionChurchId, 'ai', 'prompt-config', variables.contentType],
        refetchType: 'active'
      });
      toast.success('Configuration updated');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to update configuration');
    }
  });
};

export const useResetExplorePromptConfig = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: (contentTypes) => exploreService.resetPromptConfig(contentTypes),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['explore', sessionChurchId, 'ai', 'prompt-config'],
        refetchType: 'active'
      });
      toast.success('Configuration reset to defaults');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to reset configuration');
    }
  });
};

// ============================================
// CHURCH SETTINGS HOOKS
// ============================================

export const useExploreChurchSettings = () => {
  const sessionChurchId = useSessionChurchId();

  return useQuery({
    queryKey: ['explore', sessionChurchId, 'church-settings'],
    queryFn: () => exploreService.getChurchSettings(),
    enabled: !!sessionChurchId
  });
};

export const useUpdateExploreChurchSettings = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: (settings) => exploreService.updateChurchSettings(settings),
    onSuccess: (updatedSettings) => {
      queryClient.setQueryData(
        ['explore', sessionChurchId, 'church-settings'],
        updatedSettings
      );
      toast.success('Settings updated successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to update settings');
    }
  });
};

// ============================================
// PLATFORM SETTINGS HOOKS (Super Admin only)
// ============================================

export const useExplorePlatformSettings = () => {
  const sessionChurchId = useSessionChurchId();

  return useQuery({
    queryKey: ['explore', sessionChurchId, 'platform-settings'],
    queryFn: () => exploreService.getPlatformSettings(),
    enabled: !!sessionChurchId
  });
};

export const useUpdateExplorePlatformSettings = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: (settings) => exploreService.updatePlatformSettings(settings),
    onSuccess: (updatedSettings) => {
      queryClient.setQueryData(
        ['explore', sessionChurchId, 'platform-settings'],
        updatedSettings
      );
      toast.success('Platform settings updated');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to update settings');
    }
  });
};

// ============================================
// CONTENT ADOPTION HOOKS (Church Admin)
// ============================================

export const useExploreAdoptionStatus = () => {
  const sessionChurchId = useSessionChurchId();

  return useQuery({
    queryKey: ['explore', sessionChurchId, 'adoption'],
    queryFn: () => exploreService.getAdoptionStatus(),
    staleTime: 60000,
    enabled: !!sessionChurchId
  });
};

export const useUpdateExploreContentAdoption = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: ({ contentType, contentId, adopted }) =>
      exploreService.updateContentAdoption(contentType, contentId, adopted),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['explore', sessionChurchId, 'adoption'],
        refetchType: 'active'
      });
      toast.success('Content adoption updated');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to update adoption');
    }
  });
};

// ============================================
// AI GENERATION STATUS HOOK
// ============================================

export const useExploreGenerationStatus = (jobId) => {
  const sessionChurchId = useSessionChurchId();

  return useQuery({
    queryKey: ['explore', sessionChurchId, 'ai', 'queue', jobId],
    queryFn: () => exploreService.getGenerationStatus(jobId),
    staleTime: 5000, // 5 seconds - for polling active jobs
    refetchInterval: (data) => {
      // Auto-refresh while job is pending or generating
      if (data?.status === 'pending' || data?.status === 'generating') {
        return 3000; // Poll every 3 seconds
      }
      return false; // Stop polling when complete
    },
    enabled: !!sessionChurchId && !!jobId
  });
};

// ============================================
// LIFE STAGE JOURNEY HOOKS
// ============================================

export const useJourneys = (params = {}) => {
  const sessionChurchId = useSessionChurchId();

  return useQuery({
    queryKey: ['explore', sessionChurchId, 'journeys', params],
    queryFn: () => exploreService.listJourneys(params),
    staleTime: 60000,
    enabled: !!sessionChurchId
  });
};

export const useJourney = (journeyId) => {
  const sessionChurchId = useSessionChurchId();

  return useQuery({
    queryKey: ['explore', sessionChurchId, 'journeys', journeyId],
    queryFn: () => exploreService.getJourney(journeyId),
    staleTime: 60000,
    enabled: !!sessionChurchId && !!journeyId
  });
};

export const useCreateJourney = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: (data) => exploreService.createJourney(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['explore', sessionChurchId, 'journeys'],
        refetchType: 'active'
      });
      toast.success('Journey created successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to create journey');
    }
  });
};

export const useUpdateJourney = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: ({ journeyId, data }) => exploreService.updateJourney(journeyId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['explore', sessionChurchId, 'journeys', variables.journeyId],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({
        queryKey: ['explore', sessionChurchId, 'journeys'],
        refetchType: 'active'
      });
      toast.success('Journey updated successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to update journey');
    }
  });
};

export const useDeleteJourney = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: (journeyId) => exploreService.deleteJourney(journeyId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['explore', sessionChurchId, 'journeys'],
        refetchType: 'active'
      });
      toast.success('Journey deleted');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to delete journey');
    }
  });
};

export const usePublishJourney = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: (journeyId) => exploreService.publishJourney(journeyId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['explore', sessionChurchId, 'journeys'],
        refetchType: 'active'
      });
      toast.success('Journey published');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to publish journey');
    }
  });
};

export const useArchiveJourney = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: (journeyId) => exploreService.archiveJourney(journeyId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['explore', sessionChurchId, 'journeys'],
        refetchType: 'active'
      });
      toast.success('Journey archived');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to archive journey');
    }
  });
};

// ============================================
// SERMON INTEGRATION HOOKS
// ============================================

export const useSermons = (weeks = 8) => {
  const sessionChurchId = useSessionChurchId();

  return useQuery({
    queryKey: ['explore', sessionChurchId, 'sermons', weeks],
    queryFn: () => exploreService.listSermons(weeks),
    staleTime: 60000,
    enabled: !!sessionChurchId
  });
};

export const useSermon = (sermonId) => {
  const sessionChurchId = useSessionChurchId();

  return useQuery({
    queryKey: ['explore', sessionChurchId, 'sermons', sermonId],
    queryFn: () => exploreService.getSermon(sermonId),
    staleTime: 60000,
    enabled: !!sessionChurchId && !!sermonId
  });
};

export const useSermonThemes = () => {
  const sessionChurchId = useSessionChurchId();

  return useQuery({
    queryKey: ['explore', sessionChurchId, 'sermon-themes'],
    queryFn: () => exploreService.getSermonThemes(),
    staleTime: 300000, // 5 minutes
    enabled: !!sessionChurchId
  });
};

export const useWeeklyContentPlan = (sermonId) => {
  const sessionChurchId = useSessionChurchId();

  return useQuery({
    queryKey: ['explore', sessionChurchId, 'sermons', sermonId, 'content-plan'],
    queryFn: () => exploreService.getWeeklyContentPlan(sermonId),
    staleTime: 60000,
    enabled: !!sessionChurchId && !!sermonId
  });
};

export const useCreateSermon = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: (data) => exploreService.createSermon(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['explore', sessionChurchId, 'sermons'],
        refetchType: 'active'
      });
      toast.success('Sermon created successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to create sermon');
    }
  });
};

export const useUpdateSermon = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: ({ sermonId, data }) => exploreService.updateSermon(sermonId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['explore', sessionChurchId, 'sermons', variables.sermonId],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({
        queryKey: ['explore', sessionChurchId, 'sermons'],
        refetchType: 'active'
      });
      toast.success('Sermon updated successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to update sermon');
    }
  });
};

export const useDeleteSermon = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: (sermonId) => exploreService.deleteSermon(sermonId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['explore', sessionChurchId, 'sermons'],
        refetchType: 'active'
      });
      toast.success('Sermon deleted');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to delete sermon');
    }
  });
};

// ============================================
// PROFILE ANALYTICS HOOKS
// ============================================

export const useProfileAnalytics = (timeRange = '30d') => {
  const sessionChurchId = useSessionChurchId();

  return useQuery({
    queryKey: ['explore', sessionChurchId, 'profile-analytics', timeRange],
    queryFn: () => exploreService.getProfileAnalytics(timeRange),
    staleTime: 60000,
    enabled: !!sessionChurchId
  });
};

export const useProfileAggregates = () => {
  const sessionChurchId = useSessionChurchId();

  return useQuery({
    queryKey: ['explore', sessionChurchId, 'profile-aggregates'],
    queryFn: () => exploreService.getProfileAggregates(),
    staleTime: 60000,
    enabled: !!sessionChurchId
  });
};

export const useTopEngagers = (limit = 10) => {
  const sessionChurchId = useSessionChurchId();

  return useQuery({
    queryKey: ['explore', sessionChurchId, 'top-engagers', limit],
    queryFn: () => exploreService.getTopEngagers(limit),
    staleTime: 60000,
    enabled: !!sessionChurchId
  });
};

export const useGrowthIndicators = (timeRange = '30d') => {
  const sessionChurchId = useSessionChurchId();

  return useQuery({
    queryKey: ['explore', sessionChurchId, 'growth-indicators', timeRange],
    queryFn: () => exploreService.getGrowthIndicators(timeRange),
    staleTime: 60000,
    enabled: !!sessionChurchId
  });
};
