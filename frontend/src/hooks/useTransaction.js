import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import transactionService from '../services/transactionService';

// Danh sách dịch vụ
export const useServices = (actionType = 'none') => {
  return useQuery({
    queryKey: ['services', actionType],
    queryFn: () => transactionService.getServices(actionType),
    staleTime: 10 * 60 * 1000, // Dịch vụ ít thay đổi, cache 10 phút
  });
};

// Danh sách Billers
export const useBillers = () => {
  return useQuery({
    queryKey: ['billers'],
    queryFn: transactionService.getBillers,
    staleTime: 10 * 60 * 1000,
  });
};

// Giao dịch 3 bước
export const useRequestTransaction = () => {
  return useMutation({
    mutationFn: transactionService.requestTransaction,
  });
};

export const useConfirmTransaction = () => {
  return useMutation({
    mutationFn: transactionService.confirmTransaction,
  });
};

export const useVerifyTransaction = () => {
  return useMutation({
    mutationFn: transactionService.verifyTransaction,
  });
};

// Lịch sử giao dịch
export const useCustomerHistory = (params) => {
  return useQuery({
    queryKey: ['customerHistory', params],
    queryFn: () => transactionService.getHistory(params),
    keepPreviousData: true, // Giúp chuyển trang không bị giật
  });
};

// Danh sách ngân hàng liên kết
export const useLinkedBanks = () => {
  return useQuery({
    queryKey: ['linkedBanks'],
    queryFn: transactionService.getLinkedBanks,
  });
};

export const useLinkBank = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: transactionService.linkBank,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['linkedBanks'] });
      queryClient.invalidateQueries({ queryKey: ['customerDashboard'] });
    }
  });
};

export const useUnlinkBank = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: transactionService.unlinkBank,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['linkedBanks'] });
    }
  });
};
