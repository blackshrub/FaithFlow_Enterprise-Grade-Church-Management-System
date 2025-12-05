import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { importExportAPI } from '../services/api';
import { queryKeys } from '../lib/react-query';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';

// Templates
export const useImportTemplates = () => {
  const { church } = useAuth();
  
  return useQuery({
    queryKey: ['import-templates', church?.id],
    queryFn: () => importExportAPI.listTemplates().then(res => res.data),
    enabled: !!church?.id,
  });
};

export const useCreateTemplate = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (templateData) => importExportAPI.createTemplate(templateData).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import-templates'] });
      toast.success('Template saved successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to save template');
    },
  });
};

// Import operations
export const useParseFile = () => {
  return useMutation({
    mutationFn: (file) => importExportAPI.parseFile(file).then(res => res.data),
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to parse file');
    },
  });
};

export const useSimulateImport = () => {
  return useMutation({
    mutationFn: (data) => importExportAPI.simulateImport(data).then(res => res.data),
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Simulation failed');
    },
  });
};

export const useImportMembers = () => {
  const queryClient = useQueryClient();
  const { church } = useAuth();
  
  return useMutation({
    mutationFn: (data) => importExportAPI.importMembers(data).then(res => res.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.members.all(church?.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.members.stats(church?.id) });
      toast.success(`Successfully imported ${data.imported} members`);
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail?.message || 'Import failed');
    },
  });
};

// Export
export const useExportMembers = () => {
  return useMutation({
    mutationFn: (params) => importExportAPI.exportMembers(params),
    onSuccess: (response, variables) => {
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `members_export_${Date.now()}.${variables.format || 'csv'}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Export completed successfully');
    },
    onError: (error) => {
      toast.error('Export failed');
    },
  });
};

// Import logs
export const useImportLogs = () => {
  const { church } = useAuth();
  
  return useQuery({
    queryKey: ['import-logs', church?.id],
    queryFn: () => importExportAPI.listLogs().then(res => res.data),
    enabled: !!church?.id,
  });
};

// Photo upload
export const useUploadPhotos = () => {
  const queryClient = useQueryClient();
  const { church } = useAuth();
  
  return useMutation({
    mutationFn: (file) => importExportAPI.uploadPhotos(file).then(res => res.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.members.all(church?.id) });
      toast.success(`Successfully matched ${data.updated_count} photos`);
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Photo upload failed');
    },
  });
};

// Document upload
export const useUploadDocuments = () => {
  const queryClient = useQueryClient();
  const { church } = useAuth();
  
  return useMutation({
    mutationFn: (file) => importExportAPI.uploadDocuments(file).then(res => res.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.members.all(church?.id) });
      toast.success(`Successfully matched ${data.updated_count} documents`);
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Document upload failed');
    },
  });
};

// Cleanup hook
export const useCleanupUploads = () => {
  return useMutation({
    mutationFn: (memberIds) => importExportAPI.cleanupTempUploads(memberIds),
    onError: (error) => {
      console.error('Cleanup failed:', error);
    },
  });
};

// Face descriptor hooks (for import and migration)
export const useUpdateFaceDescriptor = () => {
  return useMutation({
    mutationFn: (data) => importExportAPI.updateFaceDescriptor(data).then(res => res.data),
    onError: (error) => {
      console.error('Face descriptor update failed:', error);
    },
  });
};

export const useBulkUpdateFaceDescriptors = () => {
  const queryClient = useQueryClient();
  const { church } = useAuth();

  return useMutation({
    mutationFn: (updates) => importExportAPI.bulkUpdateFaceDescriptors(updates).then(res => res.data),
    onSuccess: (data) => {
      if (data.updated > 0) {
        toast.success(`Face descriptors generated for ${data.updated} members`);
      }
      // Invalidate all member-related queries to refresh has_face_descriptors
      queryClient.invalidateQueries({ queryKey: queryKeys.members.all(church?.id) });
      queryClient.invalidateQueries({ queryKey: ['members-needing-face-descriptors', church?.id] });
      queryClient.invalidateQueries({ queryKey: ['members-with-photos', church?.id] });
    },
    onError: (error) => {
      toast.error('Failed to update face descriptors');
    },
  });
};

export const useMembersNeedingFaceDescriptors = () => {
  const { church } = useAuth();

  return useQuery({
    queryKey: ['members-needing-face-descriptors', church?.id],
    queryFn: () => importExportAPI.getMembersNeedingFaceDescriptors().then(res => res.data),
    enabled: !!church?.id,
  });
};

export const useMembersWithPhotos = () => {
  const { church } = useAuth();

  return useQuery({
    queryKey: ['members-with-photos', church?.id],
    queryFn: () => importExportAPI.getMembersWithPhotos().then(res => res.data),
    enabled: !!church?.id,
  });
};
