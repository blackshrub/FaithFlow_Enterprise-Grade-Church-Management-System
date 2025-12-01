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
import EventRatings from "./pages/EventRatings";
import KioskMode from "./pages/KioskMode";
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

// Explore pages
import ExploreDashboard from "./pages/Explore/ExploreDashboard";
import ExploreContentList from "./pages/Explore/ExploreContentList";
import SchedulingCalendar from "./pages/Explore/SchedulingCalendar";
import AnalyticsDashboard from "./pages/Explore/AnalyticsDashboard";
import AIGenerationHub from "./pages/Explore/AIGenerationHub";
import AIPromptConfig from "./pages/Explore/AIPromptConfig";
import ChurchSettings from "./pages/Explore/ChurchSettings";
import DevotionEditor from "./pages/Explore/DevotionEditor";
import VerseEditor from "./pages/Explore/VerseEditor";
import FigureEditor from "./pages/Explore/FigureEditor";
import QuizEditor from "./pages/Explore/QuizEditor";
import BibleStudyEditor from "./pages/Explore/BibleStudyEditor";
import TopicalCategoryEditor from "./pages/Explore/TopicalCategoryEditor";
import TopicalVerseEditor from "./pages/Explore/TopicalVerseEditor";
import DevotionPlanEditor from "./pages/Explore/DevotionPlanEditor";

// Groups pages (legacy - keeping for backward compatibility)
import GroupsListPage from "./pages/Groups/GroupsListPage";
import GroupEditorPage from "./pages/Groups/GroupEditorPage";
import GroupMembersPage from "./pages/Groups/GroupMembersPage";
import JoinRequestsPage from "./pages/Groups/JoinRequestsPage";
import LeaveRequestsPage from "./pages/Groups/LeaveRequestsPage";

// Communities pages (new - replacing Groups)
import CommunitiesListPage from "./pages/Communities/CommunitiesListPage";
import CommunityEditorPage from "./pages/Communities/CommunityEditorPage";
import CommunityMembersPage from "./pages/Communities/CommunityMembersPage";

// Counseling pages
import {
  CounselingDashboard,
  CounselorsPage,
  AvailabilityPage,
  AppointmentsListPage,
  AppointmentDetailPage
} from "./pages/Counseling";

// Kiosk pages
import ChurchSelector from "./components/Kiosk/ChurchSelector";
import KioskHome from "./pages/Kiosk/KioskHome";
import EventRegistrationKiosk from "./pages/Kiosk/EventRegistration";
import PrayerRequestKiosk from "./pages/Kiosk/PrayerRequest";
import CounselingKiosk from "./pages/Kiosk/CounselingAppointment";
import JoinGroupKiosk from "./pages/Kiosk/JoinGroup";
import ProfileUpdateKiosk from "./pages/Kiosk/ProfileUpdate";
import EventCheckinKiosk from "./pages/Kiosk/EventCheckin";
import SmartLanding from "./components/SmartLanding";
import UserManagement from "./pages/System/UserManagement";
import CrashLogs from "./pages/System/CrashLogs";
import SystemSettings from "./pages/SystemSettings";

import FaithFlowLogo from './components/Branding/FaithFlowLogo';

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
          <Routes>
            {/* Smart Landing - Kiosk for public, Dashboard for logged-in users */}
            <Route path="/" element={<SmartLanding />} />
            
            {/* Admin Login Route */}
            <Route path="/admin" element={<Login />} />
            <Route path="/login" element={<Navigate to="/admin" replace />} />
            
            {/* Kiosk Routes - Public, Full-screen */}
            <Route path="/kiosk" element={<ChurchSelector />} />
            <Route path="/kiosk/home" element={<KioskHome />} />
            <Route path="/kiosk/events/register" element={<EventRegistrationKiosk />} />
            <Route path="/kiosk/prayer" element={<PrayerRequestKiosk />} />
            <Route path="/kiosk/counseling" element={<CounselingKiosk />} />
            <Route path="/kiosk/groups/join" element={<JoinGroupKiosk />} />
            <Route path="/kiosk/profile/update" element={<ProfileUpdateKiosk />} />
            <Route path="/kiosk/checkin" element={<EventCheckinKiosk />} />
            
            {/* Protected Admin Routes */}
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="members" element={<Members />} />
              <Route path="trash" element={<TrashBin />} />
              <Route path="import-export" element={<ImportExport />} />
              <Route path="settings" element={<Settings />} />
              <Route path="conflicts" element={<ConflictReview />} />
              <Route path="seat-layouts" element={<SeatLayouts />} />
              <Route path="events" element={<Events />} />
              <Route path="events/ratings" element={<EventRatings />} />

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
              
              {/* Groups Routes (legacy - keeping for backward compatibility) */}
              <Route path="groups" element={<GroupsListPage />} />
              <Route path="groups/new" element={<GroupEditorPage />} />
              <Route path="groups/:id/edit" element={<GroupEditorPage />} />
              <Route path="groups/:groupId/members" element={<GroupMembersPage />} />
              <Route path="groups/join-requests" element={<JoinRequestsPage />} />
              <Route path="groups/leave-requests" element={<LeaveRequestsPage />} />

              {/* Communities Routes (new - replacing Groups) */}
              <Route path="communities" element={<CommunitiesListPage />} />
              <Route path="communities/new" element={<CommunityEditorPage />} />
              <Route path="communities/:id/edit" element={<CommunityEditorPage />} />
              <Route path="communities/:communityId/members" element={<CommunityMembersPage />} />
              
              {/* Counseling Routes */}
              <Route path="counseling" element={<CounselingDashboard />} />
              <Route path="counseling/counselors" element={<CounselorsPage />} />
              <Route path="counseling/availability" element={<AvailabilityPage />} />
              <Route path="counseling/appointments" element={<AppointmentsListPage />} />
              <Route path="counseling/appointments/:appointmentId" element={<AppointmentDetailPage />} />

              {/* Content Center Routes (formerly Explore) */}
              {/* Overview */}
              <Route path="content-center" element={<ExploreDashboard />} />
              <Route path="content-center/schedule" element={<SchedulingCalendar />} />
              <Route path="content-center/analytics" element={<AnalyticsDashboard />} />
              <Route path="content-center/ai" element={<AIGenerationHub />} />
              <Route path="content-center/ai/prompts" element={<AIPromptConfig />} />
              <Route path="content-center/settings" element={<ChurchSettings />} />

              {/* Daily Devotion */}
              <Route path="content-center/devotion" element={<ExploreContentList />} />
              <Route path="content-center/devotion/new" element={<DevotionEditor />} />
              <Route path="content-center/devotion/:id/edit" element={<DevotionEditor />} />

              {/* Verse of the Day */}
              <Route path="content-center/verse" element={<ExploreContentList />} />
              <Route path="content-center/verse/new" element={<VerseEditor />} />
              <Route path="content-center/verse/:id/edit" element={<VerseEditor />} />

              {/* Bible Figure */}
              <Route path="content-center/figure" element={<ExploreContentList />} />
              <Route path="content-center/figure/new" element={<FigureEditor />} />
              <Route path="content-center/figure/:id/edit" element={<FigureEditor />} />

              {/* Daily Quiz */}
              <Route path="content-center/quiz" element={<ExploreContentList />} />
              <Route path="content-center/quiz/new" element={<QuizEditor />} />
              <Route path="content-center/quiz/:id/edit" element={<QuizEditor />} />

              {/* Bible Study */}
              <Route path="content-center/bible-study" element={<ExploreContentList />} />
              <Route path="content-center/bible-study/new" element={<BibleStudyEditor />} />
              <Route path="content-center/bible-study/:id/edit" element={<BibleStudyEditor />} />

              {/* Devotion Plan */}
              <Route path="content-center/devotion-plan" element={<ExploreContentList />} />
              <Route path="content-center/devotion-plan/new" element={<DevotionPlanEditor />} />
              <Route path="content-center/devotion-plan/:id/edit" element={<DevotionPlanEditor />} />

              {/* Topical Categories */}
              <Route path="content-center/topical" element={<ExploreContentList />} />
              <Route path="content-center/topical/category/new" element={<TopicalCategoryEditor />} />
              <Route path="content-center/topical/category/:id/edit" element={<TopicalCategoryEditor />} />

              {/* Topical Verses */}
              <Route path="content-center/topical/verses" element={<ExploreContentList />} />
              <Route path="content-center/topical/verses/new" element={<TopicalVerseEditor />} />
              <Route path="content-center/topical/verses/:id/edit" element={<TopicalVerseEditor />} />

              {/* Legacy explore routes - redirect to content-center */}
              <Route path="explore" element={<Navigate to="/content-center" replace />} />
              <Route path="explore/*" element={<Navigate to="/content-center" replace />} />

              {/* System Routes */}
              <Route path="users/management" element={<UserManagement />} />
              <Route path="system/crash-logs" element={<CrashLogs />} />
              <Route path="system-settings" element={<SystemSettings />} />
              
              {/* Placeholder routes - will be implemented in next phases */}
              <Route path="donations" element={<PlaceholderPage title="Donations" />} />
              <Route path="prayers" element={<PlaceholderPage title="Prayer Requests" />} />
              <Route path="content" element={<PlaceholderPage title="Content Management" />} />
              <Route path="spiritual-journey" element={<PlaceholderPage title="Spiritual Journey" />} />
              <Route path="churches" element={<PlaceholderPage title="Churches" />} />
            </Route>

            {/* Catch all - redirect to kiosk home */}
            <Route path="*" element={<Navigate to="/" replace />} />
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
