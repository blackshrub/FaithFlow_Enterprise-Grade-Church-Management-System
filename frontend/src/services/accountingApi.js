import api from './api';

const BASE_URL = '/v1/accounting';
const FILES_URL = '/v1/files';

// ============================================
// CHART OF ACCOUNTS
// ============================================

export const getCOA = (params = {}) => {
  return api.get(`${BASE_URL}/coa/`, { params });
};

export const getCOATree = () => {
  return api.get(`${BASE_URL}/coa/tree`);
};

export const getCOAById = (id) => {
  return api.get(`${BASE_URL}/coa/${id}`);
};

export const createCOA = (data) => {
  return api.post(`${BASE_URL}/coa/`, data);
};

export const updateCOA = (id, data) => {
  return api.put(`${BASE_URL}/coa/${id}`, data);
};

export const deleteCOA = (id) => {
  return api.delete(`${BASE_URL}/coa/${id}`);
};

export const seedDefaultCOA = () => {
  return api.post(`${BASE_URL}/coa/seed-default`);
};

// ============================================
// RESPONSIBILITY CENTERS
// ============================================

export const getResponsibilityCenters = (params = {}) => {
  return api.get(`${BASE_URL}/responsibility-centers/`, { params });
};

export const getResponsibilityCenterById = (id) => {
  return api.get(`${BASE_URL}/responsibility-centers/${id}`);
};

export const createResponsibilityCenter = (data) => {
  return api.post(`${BASE_URL}/responsibility-centers/`, data);
};

export const updateResponsibilityCenter = (id, data) => {
  return api.put(`${BASE_URL}/responsibility-centers/${id}`, data);
};

export const deleteResponsibilityCenter = (id) => {
  return api.delete(`${BASE_URL}/responsibility-centers/${id}`);
};

// ============================================
// JOURNALS
// ============================================

export const getJournals = (params = {}) => {
  // Ensure pagination params
  const paginatedParams = {
    limit: 50,
    offset: 0,
    ...params
  };
  return api.get(`${BASE_URL}/journals/`, { params: paginatedParams });
};

export const getJournalById = (id) => {
  return api.get(`${BASE_URL}/journals/${id}`);
};

export const createJournal = (data) => {
  return api.post(`${BASE_URL}/journals/`, data);
};

export const updateJournal = (id, data) => {
  return api.put(`${BASE_URL}/journals/${id}`, data);
};

export const approveJournal = (id) => {
  return api.post(`${BASE_URL}/journals/${id}/approve`);
};

export const deleteJournal = (id) => {
  return api.delete(`${BASE_URL}/journals/${id}`);
};

// ============================================
// FISCAL PERIODS
// ============================================

export const getFiscalPeriods = (params = {}) => {
  return api.get(`${BASE_URL}/fiscal-periods/list`, { params });
};

export const getCurrentPeriod = () => {
  return api.get(`${BASE_URL}/fiscal-periods/current`);
};

export const closeFiscalPeriod = (month, year) => {
  return api.post(`${BASE_URL}/fiscal-periods/close`, null, {
    params: { month, year }
  });
};

export const lockFiscalPeriod = (month, year) => {
  return api.post(`${BASE_URL}/fiscal-periods/lock`, null, {
    params: { month, year }
  });
};

export const unlockFiscalPeriod = (month, year) => {
  return api.post(`${BASE_URL}/fiscal-periods/unlock`, null, {
    params: { month, year }
  });
};

// ============================================
// QUICK ENTRIES
// ============================================

export const createWeeklyGiving = (data) => {
  return api.post(`${BASE_URL}/quick/weekly-giving`, data);
};

export const createOutgoingMoney = (data) => {
  return api.post(`${BASE_URL}/quick/outgoing-money`, data);
};

// ============================================
// BUDGETS
// ============================================

export const getBudgets = (params = {}) => {
  return api.get(`${BASE_URL}/budgets/`, { params });
};

export const getBudgetById = (id) => {
  return api.get(`${BASE_URL}/budgets/${id}`);
};

export const createBudget = (data) => {
  return api.post(`${BASE_URL}/budgets/`, data);
};

export const updateBudget = (id, data) => {
  return api.put(`${BASE_URL}/budgets/${id}`, data);
};

export const activateBudget = (id) => {
  return api.post(`${BASE_URL}/budgets/${id}/activate`);
};

export const distributeBudgetMonthly = (id) => {
  return api.post(`${BASE_URL}/budgets/${id}/distribute-monthly`);
};

export const getBudgetVariance = (id, month, year) => {
  return api.get(`${BASE_URL}/budgets/${id}/variance`, {
    params: { month, year }
  });
};

// ============================================
// FIXED ASSETS
// ============================================

export const getAssets = (params = {}) => {
  return api.get(`${BASE_URL}/assets/`, { params });
};

export const getAssetById = (id) => {
  return api.get(`${BASE_URL}/assets/${id}`);
};

export const createAsset = (data) => {
  return api.post(`${BASE_URL}/assets/`, data);
};

export const updateAsset = (id, data) => {
  return api.put(`${BASE_URL}/assets/${id}`, data);
};

export const deleteAsset = (id) => {
  return api.delete(`${BASE_URL}/assets/${id}`);
};

export const runMonthlyDepreciation = (month, year) => {
  return api.post(`${BASE_URL}/assets/run-monthly-depreciation`, null, {
    params: { month, year }
  });
};

export const getDepreciationSchedule = (id) => {
  return api.get(`${BASE_URL}/assets/${id}/depreciation-schedule`);
};

// ============================================
// BANK ACCOUNTS & TRANSACTIONS
// ============================================

export const getBankAccounts = (params = {}) => {
  return api.get(`${BASE_URL}/bank-accounts/`, { params });
};

export const createBankAccount = (data) => {
  return api.post(`${BASE_URL}/bank-accounts/`, data);
};

export const getBankTransactions = (params = {}) => {
  const paginatedParams = {
    limit: 50,
    offset: 0,
    ...params
  };
  return api.get(`${BASE_URL}/bank-transactions/`, { params: paginatedParams });
};

export const importBankTransactions = (bankAccountId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('bank_account_id', bankAccountId);
  
  return api.post(`${BASE_URL}/bank-transactions/import`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    params: { bank_account_id: bankAccountId }
  });
};

export const matchBankTransaction = (transactionId, journalId) => {
  return api.post(`${BASE_URL}/bank-transactions/${transactionId}/match`, null, {
    params: { journal_id: journalId }
  });
};

// ============================================
// BEGINNING BALANCE
// ============================================

export const getBeginningBalances = (params = {}) => {
  return api.get(`${BASE_URL}/beginning-balance/`, { params });
};

export const getBeginningBalanceById = (id) => {
  return api.get(`${BASE_URL}/beginning-balance/${id}`);
};

export const createBeginningBalance = (data) => {
  return api.post(`${BASE_URL}/beginning-balance/`, data);
};

export const postBeginningBalance = (id) => {
  return api.post(`${BASE_URL}/beginning-balance/${id}/post`);
};

export const deleteBeginningBalance = (id) => {
  return api.delete(`${BASE_URL}/beginning-balance/${id}`);
};

// ============================================
// YEAR-END CLOSING
// ============================================

export const runYearEndClosing = (year, retainedEarningsAccountId) => {
  return api.post(`${BASE_URL}/year-end/close/${year}`, null, {
    params: { retained_earnings_account_id: retainedEarningsAccountId }
  });
};

export const getYearEndClosingStatus = (year) => {
  return api.get(`${BASE_URL}/year-end/status/${year}`);
};

// ============================================
// REPORTS
// ============================================

export const getGeneralLedger = (params) => {
  return api.get(`${BASE_URL}/reports/general-ledger`, { params });
};

export const getTrialBalance = (params) => {
  return api.get(`${BASE_URL}/reports/trial-balance`, { params });
};

export const getIncomeStatement = (params) => {
  return api.get(`${BASE_URL}/reports/income-statement`, { params });
};

export const getBalanceSheet = (params) => {
  return api.get(`${BASE_URL}/reports/balance-sheet`, { params });
};

// ============================================
// REPORT TEMPLATES
// ============================================

export const getReportTemplates = () => {
  return api.get(`${BASE_URL}/report-templates/`);
};

export const createReportTemplate = (data) => {
  return api.post(`${BASE_URL}/report-templates/`, data);
};

// ============================================
// AUDIT LOGS
// ============================================

export const getAuditLogs = (params = {}) => {
  const paginatedParams = {
    limit: 50,
    offset: 0,
    ...params
  };
  return api.get(`${BASE_URL}/audit-logs/`, { params: paginatedParams });
};

export const getAuditLogById = (id) => {
  return api.get(`${BASE_URL}/audit-logs/${id}`);
};

// ============================================
// FILE UPLOADS
// ============================================

export const uploadFile = (file, referenceType, referenceId = null) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const params = { reference_type: referenceType };
  if (referenceId) {
    params.reference_id = referenceId;
  }
  
  return api.post(`${FILES_URL}/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    params
  });
};

export const getFilesByReference = (referenceType, referenceId) => {
  return api.get(`${FILES_URL}/by-reference/${referenceType}/${referenceId}`);
};

export const downloadFile = (fileId) => {
  return api.get(`${FILES_URL}/${fileId}/download`, {
    responseType: 'blob'
  });
};

export const deleteFile = (fileId) => {
  return api.delete(`${FILES_URL}/${fileId}`);
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return '-';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

export const parseCurrency = (formattedAmount) => {
  if (!formattedAmount) return 0;
  // Remove currency symbol and separators
  const cleaned = formattedAmount.replace(/[Rp\s.]/g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
};

export const translateError = (errorCode, t) => {
  if (!errorCode) return t('errors.GENERIC_ERROR');
  return t(`errors.${errorCode}`) || t('errors.GENERIC_ERROR');
};

export default {
  // COA
  getCOA,
  getCOATree,
  getCOAById,
  createCOA,
  updateCOA,
  deleteCOA,
  seedDefaultCOA,
  
  // Responsibility Centers
  getResponsibilityCenters,
  getResponsibilityCenterById,
  createResponsibilityCenter,
  updateResponsibilityCenter,
  deleteResponsibilityCenter,
  
  // Journals
  getJournals,
  getJournalById,
  createJournal,
  updateJournal,
  approveJournal,
  deleteJournal,
  
  // Fiscal Periods
  getFiscalPeriods,
  getCurrentPeriod,
  closeFiscalPeriod,
  lockFiscalPeriod,
  unlockFiscalPeriod,
  
  // Quick Entries
  createWeeklyGiving,
  createOutgoingMoney,
  
  // Budgets
  getBudgets,
  getBudgetById,
  createBudget,
  updateBudget,
  activateBudget,
  distributeBudgetMonthly,
  getBudgetVariance,
  
  // Fixed Assets
  getAssets,
  getAssetById,
  createAsset,
  updateAsset,
  deleteAsset,
  runMonthlyDepreciation,
  getDepreciationSchedule,
  
  // Bank
  getBankAccounts,
  createBankAccount,
  getBankTransactions,
  importBankTransactions,
  matchBankTransaction,
  
  // Beginning Balance
  getBeginningBalances,
  getBeginningBalanceById,
  createBeginningBalance,
  postBeginningBalance,
  deleteBeginningBalance,
  
  // Year-End
  runYearEndClosing,
  getYearEndClosingStatus,
  
  // Reports
  getGeneralLedger,
  getTrialBalance,
  getIncomeStatement,
  getBalanceSheet,
  
  // Templates
  getReportTemplates,
  createReportTemplate,
  
  // Audit
  getAuditLogs,
  getAuditLogById,
  
  // Files
  uploadFile,
  getFilesByReference,
  downloadFile,
  deleteFile,
  
  // Utilities
  formatCurrency,
  parseCurrency,
  translateError
};
