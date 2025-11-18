import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import * as accountingApi from '../services/accountingApi';

// ============================================
// CHART OF ACCOUNTS HOOKS
// ============================================

export const useChartOfAccounts = (params = {}) => {
  const { user } = useContext(AuthContext);
  const churchId = user?.church_id;
  
  return useQuery({
    queryKey: ['coa', churchId, params],
    queryFn: async () => {
      const response = await accountingApi.getCOA(params);
      return response.data;
    },
    enabled: !!churchId
  });
};

export const useCOATree = () => {
  const { user } = useContext(AuthContext);
  const churchId = user?.church_id;
  
  return useQuery({
    queryKey: ['coa-tree', churchId],
    queryFn: async () => {
      const response = await accountingApi.getCOATree();
      return response.data;
    },
    enabled: !!churchId
  });
};

export const useCOA = (id) => {
  const { user } = useContext(AuthContext);
  const churchId = user?.church_id;
  
  return useQuery({
    queryKey: ['coa', churchId, id],
    queryFn: async () => {
      const response = await accountingApi.getCOAById(id);
      return response.data;
    },
    enabled: !!churchId && !!id
  });
};

export const useCreateCOA = () => {
  const queryClient = useQueryClient();
  const { user } = useContext(AuthContext);
  const churchId = user?.church_id;
  
  return useMutation({
    mutationFn: accountingApi.createCOA,
    onSuccess: () => {
      queryClient.invalidateQueries(['coa', churchId]);
      queryClient.invalidateQueries(['coa-tree', churchId]);
    }
  });
};

export const useUpdateCOA = () => {
  const queryClient = useQueryClient();
  const { user } = useContext(AuthContext);
  const churchId = user?.church_id;
  
  return useMutation({
    mutationFn: ({ id, data }) => accountingApi.updateCOA(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries(['coa', churchId]);
      queryClient.invalidateQueries(['coa-tree', churchId]);
      queryClient.invalidateQueries(['coa', churchId, variables.id]);
    }
  });
};

export const useDeleteCOA = () => {
  const queryClient = useQueryClient();
  const { user } = useContext(AuthContext);
  const churchId = user?.church_id;
  
  return useMutation({
    mutationFn: accountingApi.deleteCOA,
    onSuccess: () => {
      queryClient.invalidateQueries(['coa', churchId]);
      queryClient.invalidateQueries(['coa-tree', churchId]);
    }
  });
};

export const useSeedDefaultCOA = () => {
  const queryClient = useQueryClient();
  const { user } = useContext(AuthContext);
  const churchId = user?.church_id;
  
  return useMutation({
    mutationFn: accountingApi.seedDefaultCOA,
    onSuccess: () => {
      queryClient.invalidateQueries(['coa', churchId]);
      queryClient.invalidateQueries(['coa-tree', churchId]);
    }
  });
};

// ============================================
// RESPONSIBILITY CENTER HOOKS
// ============================================

export const useResponsibilityCenters = (params = {}) => {
  const { user } = useContext(AuthContext);
  const churchId = user?.church_id;
  
  return useQuery({
    queryKey: ['responsibility-centers', churchId, params],
    queryFn: async () => {
      const response = await accountingApi.getResponsibilityCenters(params);
      return response.data;
    },
    enabled: !!churchId
  });
};

export const useCreateResponsibilityCenter = () => {
  const queryClient = useQueryClient();
  const { user } = useContext(AuthContext);
  const churchId = user?.church_id;
  
  return useMutation({
    mutationFn: accountingApi.createResponsibilityCenter,
    onSuccess: () => {
      queryClient.invalidateQueries(['responsibility-centers', churchId]);
    }
  });
};

export const useUpdateResponsibilityCenter = () => {
  const queryClient = useQueryClient();
  const { user } = useContext(AuthContext);
  const churchId = user?.church_id;
  
  return useMutation({
    mutationFn: ({ id, data }) => accountingApi.updateResponsibilityCenter(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['responsibility-centers', churchId]);
    }
  });
};

export const useDeleteResponsibilityCenter = () => {
  const queryClient = useQueryClient();
  const { user } = useContext(AuthContext);
  const churchId = user?.church_id;
  
  return useMutation({
    mutationFn: accountingApi.deleteResponsibilityCenter,
    onSuccess: () => {
      queryClient.invalidateQueries(['responsibility-centers', churchId]);
    }
  });
};

// ============================================
// JOURNAL HOOKS
// ============================================

export const useJournals = (params = {}) => {
  const { user } = useContext(AuthContext);
  const churchId = user?.church_id;
  
  return useQuery({
    queryKey: ['journals', churchId, params],
    queryFn: async () => {
      const response = await accountingApi.getJournals(params);
      return response.data;
    },
    enabled: !!churchId
  });
};

export const useJournal = (id) => {
  const { user } = useContext(AuthContext);
  const churchId = user?.church_id;
  
  return useQuery({
    queryKey: ['journal', churchId, id],
    queryFn: async () => {
      const response = await accountingApi.getJournalById(id);
      return response.data;
    },
    enabled: !!churchId && !!id
  });
};

export const useCreateJournal = () => {
  const queryClient = useQueryClient();
  const { user } = useContext(AuthContext);
  const churchId = user?.church_id;
  
  return useMutation({
    mutationFn: accountingApi.createJournal,
    onSuccess: () => {
      queryClient.invalidateQueries(['journals', churchId]);
    }
  });
};

export const useUpdateJournal = () => {
  const queryClient = useQueryClient();
  const { user } = useContext(AuthContext);
  const churchId = user?.church_id;
  
  return useMutation({
    mutationFn: ({ id, data }) => accountingApi.updateJournal(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries(['journals', churchId]);
      queryClient.invalidateQueries(['journal', churchId, variables.id]);
    }
  });
};

export const useApproveJournal = () => {
  const queryClient = useQueryClient();
  const { user } = useContext(AuthContext);
  const churchId = user?.church_id;
  
  return useMutation({
    mutationFn: accountingApi.approveJournal,
    onSuccess: () => {
      queryClient.invalidateQueries(['journals', churchId]);
    }
  });
};

export const useDeleteJournal = () => {
  const queryClient = useQueryClient();
  const { user } = useContext(AuthContext);
  const churchId = user?.church_id;
  
  return useMutation({
    mutationFn: accountingApi.deleteJournal,
    onSuccess: () => {
      queryClient.invalidateQueries(['journals', churchId]);
    }
  });
};

// ============================================
// FISCAL PERIOD HOOKS
// ============================================

export const useFiscalPeriods = (params = {}) => {
  const { user } = useContext(AuthContext);
  const churchId = user?.church_id;
  
  return useQuery({
    queryKey: ['fiscal-periods', churchId, params],
    queryFn: async () => {
      const response = await accountingApi.getFiscalPeriods(params);
      return response.data;
    },
    enabled: !!churchId
  });
};

export const useCurrentPeriod = () => {
  const { user } = useContext(AuthContext);
  const churchId = user?.church_id;
  
  return useQuery({
    queryKey: ['current-period', churchId],
    queryFn: async () => {
      const response = await accountingApi.getCurrentPeriod();
      return response.data;
    },
    enabled: !!churchId,
    refetchInterval: 60000 // Refresh every minute
  });
};

export const useClosePeriod = () => {
  const queryClient = useQueryClient();
  const { user } = useContext(AuthContext);
  const churchId = user?.church_id;
  
  return useMutation({
    mutationFn: ({ month, year }) => accountingApi.closeFiscalPeriod(month, year),
    onSuccess: () => {
      queryClient.invalidateQueries(['fiscal-periods', churchId]);
      queryClient.invalidateQueries(['current-period', churchId]);
    }
  });
};

export const useLockPeriod = () => {
  const queryClient = useQueryClient();
  const { user } = useContext(AuthContext);
  const churchId = user?.church_id;
  
  return useMutation({
    mutationFn: ({ month, year }) => accountingApi.lockFiscalPeriod(month, year),
    onSuccess: () => {
      queryClient.invalidateQueries(['fiscal-periods', churchId]);
      queryClient.invalidateQueries(['current-period', churchId]);
    }
  });
};

export const useUnlockPeriod = () => {
  const queryClient = useQueryClient();
  const { user } = useContext(AuthContext);
  const churchId = user?.church_id;
  
  return useMutation({
    mutationFn: ({ month, year }) => accountingApi.unlockFiscalPeriod(month, year),
    onSuccess: () => {
      queryClient.invalidateQueries(['fiscal-periods', churchId]);
      queryClient.invalidateQueries(['current-period', churchId]);
    }
  });
};

// ============================================
// QUICK ENTRY HOOKS
// ============================================

export const useCreateWeeklyGiving = () => {
  const queryClient = useQueryClient();
  const { user } = useContext(AuthContext);
  const churchId = user?.church_id;
  
  return useMutation({
    mutationFn: accountingApi.createWeeklyGiving,
    onSuccess: () => {
      queryClient.invalidateQueries(['journals', churchId]);
    }
  });
};

export const useCreateOutgoingMoney = () => {
  const queryClient = useQueryClient();
  const { user } = useContext(AuthContext);
  const churchId = user?.church_id;
  
  return useMutation({
    mutationFn: accountingApi.createOutgoingMoney,
    onSuccess: () => {
      queryClient.invalidateQueries(['journals', churchId]);
    }
  });
};

// ============================================
// BUDGET HOOKS
// ============================================

export const useBudgets = (params = {}) => {
  const { user } = useContext(AuthContext);
  const churchId = user?.church_id;
  
  return useQuery({
    queryKey: ['budgets', churchId, params],
    queryFn: async () => {
      const response = await accountingApi.getBudgets(params);
      return response.data;
    },
    enabled: !!churchId
  });
};

export const useBudget = (id) => {
  const { user } = useContext(AuthContext);
  const churchId = user?.church_id;
  
  return useQuery({
    queryKey: ['budget', churchId, id],
    queryFn: async () => {
      const response = await accountingApi.getBudgetById(id);
      return response.data;
    },
    enabled: !!churchId && !!id
  });
};

export const useCreateBudget = () => {
  const queryClient = useQueryClient();
  const { user } = useContext(AuthContext);
  const churchId = user?.church_id;
  
  return useMutation({
    mutationFn: accountingApi.createBudget,
    onSuccess: () => {
      queryClient.invalidateQueries(['budgets', churchId]);
    }
  });
};

export const useActivateBudget = () => {
  const queryClient = useQueryClient();
  const { user } = useContext(AuthContext);
  const churchId = user?.church_id;
  
  return useMutation({
    mutationFn: accountingApi.activateBudget,
    onSuccess: () => {
      queryClient.invalidateQueries(['budgets', churchId]);
    }
  });
};

export const useBudgetVariance = (budgetId, month, year) => {
  const { user } = useContext(AuthContext);
  const churchId = user?.church_id;
  
  return useQuery({
    queryKey: ['budget-variance', churchId, budgetId, month, year],
    queryFn: async () => {
      const response = await accountingApi.getBudgetVariance(budgetId, month, year);
      return response.data;
    },
    enabled: !!churchId && !!budgetId && !!month && !!year
  });
};

// ============================================
// FIXED ASSET HOOKS
// ============================================

export const useAssets = (params = {}) => {
  const { user } = useContext(AuthContext);
  const churchId = user?.church_id;
  
  return useQuery({
    queryKey: ['assets', churchId, params],
    queryFn: async () => {
      const response = await accountingApi.getAssets(params);
      return response.data;
    },
    enabled: !!churchId
  });
};

export const useCreateAsset = () => {
  const queryClient = useQueryClient();
  const { user } = useContext(AuthContext);
  const churchId = user?.church_id;
  
  return useMutation({
    mutationFn: accountingApi.createAsset,
    onSuccess: () => {
      queryClient.invalidateQueries(['assets', churchId]);
    }
  });
};

export const useRunDepreciation = () => {
  const queryClient = useQueryClient();
  const { user } = useContext(AuthContext);
  const churchId = user?.church_id;
  
  return useMutation({
    mutationFn: ({ month, year }) => accountingApi.runMonthlyDepreciation(month, year),
    onSuccess: () => {
      queryClient.invalidateQueries(['assets', churchId]);
      queryClient.invalidateQueries(['journals', churchId]);
    }
  });
};

export const useDepreciationSchedule = (assetId) => {
  const { user } = useContext(AuthContext);
  const churchId = user?.church_id;
  
  return useQuery({
    queryKey: ['depreciation-schedule', churchId, assetId],
    queryFn: async () => {
      const response = await accountingApi.getDepreciationSchedule(assetId);
      return response.data;
    },
    enabled: !!churchId && !!assetId
  });
};

// ============================================
// BANK HOOKS
// ============================================

export const useBankAccounts = () => {
  const { user } = useContext(AuthContext);
  const churchId = user?.church_id;
  
  return useQuery({
    queryKey: ['bank-accounts', churchId],
    queryFn: async () => {
      const response = await accountingApi.getBankAccounts();
      return response.data;
    },
    enabled: !!churchId
  });
};

export const useBankTransactions = (params = {}) => {
  const { user } = useContext(AuthContext);
  const churchId = user?.church_id;
  
  return useQuery({
    queryKey: ['bank-transactions', churchId, params],
    queryFn: async () => {
      const response = await accountingApi.getBankTransactions(params);
      return response.data;
    },
    enabled: !!churchId
  });
};

export const useImportBankTransactions = () => {
  const queryClient = useQueryClient();
  const { user } = useContext(AuthContext);
  const churchId = user?.church_id;
  
  return useMutation({
    mutationFn: ({ bankAccountId, file }) => accountingApi.importBankTransactions(bankAccountId, file),
    onSuccess: () => {
      queryClient.invalidateQueries(['bank-transactions', churchId]);
    }
  });
};

// ============================================
// BEGINNING BALANCE HOOKS
// ============================================

export const useBeginningBalances = () => {
  const { user } = useContext(AuthContext);
  const churchId = user?.church_id;
  
  return useQuery({
    queryKey: ['beginning-balances', churchId],
    queryFn: async () => {
      const response = await accountingApi.getBeginningBalances();
      return response.data;
    },
    enabled: !!churchId
  });
};

export const useCreateBeginningBalance = () => {
  const queryClient = useQueryClient();
  const { user } = useContext(AuthContext);
  const churchId = user?.church_id;
  
  return useMutation({
    mutationFn: accountingApi.createBeginningBalance,
    onSuccess: () => {
      queryClient.invalidateQueries(['beginning-balances', churchId]);
    }
  });
};

export const usePostBeginningBalance = () => {
  const queryClient = useQueryClient();
  const { user } = useContext(AuthContext);
  const churchId = user?.church_id;
  
  return useMutation({
    mutationFn: accountingApi.postBeginningBalance,
    onSuccess: () => {
      queryClient.invalidateQueries(['beginning-balances', churchId]);
      queryClient.invalidateQueries(['journals', churchId]);
    }
  });
};

// ============================================
// YEAR-END CLOSING HOOKS
// ============================================

export const useYearEndClosingStatus = (year) => {
  const { user } = useContext(AuthContext);
  const churchId = user?.church_id;
  
  return useQuery({
    queryKey: ['year-end-status', churchId, year],
    queryFn: async () => {
      const response = await accountingApi.getYearEndClosingStatus(year);
      return response.data;
    },
    enabled: !!churchId && !!year
  });
};

export const useRunYearEndClosing = () => {
  const queryClient = useQueryClient();
  const { user } = useContext(AuthContext);
  const churchId = user?.church_id;
  
  return useMutation({
    mutationFn: ({ year, retainedEarningsAccountId }) => 
      accountingApi.runYearEndClosing(year, retainedEarningsAccountId),
    onSuccess: () => {
      queryClient.invalidateQueries(['year-end-status', churchId]);
      queryClient.invalidateQueries(['fiscal-periods', churchId]);
      queryClient.invalidateQueries(['journals', churchId]);
    }
  });
};

// ============================================
// REPORT HOOKS
// ============================================

export const useGeneralLedger = (params) => {
  const { user } = useContext(AuthContext);
  const churchId = user?.church_id;
  
  return useQuery({
    queryKey: ['general-ledger', churchId, params],
    queryFn: async () => {
      const response = await accountingApi.getGeneralLedger(params);
      return response.data;
    },
    enabled: !!churchId && !!params?.start_date && !!params?.end_date
  });
};

export const useTrialBalance = (asOfDate) => {
  const { user } = useContext(AuthContext);
  const churchId = user?.church_id;
  
  return useQuery({
    queryKey: ['trial-balance', churchId, asOfDate],
    queryFn: async () => {
      const response = await accountingApi.getTrialBalance({ as_of_date: asOfDate });
      return response.data;
    },
    enabled: !!churchId && !!asOfDate
  });
};

export const useIncomeStatement = (startDate, endDate) => {
  const { user } = useContext(AuthContext);
  const churchId = user?.church_id;
  
  return useQuery({
    queryKey: ['income-statement', churchId, startDate, endDate],
    queryFn: async () => {
      const response = await accountingApi.getIncomeStatement({ 
        start_date: startDate, 
        end_date: endDate 
      });
      return response.data;
    },
    enabled: !!churchId && !!startDate && !!endDate
  });
};

export const useBalanceSheet = (asOfDate) => {
  const { user } = useContext(AuthContext);
  const churchId = user?.church_id;
  
  return useQuery({
    queryKey: ['balance-sheet', churchId, asOfDate],
    queryFn: async () => {
      const response = await accountingApi.getBalanceSheet({ as_of_date: asOfDate });
      return response.data;
    },
    enabled: !!churchId && !!asOfDate
  });
};

// ============================================
// AUDIT LOG HOOKS
// ============================================

export const useAuditLogs = (params = {}) => {
  const { user } = useContext(AuthContext);
  const churchId = user?.church_id;
  
  return useQuery({
    queryKey: ['audit-logs', churchId, params],
    queryFn: async () => {
      const response = await accountingApi.getAuditLogs(params);
      return response.data;
    },
    enabled: !!churchId
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
