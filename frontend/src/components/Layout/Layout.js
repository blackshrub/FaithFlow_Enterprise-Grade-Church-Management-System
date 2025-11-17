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
} from 'lucide-react';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';

export default function Layout() {
  const { t, i18n } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
    if (path.includes('/events') || path.includes('/seat-layouts')) {
      setExpandedMenus(prev => ({ ...prev, events: true }));
    }
  }, [location.pathname]);

  const menuItems = [
    { icon: LayoutDashboard, label: t('nav.dashboard'), path: '/dashboard' },
    { icon: Users, label: t('nav.members'), path: '/members' },
    { icon: UsersRound, label: t('nav.groups'), path: '/groups' },
    {
      icon: Calendar,
      label: t('nav.events'),
      key: 'events',
      submenu: [
        { label: t('events.event.eventsList'), path: '/events' },
        { label: t('events.seatLayouts'), path: '/seat-layouts' },
        { label: t('events.kioskMode'), path: '/kiosk' },
      ]
    },
    { icon: DollarSign, label: t('nav.donations'), path: '/donations' },
    { icon: Heart, label: t('nav.prayers'), path: '/prayers' },
    { icon: BookOpen, label: t('nav.content'), path: '/content' },
    { icon: Award, label: t('nav.spiritualJourney'), path: '/spiritual-journey' },
  ];

  if (isSuperAdmin) {
    menuItems.push({ icon: Church, label: t('nav.churches'), path: '/churches' });
  }

  menuItems.push({ icon: Upload, label: t('nav.importExport'), path: '/import-export' });
  menuItems.push({ icon: Settings, label: t('nav.settings'), path: '/settings' });

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}
      >
        <div className="flex flex-col h-full">
          {/* Logo/Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center space-x-2">
              <Church className="h-8 w-8 text-blue-600" />
              <span className="font-bold text-lg">Church Admin</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* User Info */}
          <div className="p-4 border-b bg-gray-50">
            <div className="text-sm font-semibold">{user?.full_name}</div>
            <div className="text-xs text-gray-600">{user?.role.replace('_', ' ').toUpperCase()}</div>
            <div className="text-xs text-gray-500 mt-1">{church?.name}</div>
          </div>

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
                      className={`flex items-center justify-between w-full p-3 rounded-lg transition-colors ${
                        isActive || isAnyChildActive
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className="h-5 w-5" />
                        <span className="text-sm font-medium">{item.label}</span>
                      </div>
                      {hasSubmenu && (
                        isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )
                      )}
                    </button>

                    {/* Submenu items */}
                    {hasSubmenu && isExpanded && (
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
            <Button
              onClick={handleLogout}
              variant="outline"
              className="w-full"
            >
              <LogOut className="h-4 w-4 mr-2" />
              {t('auth.logout')}
            </Button>
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
