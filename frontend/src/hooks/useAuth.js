import { useMutation } from '@tanstack/react-query';
import authService from '../services/authService';

export const useCustomerLogin = () => {
  return useMutation({
    mutationFn: authService.customerLogin,
  });
};

export const useCustomerRegister = () => {
  return useMutation({
    mutationFn: authService.customerRegister,
  });
};

export const useOfficerLogin = () => {
  return useMutation({
    mutationFn: authService.officerLogin,
  });
};
