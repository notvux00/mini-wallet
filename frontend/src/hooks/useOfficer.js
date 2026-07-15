import { useQuery, useMutation } from '@tanstack/react-query';
import officerService from '../services/officerService';

// 1. Dashboard
export const useDashboardStats = () => {
  return useQuery({
    queryKey: ['officerDashboardStats'],
    queryFn: officerService.getDashboardStats,
  });
};

// 2. Customers
export const useCustomers = (params) => {
  return useQuery({
    queryKey: ['officerCustomers', params],
    queryFn: () => officerService.getCustomers(params),
    keepPreviousData: true,
  });
};

// 3. Pockets
export const usePockets = (params) => {
  return useQuery({
    queryKey: ['officerPockets', params],
    queryFn: () => officerService.getPockets(params),
    keepPreviousData: true,
  });
};

export const useCreatePocket = () => {
  return useMutation({
    mutationFn: officerService.createPocket,
  });
};

export const useTogglePocketStatus = () => {
  return useMutation({
    mutationFn: officerService.togglePocketStatus,
  });
};

// 4. Services
export const useServices = (params) => {
  return useQuery({
    queryKey: ['officerServices', params],
    queryFn: () => officerService.getServices(params),
  });
};


export const useServiceDetail = (params, options = {}) => {
  return useQuery({
    queryKey: ['officerServiceDetail', params],
    queryFn: () => officerService.getServiceDetail(params),
    enabled: !!params?.id,
    ...options
  });
};

export const useCreateService = () => {
  return useMutation({
    mutationFn: officerService.createService,
  });
};

export const useUpdateService = () => {
  return useMutation({
    mutationFn: officerService.updateService,
  });
};

export const useToggleServiceStatus = () => {
  return useMutation({
    mutationFn: officerService.toggleServiceStatus,
  });
};

// 5. Billers
export const useBillers = (params) => {
  return useQuery({
    queryKey: ['officerBillers', params],
    queryFn: () => officerService.getBillers(params),
    keepPreviousData: true,
  });
};

export const useCreateBiller = () => {
  return useMutation({
    mutationFn: officerService.createBiller,
  });
};

export const useUpdateBiller = () => {
  return useMutation({
    mutationFn: officerService.updateBiller,
  });
};

export const useToggleBillerStatus = () => {
  return useMutation({
    mutationFn: officerService.toggleBillerStatus,
  });
};

// 6. Banks
export const useBanks = (params) => {
  return useQuery({
    queryKey: ['officerBanks', params],
    queryFn: () => officerService.getBanks(params),
    keepPreviousData: true,
  });
};

export const useCreateBank = () => {
  return useMutation({
    mutationFn: officerService.createBank,
  });
};

// 7. Transactions
export const useTransactions = (params) => {
  return useQuery({
    queryKey: ['officerTransactions', params],
    queryFn: () => officerService.getTransactions(params),
    keepPreviousData: true,
  });
};

export const useExecuteTransaction = () => {
  return useMutation({
    mutationFn: officerService.executeTransaction,
  });
};

// 8. Trails & Entries
export const useTrails = (params) => {
  return useQuery({
    queryKey: ['officerTrails', params],
    queryFn: () => officerService.getTrails(params),
    keepPreviousData: true,
  });
};

export const usePocketEntries = (params) => {
  return useQuery({
    queryKey: ['officerPocketEntries', params],
    queryFn: () => officerService.getPocketEntries(params),
    keepPreviousData: true,
  });
};
