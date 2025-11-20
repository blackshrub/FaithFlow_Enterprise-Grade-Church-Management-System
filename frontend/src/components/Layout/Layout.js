import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import {
  Menu,
  X,
  LayoutDashboard,
  Users,
  UsersRound,
  Calendar,
  DollarSign,
  Heart,
  BookOpen,
  Award,
  LogOut,
  Church,
  Settings,
  Globe,
  Upload,
  Grid3x3,
  ChevronDown,
  ChevronRight,
  Monitor,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Calculator,
  FileText,
  MessageCircleHeart,
  Sparkles,
  Database,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import FaithFlowLogo from '../Branding/FaithFlowLogo';

export default function Layout() {
  const { t, i18n } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState({});
  const { user, church, logout, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  const toggleSubmenu = (key) => {
    setExpandedMenus(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Auto-expand submenu if child route is active
  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/events') || path.includes('/seat-layouts') || path.includes('/kiosk')) {
      setExpandedMenus(prev => ({ ...prev, worship: true }));
    }
    if (path.includes('/prayer-requests') || path.includes('/counseling')) {
      setExpandedMenus(prev => ({ ...prev, spiritual: true }));
    }
    if (path.includes('/devotions') || path.includes('/articles')) {
      setExpandedMenus(prev => ({ ...prev, content: true }));
    }
    if (path.includes('/accounting')) {
      setExpandedMenus(prev => ({ ...prev, finance: true }));
    }
    if (path.includes('/import-export')) {
      setExpandedMenus(prev => ({ ...prev, dataAdmin: true }));
    }
  }, [location.pathname]);

  const menuItems = [
    { icon: LayoutDashboard, label: t('nav.dashboard'), path: '/dashboard' },
    { icon: Users, label: t('nav.members'), path: '/members' },
    { icon: UsersRound, label: t('nav.groups'), path: '/groups' },
    {
      icon: Calendar,
      label: 'Worship & Events',
      key: 'worship',
      submenu: [
        { label: t('events.event.eventsList') || 'Events', path: '/events' },
        { label: t('events.seatLayouts') || 'Seat Layouts', path: '/seat-layouts' },
        { label: t('events.kioskMode') || 'Kiosk Mode', path: '/kiosk' },
      ]
    },
    {
      icon: Heart,
      label: 'Spiritual Care',
      key: 'spiritual',
      submenu: [
        { label: t('prayerRequests.title') || 'Prayer Requests', path: '/prayer-requests' },
        { 
          label: 'Counseling & Prayer',
          key: 'counseling',
          submenu: [
            { label: 'Dashboard', path: '/counseling' },
            { label: 'Counselors', path: '/counseling/counselors' },
            { label: 'Availability', path: '/counseling/availability' },
            { label: 'Appointments', path: '/counseling/appointments' },
          ]
        },
      ]
    },
    {
      icon: FileText,
      label: 'Content & Communication',
      key: 'content',
      submenu: [
        { label: 'Devotion', path: '/devotions' },
        {
          label: t('articles.title') || 'Articles',
          key: 'articles',
          submenu: [
            { label: t('articles.allArticles') || 'All Articles', path: '/articles' },
            { label: t('articles.addNew') || 'Add New', path: '/articles/new' },
            { label: t('articles.categoriesManagement.title') || 'Categories', path: '/articles/categories' },
            { label: t('articles.tagsManagement.title') || 'Tags', path: '/articles/tags' },
            { label: t('articles.comments.title') || 'Comments', path: '/articles/comments' },
          ]
        },
      ]
    },
    {
      icon: Calculator,
      label: 'Finance',
      key: 'finance',
      submenu: [
        { label: t('accounting.dashboard') || 'Dashboard', path: '/accounting' },
        { label: t('accounting.coa.title') || 'Chart of Accounts', path: '/accounting/coa' },
        { label: t('accounting.journal.title') || 'Journals', path: '/accounting/journals' },
        { label: t('accounting.quickEntry.title') || 'Quick Entry', path: '/accounting/quick-entry' },
        { label: t('accounting.budget.title') || 'Budgets', path: '/accounting/budgets' },
        { label: t('accounting.fixedAsset.title') || 'Fixed Assets', path: '/accounting/assets' },
        { label: t('accounting.bank.title') || 'Bank', path: '/accounting/bank' },
        { label: t('accounting.beginningBalance.title') || 'Beginning Balance', path: '/accounting/beginning-balance' },
        { label: t('accounting.fiscalPeriod.title') || 'Fiscal Periods', path: '/accounting/fiscal-periods' },
        { label: t('accounting.responsibilityCenter.title') || 'Responsibility Centers', path: '/accounting/responsibility-centers' },
        { label: t('accounting.reports.title') || 'Reports', path: '/accounting/reports' },
        { label: t('accounting.yearEnd.title') || 'Year-End Closing', path: '/accounting/year-end-closing' },
        { label: t('accounting.auditLog.title') || 'Audit Logs', path: '/accounting/audit-logs' },
      ]
    },
    {
      icon: Database,
      label: 'Data Admin',
      key: 'dataAdmin',
      submenu: [
        { label: t('nav.importExport') || 'Import/Export', path: '/import-export' },
      ]
    },
  ];

  // Note: Removed "churches" from default menu - only added for super admin below
  // Removed: Donations, Spiritual Journey

  // Note: Churches menu removed per user request
  // Super admin access churches via direct URL if needed

  menuItems.push({ icon: Settings, label: t('nav.settings'), path: '/settings' });

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } fixed inset-y-0 left-0 z-50 ${
          sidebarCollapsed ? 'w-20' : 'w-64'
        } bg-white shadow-lg transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}
      >
        <div className="flex flex-col h-full">
          {/* Logo/Header */}
          <div className="flex items-center justify-between p-4 border-b">
            {!sidebarCollapsed && <FaithFlowLogo size="sm" />}
            <div className="flex gap-2">
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="hidden lg:block p-1 hover:bg-gray-100 rounded"
                title={sidebarCollapsed ? t('common.expand') || 'Expand' : t('common.collapse') || 'Collapse'}
              >
                {sidebarCollapsed ? (
                  <ChevronsRight className="h-5 w-5 text-gray-600" />
                ) : (
                  <ChevronsLeft className="h-5 w-5 text-gray-600" />
                )}
              </button>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* User Info */}
          {!sidebarCollapsed && (
            <div className="p-4 border-b bg-gray-50">
              <div className="text-sm font-semibold">{user?.full_name}</div>
              <div className="text-xs text-gray-600">{user?.role.replace('_', ' ').toUpperCase()}</div>
              <div className="text-xs text-gray-500 mt-1">{church?.name}</div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = window.location.pathname === item.path;
                const hasSubmenu = item.submenu && item.submenu.length > 0;
                const isExpanded = expandedMenus[item.key];
                const isAnyChildActive = hasSubmenu && item.submenu.some(
                  sub => window.location.pathname === sub.path
                );

                return (
                  <li key={item.path || item.key}>
                    {/* Main menu item */}
                    <button
                      onClick={() => {
                        if (hasSubmenu) {
                          toggleSubmenu(item.key);
                        } else {
                          navigate(item.path);
                          setSidebarOpen(false);
                        }
                      }}
                      className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-3'} w-full p-3 rounded-lg transition-colors ${
                        isActive || isAnyChildActive
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                      title={sidebarCollapsed ? item.label : ''}
                    >
                      <Icon className="h-5 w-5 flex-shrink-0" />
                      {!sidebarCollapsed && (
                        <>
                          <span className="text-sm font-medium">{item.label}</span>
                        </>
                      )}
                      {!sidebarCollapsed && hasSubmenu && (
                        isExpanded ? (
                          <ChevronDown className="h-4 w-4 ml-auto" />
                        ) : (
                          <ChevronRight className="h-4 w-4 ml-auto" />
                        )
                      )}
                    </button>

                    {/* Submenu items */}
                    {hasSubmenu && isExpanded && !sidebarCollapsed && (
                      <ul className="mt-1 ml-9 space-y-1">
                        {item.submenu.map((subItem) => {
                          const isSubActive = window.location.pathname === subItem.path;
                          return (
                            <li key={subItem.path}>
                              <button
                                onClick={() => {
                                  navigate(subItem.path);
                                  setSidebarOpen(false);
                                }}
                                className={`flex items-center w-full p-2 pl-4 rounded-lg text-sm transition-colors ${
                                  isSubActive
                                    ? 'bg-blue-50 text-blue-600 font-medium'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                }`}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-current mr-3 opacity-50"></span>
                                {subItem.label}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Logout Button */}
          <div className="p-4 border-t space-y-3">
            {/* Language Selector */}
            {!sidebarCollapsed && (
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">{t('settings.language')}</Label>
                <Select value={i18n.language} onValueChange={changeLanguage}>
                  <SelectTrigger className="h-9">
                    <SelectValue>
                      {i18n.language === 'en' ? 'English' : 'Bahasa Indonesia'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">🇬🇧 English</SelectItem>
                    <SelectItem value="id">🇮🇩 Bahasa Indonesia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button
              onClick={handleLogout}
              variant="outline"
              className={`w-full ${sidebarCollapsed ? 'px-2' : ''}`}
              title={sidebarCollapsed ? t('auth.logout') : ''}
            >
              <LogOut className={`h-4 w-4 ${sidebarCollapsed ? '' : 'mr-2'}`} />
              {!sidebarCollapsed && t('auth.logout')}
            </Button>
            
            {/* Footer */}
            {!sidebarCollapsed && (
              <div className="pt-3 border-t">
                <p className="text-xs text-center text-gray-500">
                  <span className="font-semibold text-blue-600">{t('app.name')}</span>
                  <br />
                  {t('app.tagline').split(',')[0]}
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm z-10">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex items-center space-x-4">
              <div className="text-sm">
                <span className="text-gray-600">Church:</span>
                <span className="font-semibold ml-2">{church?.name}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
