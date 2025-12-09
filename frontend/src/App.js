import React, { Suspense, lazy } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from "./context/AuthContext";
import { Toaster } from "./components/ui/sonner";
import { OfflineIndicator } from "./components/ui/OfflineIndicator";
import { queryClient } from './lib/react-query';
import './i18n';

// Core components - loaded immediately
import Layout from "./components/Layout/Layout";
import ProtectedRoute from "./components/Layout/ProtectedRoute";
import ErrorBoundary from "./components/ErrorBoundary";
import SmartLanding from "./components/SmartLanding";

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

// =============================================================================
// LAZY LOADED PAGES - Only loaded when user navigates to them
// =============================================================================

// Auth
const Login = lazy(() => import("./pages/Login"));

// Core pages
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Members = lazy(() => import("./pages/Members"));
const TrashBin = lazy(() => import("./pages/TrashBin"));
const Settings = lazy(() => import("./pages/Settings"));
const Profile = lazy(() => import("./pages/Profile"));
const ConflictReview = lazy(() => import("./pages/ConflictReview"));
const ImportExport = lazy(() => import("./pages/ImportExport"));
const SeatLayouts = lazy(() => import("./pages/SeatLayouts"));
const Events = lazy(() => import("./pages/Events"));
const EventRatings = lazy(() => import("./pages/EventRatings"));
const KioskMode = lazy(() => import("./pages/KioskMode"));

// Accounting pages
const AccountingDashboard = lazy(() => import("./pages/Accounting/AccountingDashboard"));
const ChartOfAccounts = lazy(() => import("./pages/Accounting/ChartOfAccounts"));
const Journals = lazy(() => import("./pages/Accounting/Journals"));
const JournalForm = lazy(() => import("./pages/Accounting/JournalForm"));
const FiscalPeriods = lazy(() => import("./pages/Accounting/FiscalPeriods"));
const BeginningBalance = lazy(() => import("./pages/Accounting/BeginningBalance"));
const ResponsibilityCenters = lazy(() => import("./pages/Accounting/ResponsibilityCenters"));
const QuickEntry = lazy(() => import("./pages/Accounting/QuickEntry"));
const Reports = lazy(() => import("./pages/Accounting/Reports"));
const Budgets = lazy(() => import("./pages/Accounting/Budgets"));
const BudgetForm = lazy(() => import("./pages/Accounting/BudgetForm"));
const BudgetVariance = lazy(() => import("./pages/Accounting/BudgetVariance"));
const FixedAssets = lazy(() => import("./pages/Accounting/FixedAssets"));
const FixedAssetForm = lazy(() => import("./pages/Accounting/FixedAssetForm"));
const DepreciationSchedule = lazy(() => import("./pages/Accounting/DepreciationSchedule"));
const BankReconciliation = lazy(() => import("./pages/Accounting/BankReconciliation"));
const BankMatching = lazy(() => import("./pages/Accounting/BankMatching"));
const YearEndClosing = lazy(() => import("./pages/Accounting/YearEndClosing"));
const AuditLogs = lazy(() => import("./pages/Accounting/AuditLogs"));
const GeneralLedger = lazy(() => import("./pages/Accounting/GeneralLedger"));
const CashFlowStatement = lazy(() => import("./pages/Accounting/CashFlowStatement"));
const ResponsibilityCenterReport = lazy(() => import("./pages/Accounting/ResponsibilityCenterReport"));
const CustomReportBuilder = lazy(() => import("./pages/Accounting/CustomReportBuilder"));

// Articles pages
const ArticlesList = lazy(() => import("./pages/Articles/ArticlesList"));
const ArticleEditor = lazy(() => import("./pages/Articles/ArticleEditor"));
const Categories = lazy(() => import("./pages/Articles/Categories"));
const Tags = lazy(() => import("./pages/Articles/Tags"));
const CommentsModeration = lazy(() => import("./pages/Articles/CommentsModeration"));

// Prayer Requests pages
const PrayerRequestsList = lazy(() => import("./pages/PrayerRequests/PrayerRequestsList"));
const PrayerRequestForm = lazy(() => import("./pages/PrayerRequests/PrayerRequestForm"));
const PrayerAnalytics = lazy(() => import("./pages/PrayerRequests/PrayerAnalytics"));

// Explore pages
const ExploreDashboard = lazy(() => import("./pages/Explore/ExploreDashboard"));
const ExploreContentList = lazy(() => import("./pages/Explore/ExploreContentList"));
const SchedulingCalendar = lazy(() => import("./pages/Explore/SchedulingCalendar"));
const AnalyticsDashboard = lazy(() => import("./pages/Explore/AnalyticsDashboard"));
const AIGenerationHub = lazy(() => import("./pages/Explore/AIGenerationHub"));
const AIPromptConfig = lazy(() => import("./pages/Explore/AIPromptConfig"));
const NewsContextDashboard = lazy(() => import("./pages/Explore/NewsContextDashboard"));
const ChurchSettings = lazy(() => import("./pages/Explore/ChurchSettings"));
const DevotionEditor = lazy(() => import("./pages/Explore/DevotionEditor"));
const VerseEditor = lazy(() => import("./pages/Explore/VerseEditor"));
const FigureEditor = lazy(() => import("./pages/Explore/FigureEditor"));
const QuizEditor = lazy(() => import("./pages/Explore/QuizEditor"));
const BibleStudyEditor = lazy(() => import("./pages/Explore/BibleStudyEditor"));
const TopicalCategoryEditor = lazy(() => import("./pages/Explore/TopicalCategoryEditor"));
const TopicalVerseEditor = lazy(() => import("./pages/Explore/TopicalVerseEditor"));
const DevotionPlanEditor = lazy(() => import("./pages/Explore/DevotionPlanEditor"));
const ReviewQueue = lazy(() => import("./pages/Explore/ReviewQueue"));
const JourneyList = lazy(() => import("./pages/Explore/JourneyList"));
const JourneyEditor = lazy(() => import("./pages/Explore/JourneyEditor"));
const SermonList = lazy(() => import("./pages/Explore/SermonList"));
const SermonEditor = lazy(() => import("./pages/Explore/SermonEditor"));
const ProfileAnalytics = lazy(() => import("./pages/Explore/ProfileAnalytics"));

// Groups pages
const GroupsListPage = lazy(() => import("./pages/Groups/GroupsListPage"));
const GroupEditorPage = lazy(() => import("./pages/Groups/GroupEditorPage"));
const GroupMembersPage = lazy(() => import("./pages/Groups/GroupMembersPage"));
const JoinRequestsPage = lazy(() => import("./pages/Groups/JoinRequestsPage"));
const LeaveRequestsPage = lazy(() => import("./pages/Groups/LeaveRequestsPage"));

// Communities pages
const CommunitiesListPage = lazy(() => import("./pages/Communities/CommunitiesListPage"));
const CommunityEditorPage = lazy(() => import("./pages/Communities/CommunityEditorPage"));
const CommunityMembersPage = lazy(() => import("./pages/Communities/CommunityMembersPage"));

// Counseling pages
const CounselingDashboard = lazy(() => import("./pages/Counseling/Dashboard"));
const CounselorsPage = lazy(() => import("./pages/Counseling/Counselors"));
const AvailabilityPage = lazy(() => import("./pages/Counseling/Availability"));
const AppointmentsListPage = lazy(() => import("./pages/Counseling/Appointments"));
const AppointmentDetailPage = lazy(() => import("./pages/Counseling/AppointmentDetail"));

// Request Forms pages (Member Care)
const RequestFormsDashboard = lazy(() => import("./pages/RequestForms/index"));
const AcceptJesusList = lazy(() => import("./pages/RequestForms/AcceptJesusList"));
const AcceptJesusDetail = lazy(() => import("./pages/RequestForms/AcceptJesusDetail"));
const BaptismList = lazy(() => import("./pages/RequestForms/BaptismList"));
const BaptismDetail = lazy(() => import("./pages/RequestForms/BaptismDetail"));
const ChildDedicationList = lazy(() => import("./pages/RequestForms/ChildDedicationList"));
const ChildDedicationDetail = lazy(() => import("./pages/RequestForms/ChildDedicationDetail"));
const HolyMatrimonyList = lazy(() => import("./pages/RequestForms/HolyMatrimonyList"));
const HolyMatrimonyDetail = lazy(() => import("./pages/RequestForms/HolyMatrimonyDetail"));

// Kiosk pages
const ChurchSelector = lazy(() => import("./components/Kiosk/ChurchSelector"));
const KioskHome = lazy(() => import("./pages/Kiosk/KioskHome"));
const EventRegistrationKiosk = lazy(() => import("./pages/Kiosk/EventRegistration"));
const PrayerRequestKiosk = lazy(() => import("./pages/Kiosk/PrayerRequest"));
const CounselingKiosk = lazy(() => import("./pages/Kiosk/CounselingAppointment"));
const JoinGroupKiosk = lazy(() => import("./pages/Kiosk/JoinGroup"));
const ProfileUpdateKiosk = lazy(() => import("./pages/Kiosk/ProfileUpdate"));
const EventCheckinKiosk = lazy(() => import("./pages/Kiosk/EventCheckin"));

// Kiosk pages - Member Care Request Forms
const AcceptJesusKiosk = lazy(() => import("./pages/Kiosk/AcceptJesus"));
const BaptismKiosk = lazy(() => import("./pages/Kiosk/Baptism"));
const ChildDedicationKiosk = lazy(() => import("./pages/Kiosk/ChildDedication"));
const HolyMatrimonyKiosk = lazy(() => import("./pages/Kiosk/HolyMatrimony"));

// System pages
const UserManagement = lazy(() => import("./pages/System/UserManagement"));
const CrashLogs = lazy(() => import("./pages/System/CrashLogs"));
const SystemSettings = lazy(() => import("./pages/SystemSettings"));

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
          <OfflineIndicator />
          <Suspense fallback={<PageLoader />}>
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

            {/* Kiosk - Member Care Request Forms */}
            <Route path="/kiosk/accept-jesus" element={<AcceptJesusKiosk />} />
            <Route path="/kiosk/baptism" element={<BaptismKiosk />} />
            <Route path="/kiosk/child-dedication" element={<ChildDedicationKiosk />} />
            <Route path="/kiosk/holy-matrimony" element={<HolyMatrimonyKiosk />} />

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
              <Route path="prayer-requests/analytics" element={<PrayerAnalytics />} />
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

              {/* Request Forms Routes (Member Care) */}
              <Route path="request-forms" element={<RequestFormsDashboard />} />
              <Route path="request-forms/accept-jesus" element={<AcceptJesusList />} />
              <Route path="request-forms/accept-jesus/:id" element={<AcceptJesusDetail />} />
              <Route path="request-forms/baptism" element={<BaptismList />} />
              <Route path="request-forms/baptism/:id" element={<BaptismDetail />} />
              <Route path="request-forms/child-dedication" element={<ChildDedicationList />} />
              <Route path="request-forms/child-dedication/:id" element={<ChildDedicationDetail />} />
              <Route path="request-forms/holy-matrimony" element={<HolyMatrimonyList />} />
              <Route path="request-forms/holy-matrimony/:id" element={<HolyMatrimonyDetail />} />

              {/* Content Center Routes (formerly Explore) */}
              {/* Overview */}
              <Route path="content-center" element={<ExploreDashboard />} />
              <Route path="content-center/schedule" element={<SchedulingCalendar />} />
              <Route path="content-center/analytics" element={<AnalyticsDashboard />} />
              <Route path="content-center/ai" element={<AIGenerationHub />} />
              <Route path="content-center/ai/prompts" element={<AIPromptConfig />} />
              <Route path="content-center/review-queue" element={<ReviewQueue />} />
              <Route path="content-center/news-context" element={<NewsContextDashboard />} />
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

              {/* Life Stage Journeys */}
              <Route path="content-center/journey" element={<JourneyList />} />
              <Route path="content-center/journey/new" element={<JourneyEditor />} />
              <Route path="content-center/journey/:id" element={<JourneyEditor />} />

              {/* Sermon Integration */}
              <Route path="content-center/sermons" element={<SermonList />} />
              <Route path="content-center/sermons/new" element={<SermonEditor />} />
              <Route path="content-center/sermons/:id" element={<SermonEditor />} />

              {/* Profile Analytics */}
              <Route path="content-center/profiles" element={<ProfileAnalytics />} />

              {/* Legacy explore routes - redirect to content-center */}
              <Route path="explore" element={<Navigate to="/content-center" replace />} />
              <Route path="explore/*" element={<Navigate to="/content-center" replace />} />

              {/* System Routes */}
              <Route path="users/management" element={<UserManagement />} />
              <Route path="system/crash-logs" element={<CrashLogs />} />
              <Route path="integrations" element={<SystemSettings />} />
              <Route path="profile" element={<Profile />} />

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
          </Suspense>
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
