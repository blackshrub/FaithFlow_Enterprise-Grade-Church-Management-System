import { useQuery } from '@tanstack/react-query';
import { churchesAPI } from '../services/api';
import { queryKeys } from '../lib/react-query';
import { useAuth } from '../context/AuthContext';

// Hook to get all churches (public endpoint)
export const usePublicChurches = () => {
  return useQuery({
    queryKey: queryKeys.churches.public,
    queryFn: () => churchesAPI.listPublic().then(res => res.data),
  });
};

// Hook to get all churches (authenticated)
export const useChurches = () => {
  const { isAuthenticated } = useAuth();
  
  return useQuery({
    queryKey: queryKeys.churches.all,
    queryFn: () => churchesAPI.list().then(res => res.data),
    enabled: isAuthenticated,
  });
};

// Hook to get church by ID
export const useChurch = (churchId) => {
  const { isAuthenticated } = useAuth();
  
  return useQuery({
    queryKey: queryKeys.churches.detail(churchId),
    queryFn: () => churchesAPI.get(churchId).then(res => res.data),
    enabled: isAuthenticated && !!churchId,
  });
};
