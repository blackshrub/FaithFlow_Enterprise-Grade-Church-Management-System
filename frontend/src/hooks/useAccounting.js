import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import * as accountingApi from '../services/accountingApi';

// Helper to get session church ID for cache isolation (supports super admin church switching)
const useSessionChurchId = () => {
  const { user } = useAuth();
  return user?.session_church_id ?? user?.church_id;
};

// ============================================
// CHART OF ACCOUNTS HOOKS
// ============================================

export const useChartOfAccounts = (params = {}) => {
  const sessionChurchId = useSessionChurchId();

  return useQuery({
    queryKey: ['coa', sessionChurchId, params],
    queryFn: async () => {
      const response = await accountingApi.getCOA(params);
      return response.data;
    },
    enabled: !!sessionChurchId
  });
};

export const useCOATree = () => {
  const sessionChurchId = useSessionChurchId();
  
  return useQuery({
    queryKey: ['coa-tree', sessionChurchId],
    queryFn: async () => {
      const response = await accountingApi.getCOATree();
      return response.data;
    },
    enabled: !!sessionChurchId
  });
};

export const useCOA = (id) => {
  const sessionChurchId = useSessionChurchId();
  
  return useQuery({
    queryKey: ['coa', sessionChurchId, id],
    queryFn: async () => {
      const response = await accountingApi.getCOAById(id);
      return response.data;
    },
    enabled: !!sessionChurchId && !!id
  });
};

export const useCreateCOA = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();
  
  return useMutation({
    mutationFn: accountingApi.createCOA,
    onSuccess: () => {
      queryClient.invalidateQueries(['coa', sessionChurchId]);
      queryClient.invalidateQueries(['coa-tree', sessionChurchId]);
    }
  });
};

export const useUpdateCOA = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();
  
  return useMutation({
    mutationFn: ({ id, data }) => accountingApi.updateCOA(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries(['coa', sessionChurchId]);
      queryClient.invalidateQueries(['coa-tree', sessionChurchId]);
      queryClient.invalidateQueries(['coa', sessionChurchId, variables.id]);
    }
  });
};

export const useDeleteCOA = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();
  
  return useMutation({
    mutationFn: accountingApi.deleteCOA,
    onSuccess: () => {
      queryClient.invalidateQueries(['coa', sessionChurchId]);
      queryClient.invalidateQueries(['coa-tree', sessionChurchId]);
    }
  });
};

export const useSeedDefaultCOA = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();
  
  return useMutation({
    mutationFn: accountingApi.seedDefaultCOA,
    onSuccess: () => {
      queryClient.invalidateQueries(['coa', sessionChurchId]);
      queryClient.invalidateQueries(['coa-tree', sessionChurchId]);
    }
  });
};

// ============================================
// RESPONSIBILITY CENTER HOOKS
// ============================================

export const useResponsibilityCenters = (params = {}) => {
  const sessionChurchId = useSessionChurchId();
  
  return useQuery({
    queryKey: ['responsibility-centers', sessionChurchId, params],
    queryFn: async () => {
      const response = await accountingApi.getResponsibilityCenters(params);
      return response.data;
    },
    enabled: !!sessionChurchId
  });
};

export const useCreateResponsibilityCenter = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();
  
  return useMutation({
    mutationFn: accountingApi.createResponsibilityCenter,
    onSuccess: () => {
      queryClient.invalidateQueries(['responsibility-centers', sessionChurchId]);
    }
  });
};

export const useUpdateResponsibilityCenter = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();
  
  return useMutation({
    mutationFn: ({ id, data }) => accountingApi.updateResponsibilityCenter(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['responsibility-centers', sessionChurchId]);
    }
  });
};

export const useDeleteResponsibilityCenter = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();
  
  return useMutation({
    mutationFn: accountingApi.deleteResponsibilityCenter,
    onSuccess: () => {
      queryClient.invalidateQueries(['responsibility-centers', sessionChurchId]);
    }
  });
};

// ============================================
// JOURNAL HOOKS
// ============================================

export const useJournals = (params = {}) => {
  const sessionChurchId = useSessionChurchId();
  
  return useQuery({
    queryKey: ['journals', sessionChurchId, params],
    queryFn: async () => {
      const response = await accountingApi.getJournals(params);
      return response.data;
    },
    enabled: !!sessionChurchId
  });
};

export const useJournal = (id) => {
  const sessionChurchId = useSessionChurchId();
  
  return useQuery({
    queryKey: ['journal', sessionChurchId, id],
    queryFn: async () => {
      const response = await accountingApi.getJournalById(id);
      return response.data;
    },
    enabled: !!sessionChurchId && !!id
  });
};

export const useCreateJournal = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();
  
  return useMutation({
    mutationFn: accountingApi.createJournal,
    onSuccess: () => {
      queryClient.invalidateQueries(['journals', sessionChurchId]);
    }
  });
};

export const useUpdateJournal = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();
  
  return useMutation({
    mutationFn: ({ id, data }) => accountingApi.updateJournal(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries(['journals', sessionChurchId]);
      queryClient.invalidateQueries(['journal', sessionChurchId, variables.id]);
    }
  });
};

export const useApproveJournal = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();
  
  return useMutation({
    mutationFn: accountingApi.approveJournal,
    onSuccess: () => {
      queryClient.invalidateQueries(['journals', sessionChurchId]);
    }
  });
};

export const useDeleteJournal = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();
  
  return useMutation({
    mutationFn: accountingApi.deleteJournal,
    onSuccess: () => {
      queryClient.invalidateQueries(['journals', sessionChurchId]);
    }
  });
};

// ============================================
// FISCAL PERIOD HOOKS
// ============================================

export const useFiscalPeriods = (params = {}) => {
  const sessionChurchId = useSessionChurchId();
  
  return useQuery({
    queryKey: ['fiscal-periods', sessionChurchId, params],
    queryFn: async () => {
      const response = await accountingApi.getFiscalPeriods(params);
      return response.data;
    },
    enabled: !!sessionChurchId
  });
};

export const useCurrentPeriod = () => {
  const sessionChurchId = useSessionChurchId();
  
  return useQuery({
    queryKey: ['current-period', sessionChurchId],
    queryFn: async () => {
      const response = await accountingApi.getCurrentPeriod();
      return response.data;
    },
    enabled: !!sessionChurchId,
    refetchInterval: 60000 // Refresh every minute
  });
};

export const useClosePeriod = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();
  
  return useMutation({
    mutationFn: ({ month, year }) => accountingApi.closeFiscalPeriod(month, year),
    onSuccess: () => {
      queryClient.invalidateQueries(['fiscal-periods', sessionChurchId]);
      queryClient.invalidateQueries(['current-period', sessionChurchId]);
    }
  });
};

export const useLockPeriod = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();
  
  return useMutation({
    mutationFn: ({ month, year }) => accountingApi.lockFiscalPeriod(month, year),
    onSuccess: () => {
      queryClient.invalidateQueries(['fiscal-periods', sessionChurchId]);
      queryClient.invalidateQueries(['current-period', sessionChurchId]);
    }
  });
};

export const useUnlockPeriod = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();
  
  return useMutation({
    mutationFn: ({ month, year }) => accountingApi.unlockFiscalPeriod(month, year),
    onSuccess: () => {
      queryClient.invalidateQueries(['fiscal-periods', sessionChurchId]);
      queryClient.invalidateQueries(['current-period', sessionChurchId]);
    }
  });
};

// ============================================
// QUICK ENTRY HOOKS
// ============================================

export const useCreateWeeklyGiving = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();
  
  return useMutation({
    mutationFn: accountingApi.createWeeklyGiving,
    onSuccess: () => {
      queryClient.invalidateQueries(['journals', sessionChurchId]);
    }
  });
};

export const useCreateOutgoingMoney = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();
  
  return useMutation({
    mutationFn: accountingApi.createOutgoingMoney,
    onSuccess: () => {
      queryClient.invalidateQueries(['journals', sessionChurchId]);
    }
  });
};

// ============================================
// BUDGET HOOKS
// ============================================

export const useBudgets = (params = {}) => {
  const sessionChurchId = useSessionChurchId();
  
  return useQuery({
    queryKey: ['budgets', sessionChurchId, params],
    queryFn: async () => {
      const response = await accountingApi.getBudgets(params);
      return response.data;
    },
    enabled: !!sessionChurchId
  });
};

export const useBudget = (id) => {
  const sessionChurchId = useSessionChurchId();
  
  return useQuery({
    queryKey: ['budget', sessionChurchId, id],
    queryFn: async () => {
      const response = await accountingApi.getBudgetById(id);
      return response.data;
    },
    enabled: !!sessionChurchId && !!id
  });
};

export const useCreateBudget = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();
  
  return useMutation({
    mutationFn: accountingApi.createBudget,
    onSuccess: () => {
      queryClient.invalidateQueries(['budgets', sessionChurchId]);
    }
  });
};

export const useActivateBudget = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();
  
  return useMutation({
    mutationFn: accountingApi.activateBudget,
    onSuccess: () => {
      queryClient.invalidateQueries(['budgets', sessionChurchId]);
    }
  });
};

export const useBudgetVariance = (budgetId, month, year) => {
  const sessionChurchId = useSessionChurchId();
  
  return useQuery({
    queryKey: ['budget-variance', sessionChurchId, budgetId, month, year],
    queryFn: async () => {
      const response = await accountingApi.getBudgetVariance(budgetId, month, year);
      return response.data;
    },
    enabled: !!sessionChurchId && !!budgetId && !!month && !!year
  });
};

// ============================================
// FIXED ASSET HOOKS
// ============================================

export const useAssets = (params = {}) => {
  const sessionChurchId = useSessionChurchId();
  
  return useQuery({
    queryKey: ['assets', sessionChurchId, params],
    queryFn: async () => {
      const response = await accountingApi.getAssets(params);
      return response.data;
    },
    enabled: !!sessionChurchId
  });
};

export const useCreateAsset = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();
  
  return useMutation({
    mutationFn: accountingApi.createAsset,
    onSuccess: () => {
      queryClient.invalidateQueries(['assets', sessionChurchId]);
    }
  });
};

export const useRunDepreciation = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();
  
  return useMutation({
    mutationFn: ({ month, year }) => accountingApi.runMonthlyDepreciation(month, year),
    onSuccess: () => {
      queryClient.invalidateQueries(['assets', sessionChurchId]);
      queryClient.invalidateQueries(['journals', sessionChurchId]);
    }
  });
};

export const useDepreciationSchedule = (assetId) => {
  const sessionChurchId = useSessionChurchId();
  
  return useQuery({
    queryKey: ['depreciation-schedule', sessionChurchId, assetId],
    queryFn: async () => {
      const response = await accountingApi.getDepreciationSchedule(assetId);
      return response.data;
    },
    enabled: !!sessionChurchId && !!assetId
  });
};

// ============================================
// BANK HOOKS
// ============================================

export const useBankAccounts = () => {
  const sessionChurchId = useSessionChurchId();
  
  return useQuery({
    queryKey: ['bank-accounts', sessionChurchId],
    queryFn: async () => {
      const response = await accountingApi.getBankAccounts();
      return response.data;
    },
    enabled: !!sessionChurchId
  });
};

export const useBankTransactions = (params = {}) => {
  const sessionChurchId = useSessionChurchId();
  
  return useQuery({
    queryKey: ['bank-transactions', sessionChurchId, params],
    queryFn: async () => {
      const response = await accountingApi.getBankTransactions(params);
      return response.data;
    },
    enabled: !!sessionChurchId
  });
};

export const useImportBankTransactions = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();
  
  return useMutation({
    mutationFn: ({ bankAccountId, file }) => accountingApi.importBankTransactions(bankAccountId, file),
    onSuccess: () => {
      queryClient.invalidateQueries(['bank-transactions', sessionChurchId]);
    }
  });
};

// ============================================
// BEGINNING BALANCE HOOKS
// ============================================

export const useBeginningBalances = () => {
  const sessionChurchId = useSessionChurchId();
  
  return useQuery({
    queryKey: ['beginning-balances', sessionChurchId],
    queryFn: async () => {
      const response = await accountingApi.getBeginningBalances();
      return response.data;
    },
    enabled: !!sessionChurchId
  });
};

export const useCreateBeginningBalance = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();
  
  return useMutation({
    mutationFn: accountingApi.createBeginningBalance,
    onSuccess: () => {
      queryClient.invalidateQueries(['beginning-balances', sessionChurchId]);
    }
  });
};

export const usePostBeginningBalance = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();
  
  return useMutation({
    mutationFn: accountingApi.postBeginningBalance,
    onSuccess: () => {
      queryClient.invalidateQueries(['beginning-balances', sessionChurchId]);
      queryClient.invalidateQueries(['journals', sessionChurchId]);
    }
  });
};

// ============================================
// YEAR-END CLOSING HOOKS
// ============================================

export const useYearEndClosingStatus = (year) => {
  const sessionChurchId = useSessionChurchId();
  
  return useQuery({
    queryKey: ['year-end-status', sessionChurchId, year],
    queryFn: async () => {
      const response = await accountingApi.getYearEndClosingStatus(year);
      return response.data;
    },
    enabled: !!sessionChurchId && !!year
  });
};

export const useRunYearEndClosing = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();
  
  return useMutation({
    mutationFn: ({ year, retainedEarningsAccountId }) => 
      accountingApi.runYearEndClosing(year, retainedEarningsAccountId),
    onSuccess: () => {
      queryClient.invalidateQueries(['year-end-status', sessionChurchId]);
      queryClient.invalidateQueries(['fiscal-periods', sessionChurchId]);
      queryClient.invalidateQueries(['journals', sessionChurchId]);
    }
  });
};

// ============================================
// REPORT HOOKS
// ============================================

export const useGeneralLedger = (params) => {
  const sessionChurchId = useSessionChurchId();
  
  return useQuery({
    queryKey: ['general-ledger', sessionChurchId, params],
    queryFn: async () => {
      const response = await accountingApi.getGeneralLedger(params);
      return response.data;
    },
    enabled: !!sessionChurchId && !!params?.start_date && !!params?.end_date
  });
};

export const useTrialBalance = (asOfDate) => {
  const sessionChurchId = useSessionChurchId();
  
  return useQuery({
    queryKey: ['trial-balance', sessionChurchId, asOfDate],
    queryFn: async () => {
      const response = await accountingApi.getTrialBalance({ as_of_date: asOfDate });
      return response.data;
    },
    enabled: !!sessionChurchId && !!asOfDate
  });
};

export const useIncomeStatement = (startDate, endDate) => {
  const sessionChurchId = useSessionChurchId();
  
  return useQuery({
    queryKey: ['income-statement', sessionChurchId, startDate, endDate],
    queryFn: async () => {
      const response = await accountingApi.getIncomeStatement({ 
        start_date: startDate, 
        end_date: endDate 
      });
      return response.data;
    },
    enabled: !!sessionChurchId && !!startDate && !!endDate
  });
};

export const useBalanceSheet = (asOfDate) => {
  const sessionChurchId = useSessionChurchId();
  
  return useQuery({
    queryKey: ['balance-sheet', sessionChurchId, asOfDate],
    queryFn: async () => {
      const response = await accountingApi.getBalanceSheet({ as_of_date: asOfDate });
      return response.data;
    },
    enabled: !!sessionChurchId && !!asOfDate
  });
};

// ============================================
// AUDIT LOG HOOKS
// ============================================

export const useAuditLogs = (params = {}) => {
  const sessionChurchId = useSessionChurchId();
  
  return useQuery({
    queryKey: ['audit-logs', sessionChurchId, params],
    queryFn: async () => {
      const response = await accountingApi.getAuditLogs(params);
      return response.data;
    },
    enabled: !!sessionChurchId
  });
};

// ============================================
// FILE HOOKS
// ============================================

export const useUploadFile = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ file, referenceType, referenceId }) => 
      accountingApi.uploadFile(file, referenceType, referenceId),
    onSuccess: (_, variables) => {
      if (variables.referenceId) {
        queryClient.invalidateQueries(['files', variables.referenceType, variables.referenceId]);
      }
    }
  });
};

export const useFilesByReference = (referenceType, referenceId) => {
  return useQuery({
    queryKey: ['files', referenceType, referenceId],
    queryFn: async () => {
      const response = await accountingApi.getFilesByReference(referenceType, referenceId);
      return response.data;
    },
    enabled: !!referenceType && !!referenceId
  });
};

export const useDeleteFile = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: accountingApi.deleteFile,
    onSuccess: () => {
      queryClient.invalidateQueries(['files']);
    }
  });
};
