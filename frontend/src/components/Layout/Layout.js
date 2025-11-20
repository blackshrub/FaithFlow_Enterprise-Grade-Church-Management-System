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
      setExpandedMenus(prev => ({ ...prev, events: true }));
    }
    if (path.includes('/counseling')) {
      setExpandedMenus(prev => ({ ...prev, counseling: true }));
    }
    if (path.includes('/articles')) {
      setExpandedMenus(prev => ({ ...prev, articles: true }));
    }
    if (path.includes('/accounting')) {
      setExpandedMenus(prev => ({ ...prev, finance: true }));
    }
  }, [location.pathname]);

  const menuItems = [
    // Dashboard (no section)
    { icon: LayoutDashboard, label: t('nav.dashboard'), path: '/dashboard' },
    
    // People Section
    { type: 'section', label: 'PEOPLE' },
    { icon: Users, label: t('nav.members'), path: '/members' },
    { icon: UsersRound, label: t('nav.groups'), path: '/groups' },
    
    // Worship & Events Section
    { type: 'section', label: 'WORSHIP & EVENTS' },
    {
      icon: Calendar,
      label: 'Events',
      key: 'events',
      submenu: [
        { label: 'Events List', path: '/events' },
        { label: 'Seat Layouts', path: '/seat-layouts' },
        { label: 'Kiosk Mode', path: '/kiosk' },
      ]
    },
    
    // Spiritual Care Section
    { type: 'section', label: 'SPIRITUAL CARE' },
    { icon: Heart, label: t('prayerRequests.title') || 'Prayer Requests', path: '/prayer-requests' },
    {
      icon: MessageCircleHeart,
      label: 'Counseling & Prayer',
      key: 'counseling',
      submenu: [
        { label: 'Dashboard', path: '/counseling' },
        { label: 'Counselors', path: '/counseling/counselors' },
        { label: 'Availability', path: '/counseling/availability' },
        { label: 'Appointments', path: '/counseling/appointments' },
      ]
    },
    
    // Content & Communication Section
    { type: 'section', label: 'CONTENT & COMMUNICATION' },
    { icon: BookOpen, label: 'Devotion', path: '/devotions' },
    {
      icon: FileText,
      label: t('articles.title') || 'Articles',
      key: 'articles',
      submenu: [
        { label: 'All Articles', path: '/articles' },
        { label: 'Add New Article', path: '/articles/new' },
        { label: 'Article Categories', path: '/articles/categories' },
        { label: 'Article Tags', path: '/articles/tags' },
        { label: 'Comment Moderation', path: '/articles/comments' },
      ]
    },
    
    // Management Section
    { type: 'section', label: 'MANAGEMENT' },
    {
      icon: Calculator,
      label: 'Finance',
      key: 'finance',
      submenu: [
        { label: 'Accounting Dashboard', path: '/accounting' },
        { label: 'Chart of Accounts', path: '/accounting/coa' },
        { label: 'Journals', path: '/accounting/journals' },
        { label: 'Quick Entry', path: '/accounting/quick-entry' },
        { label: 'Budgets', path: '/accounting/budgets' },
        { label: 'Fixed Assets', path: '/accounting/assets' },
        { label: 'Bank Reconciliation', path: '/accounting/bank' },
        { label: 'Beginning Balance', path: '/accounting/beginning-balance' },
        { label: 'Fiscal Periods', path: '/accounting/fiscal-periods' },
        { label: 'Responsibility Centers', path: '/accounting/responsibility-centers' },
        { label: 'Reports', path: '/accounting/reports' },
        { label: 'Year-End Closing', path: '/accounting/year-end-closing' },
        { label: 'Audit Logs', path: '/accounting/audit-logs' },
      ]
    },
    
    // System Section
    { type: 'section', label: 'SYSTEM' },
    { icon: Settings, label: t('nav.settings'), path: '/settings' },
    { icon: Upload, label: 'Import/Export', path: '/import-export' },
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
                          const hasSubSubmenu = subItem.submenu && subItem.submenu.length > 0;
                          const isSubExpanded = expandedMenus[subItem.key];
                          const isAnySubChildActive = hasSubSubmenu && subItem.submenu.some(
                            subSub => window.location.pathname === subSub.path
                          );
                          
                          return (
                            <li key={subItem.path || subItem.key}>
                              <button
                                onClick={() => {
                                  if (hasSubSubmenu) {
                                    toggleSubmenu(subItem.key);
                                  } else {
                                    navigate(subItem.path);
                                    setSidebarOpen(false);
                                  }
                                }}
                                className={`flex items-center w-full p-2 pl-4 rounded-lg text-sm transition-colors ${
                                  isSubActive || isAnySubChildActive
                                    ? 'bg-blue-50 text-blue-600 font-medium'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                }`}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-current mr-3 opacity-50"></span>
                                {subItem.label}
                                {hasSubSubmenu && (
                                  isSubExpanded ? (
                                    <ChevronDown className="h-3 w-3 ml-auto" />
                                  ) : (
                                    <ChevronRight className="h-3 w-3 ml-auto" />
                                  )
                                )}
                              </button>
                              
                              {/* Level 3 submenu */}
                              {hasSubSubmenu && isSubExpanded && (
                                <ul className="mt-1 ml-6 space-y-1">
                                  {subItem.submenu.map((subSubItem) => {
                                    const isSubSubActive = window.location.pathname === subSubItem.path;
                                    return (
                                      <li key={subSubItem.path}>
                                        <button
                                          onClick={() => {
                                            navigate(subSubItem.path);
                                            setSidebarOpen(false);
                                          }}
                                          className={`flex items-center w-full p-2 pl-4 rounded-lg text-xs transition-colors ${
                                            isSubSubActive
                                              ? 'bg-blue-50 text-blue-600 font-medium'
                                              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                                          }`}
                                        >
                                          <span className="w-1 h-1 rounded-full bg-current mr-2 opacity-50"></span>
                                          {subSubItem.label}
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
