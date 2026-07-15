import { useQuery, useMutation } from '@tanstack/react-query';
import customerService from '../services/customerService';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

export const useDashboard = () => {
  const { user } = useContext(AuthContext);

  return useQuery({
    queryKey: ['customerDashboard'],
    queryFn: customerService.getDashboard,
    enabled: !!user, // Chỉ chạy khi đã có user
  });
};

export const useLinkedBanks = () => {
  const { user } = useContext(AuthContext);

  return useQuery({
    queryKey: ['linkedBanks'],
    queryFn: customerService.getLinkedBanks,
    enabled: !!user,
  });
};

export const useRequestLinkBank = () => {
  return useMutation({
    mutationFn: customerService.requestLinkBank,
  });
};

export const useVerifyLinkBank = () => {
  return useMutation({
    mutationFn: customerService.verifyLinkBank,
  });
};

export const useUnlinkBank = () => {
  return useMutation({
    mutationFn: customerService.unlinkBank,
  });
};

export const useHistory = (params) => {
  const { user } = useContext(AuthContext);

  return useQuery({
    queryKey: ['customerHistory', params],
    queryFn: () => customerService.getHistory(params),
    enabled: !!user,
  });
};
