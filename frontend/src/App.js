import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from "./context/AuthContext";
import { Toaster } from "./components/ui/sonner";
import { queryClient } from './lib/react-query';
import './i18n';
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Members from "./pages/Members";
import TrashBin from "./pages/TrashBin";
import Settings from "./pages/Settings";
import ConflictReview from "./pages/ConflictReview";
import ImportExport from "./pages/ImportExport";
import SeatLayouts from "./pages/SeatLayouts";
import Events from "./pages/Events";
import KioskMode from "./pages/KioskMode";
import Devotions from "./pages/Devotions";
import Layout from "./components/Layout/Layout";
import ProtectedRoute from "./components/Layout/ProtectedRoute";
import ErrorBoundary from "./components/ErrorBoundary";

// Accounting pages
import AccountingDashboard from "./pages/Accounting/AccountingDashboard";
import ChartOfAccounts from "./pages/Accounting/ChartOfAccounts";
import Journals from "./pages/Accounting/Journals";
import JournalForm from "./pages/Accounting/JournalForm";
import FiscalPeriods from "./pages/Accounting/FiscalPeriods";
import BeginningBalance from "./pages/Accounting/BeginningBalance";
import ResponsibilityCenters from "./pages/Accounting/ResponsibilityCenters";
import QuickEntry from "./pages/Accounting/QuickEntry";
import Reports from "./pages/Accounting/Reports";
import Budgets from "./pages/Accounting/Budgets";
import BudgetForm from "./pages/Accounting/BudgetForm";
import BudgetVariance from "./pages/Accounting/BudgetVariance";
import FixedAssets from "./pages/Accounting/FixedAssets";
import FixedAssetForm from "./pages/Accounting/FixedAssetForm";
import DepreciationSchedule from "./pages/Accounting/DepreciationSchedule";
import BankReconciliation from "./pages/Accounting/BankReconciliation";
import BankMatching from "./pages/Accounting/BankMatching";
import YearEndClosing from "./pages/Accounting/YearEndClosing";
import AuditLogs from "./pages/Accounting/AuditLogs";
import GeneralLedger from "./pages/Accounting/GeneralLedger";
import CashFlowStatement from "./pages/Accounting/CashFlowStatement";
import ResponsibilityCenterReport from "./pages/Accounting/ResponsibilityCenterReport";
import CustomReportBuilder from "./pages/Accounting/CustomReportBuilder";

// Articles pages
import ArticlesList from "./pages/Articles/ArticlesList";
import ArticleEditor from "./pages/Articles/ArticleEditor";
import Categories from "./pages/Articles/Categories";
import Tags from "./pages/Articles/Tags";
import CommentsModeration from "./pages/Articles/CommentsModeration";

// Prayer Requests pages
import PrayerRequestsList from "./pages/PrayerRequests/PrayerRequestsList";
import PrayerRequestForm from "./pages/PrayerRequests/PrayerRequestForm";

// Groups pages
import GroupsListPage from "./pages/Groups/GroupsListPage";
import GroupEditorPage from "./pages/Groups/GroupEditorPage";
import GroupMembersPage from "./pages/Groups/GroupMembersPage";
import JoinRequestsPage from "./pages/Groups/JoinRequestsPage";
import LeaveRequestsPage from "./pages/Groups/LeaveRequestsPage";

import FaithFlowLogo from './components/Branding/FaithFlowLogo';

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            
            {/* Kiosk Mode - Fullscreen (no layout) */}
            <Route path="/kiosk" element={
              <ProtectedRoute>
                <KioskMode />
              </ProtectedRoute>
            } />
            
            {/* Protected Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="members" element={<Members />} />
              <Route path="trash" element={<TrashBin />} />
              <Route path="import-export" element={<ImportExport />} />
              <Route path="settings" element={<Settings />} />
              <Route path="conflicts" element={<ConflictReview />} />
              <Route path="seat-layouts" element={<SeatLayouts />} />
              <Route path="events" element={<Events />} />
              {/* Kiosk moved outside Layout for fullscreen */}
              <Route path="devotions" element={<Devotions />} />
              
              {/* Accounting Routes */}
              <Route path="accounting" element={<AccountingDashboard />} />
              <Route path="accounting/coa" element={<ChartOfAccounts />} />
              <Route path="accounting/journals" element={<Journals />} />
              <Route path="accounting/journals/new" element={<JournalForm />} />
              <Route path="accounting/journals/:id" element={<JournalForm />} />
              <Route path="accounting/fiscal-periods" element={<FiscalPeriods />} />
              <Route path="accounting/beginning-balance" element={<BeginningBalance />} />
              <Route path="accounting/responsibility-centers" element={<ResponsibilityCenters />} />
              <Route path="accounting/quick-entry" element={<QuickEntry />} />
              <Route path="accounting/reports" element={<Reports />} />
              <Route path="accounting/reports/general-ledger" element={<GeneralLedger />} />
              <Route path="accounting/reports/cash-flow" element={<CashFlowStatement />} />
              <Route path="accounting/reports/responsibility-center" element={<ResponsibilityCenterReport />} />
              <Route path="accounting/reports/custom" element={<CustomReportBuilder />} />
              <Route path="accounting/budgets" element={<Budgets />} />
              <Route path="accounting/budgets/new" element={<BudgetForm />} />
              <Route path="accounting/budgets/:id/variance" element={<BudgetVariance />} />
              <Route path="accounting/assets" element={<FixedAssets />} />
              <Route path="accounting/assets/new" element={<FixedAssetForm />} />
              <Route path="accounting/assets/:id/schedule" element={<DepreciationSchedule />} />
              <Route path="accounting/bank" element={<BankReconciliation />} />
              <Route path="accounting/bank/matching" element={<BankMatching />} />
              <Route path="accounting/year-end-closing" element={<YearEndClosing />} />
              <Route path="accounting/audit-logs" element={<AuditLogs />} />
              
              {/* Articles Routes */}
              <Route path="articles" element={<ArticlesList />} />
              <Route path="articles/new" element={<ArticleEditor />} />
              <Route path="articles/:id/edit" element={<ArticleEditor />} />
              <Route path="articles/categories" element={<Categories />} />
              <Route path="articles/tags" element={<Tags />} />
              <Route path="articles/comments" element={<CommentsModeration />} />
              
              {/* Prayer Requests Routes */}
              <Route path="prayer-requests" element={<PrayerRequestsList />} />
              <Route path="prayer-requests/new" element={<PrayerRequestForm />} />
              <Route path="prayer-requests/:id" element={<PrayerRequestForm />} />
              
              {/* Groups Routes */}
              <Route path="groups" element={<GroupsListPage />} />
              <Route path="groups/new" element={<GroupEditorPage />} />
              <Route path="groups/:id/edit" element={<GroupEditorPage />} />
              <Route path="groups/:groupId/members" element={<GroupMembersPage />} />
              <Route path="groups/join-requests" element={<JoinRequestsPage />} />
              <Route path="groups/leave-requests" element={<LeaveRequestsPage />} />
              
              {/* Placeholder routes - will be implemented in next phases */}
              <Route path="donations" element={<PlaceholderPage title="Donations" />} />
              <Route path="prayers" element={<PlaceholderPage title="Prayer Requests" />} />
              <Route path="content" element={<PlaceholderPage title="Content Management" />} />
              <Route path="spiritual-journey" element={<PlaceholderPage title="Spiritual Journey" />} />
              <Route path="churches" element={<PlaceholderPage title="Churches" />} />
            </Route>

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
    </ErrorBoundary>
  );
}

// Placeholder component for routes not yet implemented
function PlaceholderPage({ title }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
        <p className="text-gray-600 mt-1">This feature is coming soon...</p>
      </div>
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <div className="text-gray-400 mb-4">
          <svg className="h-24 w-24 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">{title} Module</h3>
        <p className="text-gray-500">This module will be available in the next phase of development.</p>
      </div>
    </div>
  );
}

export default App;
