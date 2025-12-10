/**
 * Multi-Device Notification Preview Component
 *
 * Shows how push notifications will appear on different devices:
 * - iOS (iPhone 14 Pro style)
 * - Android (Pixel style)
 * - Lock screen vs notification center
 * - Light and dark mode
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, Sun, Moon, Smartphone, TabletSmartphone } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { Switch } from '../../../components/ui/switch';
import { Label } from '../../../components/ui/label';
import { cn } from '../../../lib/utils';

// =============================================================================
// iOS PREVIEW COMPONENT
// =============================================================================

const IOSPreview = ({ title, body, imageUrl, isDark, isLockScreen, appName = 'FaithFlow' }) => {
  const bgColor = isDark ? 'bg-black' : 'bg-gray-100';
  const cardBg = isDark ? 'bg-gray-800/90' : 'bg-white/90';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-500';
  const statusBarColor = isDark ? 'text-white' : 'text-black';

  return (
    <div className="w-[280px] mx-auto">
      {/* iPhone Frame */}
      <div className="bg-gray-900 rounded-[3rem] p-[3px] shadow-2xl">
        <div className={cn('rounded-[2.8rem] overflow-hidden relative', bgColor)}>
          {/* Dynamic Island */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[120px] h-[35px] bg-black rounded-full z-10" />

          {/* Status Bar */}
          <div className={cn('pt-14 px-6 flex justify-between text-sm font-semibold', statusBarColor)}>
            <span>9:41</span>
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2 17h2v4H2zm4-5h2v9H6zm4-4h2v13h-2zm4-4h2v17h-2zm4-4h2v21h-2z"/>
              </svg>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17 4h-3V2h-4v2H7v18h10V4zm-1 16H8V6h8v14z"/>
              </svg>
            </div>
          </div>

          {/* Lock Screen or Home */}
          <div className="min-h-[520px] px-4 py-4">
            {isLockScreen && (
              <div className={cn('text-center mb-8 mt-4', textPrimary)}>
                <div className="text-7xl font-thin">9:41</div>
                <div className={cn('text-lg', textSecondary)}>Monday, January 15</div>
              </div>
            )}

            {/* Notification Card */}
            <div className={cn('rounded-3xl p-4 backdrop-blur-xl shadow-lg', cardBg)}>
              <div className="flex items-start gap-3">
                {/* App Icon */}
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-md">
                  <Bell className="w-5 h-5 text-white" />
                </div>

                <div className="flex-1 min-w-0">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <span className={cn('text-xs font-medium uppercase tracking-wide', textSecondary)}>
                      {appName}
                    </span>
                    <span className={cn('text-xs', textSecondary)}>now</span>
                  </div>

                  {/* Title */}
                  <p className={cn('font-semibold text-[15px] mt-1 line-clamp-2', textPrimary)}>
                    {title || 'Notification Title'}
                  </p>

                  {/* Body */}
                  <p className={cn('text-[13px] mt-1 line-clamp-3', textSecondary)}>
                    {body || 'Your notification message will appear here...'}
                  </p>
                </div>
              </div>

              {/* Rich Media Image */}
              {imageUrl && (
                <div className="mt-3 rounded-xl overflow-hidden">
                  <img
                    src={imageUrl}
                    alt="Notification"
                    className="w-full h-36 object-cover"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Home Indicator */}
          <div className="flex justify-center pb-2">
            <div className={cn('w-32 h-1 rounded-full', isDark ? 'bg-gray-600' : 'bg-gray-300')} />
          </div>
        </div>
      </div>
      <p className="text-center text-xs text-muted-foreground mt-3">
        iPhone 14 Pro • iOS 17
      </p>
    </div>
  );
};

// =============================================================================
// ANDROID PREVIEW COMPONENT
// =============================================================================

const AndroidPreview = ({ title, body, imageUrl, isDark, isLockScreen, appName = 'FaithFlow' }) => {
  const bgColor = isDark ? 'bg-gray-900' : 'bg-gray-50';
  const cardBg = isDark ? 'bg-gray-800' : 'bg-white';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-600';
  const statusBarColor = isDark ? 'text-white' : 'text-gray-900';

  return (
    <div className="w-[280px] mx-auto">
      {/* Android Frame */}
      <div className="bg-gray-800 rounded-[2rem] p-[3px] shadow-2xl">
        <div className={cn('rounded-[1.8rem] overflow-hidden', bgColor)}>
          {/* Status Bar */}
          <div className={cn('pt-2 px-5 flex justify-between text-xs', statusBarColor)}>
            <span>9:41</span>
            <div className="flex items-center gap-2">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17 4h-3V2h-4v2H7v18h10V4z"/>
              </svg>
            </div>
          </div>

          {/* Lock Screen or Home */}
          <div className="min-h-[520px] px-4 py-4">
            {isLockScreen && (
              <div className={cn('text-center mb-6 mt-2', textPrimary)}>
                <div className="text-6xl font-light">9:41</div>
                <div className={cn('text-sm mt-1', textSecondary)}>Mon, Jan 15</div>
              </div>
            )}

            {/* Notification Card - Material You Style */}
            <div className={cn('rounded-2xl overflow-hidden shadow-md', cardBg)}>
              {/* Header with app info */}
              <div className="px-4 pt-3 pb-2 flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <Bell className="w-3 h-3 text-white" />
                </div>
                <span className={cn('text-xs', textSecondary)}>{appName}</span>
                <span className={cn('text-xs ml-auto', textSecondary)}>now</span>
              </div>

              {/* Content */}
              <div className="px-4 pb-3">
                {/* Title */}
                <p className={cn('font-medium text-[14px] line-clamp-1', textPrimary)}>
                  {title || 'Notification Title'}
                </p>

                {/* Body */}
                <p className={cn('text-[13px] mt-1 line-clamp-2', textSecondary)}>
                  {body || 'Your notification message will appear here...'}
                </p>
              </div>

              {/* Rich Media Image */}
              {imageUrl && (
                <div>
                  <img
                    src={imageUrl}
                    alt="Notification"
                    className="w-full h-40 object-cover"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                </div>
              )}

              {/* Action Buttons (Android style) */}
              <div className={cn('px-4 py-2 flex gap-4 border-t', isDark ? 'border-gray-700' : 'border-gray-100')}>
                <button className="text-xs font-medium text-indigo-500 uppercase">Open</button>
                <button className="text-xs font-medium text-indigo-500 uppercase">Dismiss</button>
              </div>
            </div>
          </div>

          {/* Navigation Bar */}
          <div className={cn('flex justify-center items-center gap-12 py-3', isDark ? 'bg-black' : 'bg-white')}>
            <div className={cn('w-5 h-5 border-2 rounded', isDark ? 'border-gray-600' : 'border-gray-400')} />
            <div className={cn('w-5 h-5 rounded-full border-2', isDark ? 'border-gray-600' : 'border-gray-400')} />
            <div className={cn('w-5 h-0.5', isDark ? 'bg-gray-600' : 'bg-gray-400')} style={{ transform: 'rotate(-45deg)' }} />
          </div>
        </div>
      </div>
      <p className="text-center text-xs text-muted-foreground mt-3">
        Pixel 7 • Android 14
      </p>
    </div>
  );
};

// =============================================================================
// WATCH PREVIEW COMPONENT (Apple Watch)
// =============================================================================

const WatchPreview = ({ title, body, isDark, appName = 'FaithFlow' }) => {
  const bgColor = isDark ? 'bg-black' : 'bg-gray-900';
  const textPrimary = 'text-white';
  const textSecondary = 'text-gray-400';

  return (
    <div className="w-[160px] mx-auto">
      {/* Watch Frame */}
      <div className="bg-gray-700 rounded-[2.5rem] p-[4px] shadow-xl">
        <div className={cn('rounded-[2.3rem] overflow-hidden', bgColor)}>
          {/* Watch Face */}
          <div className="min-h-[180px] p-3">
            {/* Time */}
            <div className="text-center mb-3">
              <div className={cn('text-2xl font-light', textPrimary)}>9:41</div>
            </div>

            {/* Notification */}
            <div className="bg-gray-800/80 rounded-xl p-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-5 h-5 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <Bell className="w-3 h-3 text-white" />
                </div>
                <span className={cn('text-[10px] uppercase', textSecondary)}>{appName}</span>
              </div>
              <p className={cn('text-[11px] font-medium line-clamp-2', textPrimary)}>
                {title || 'Title'}
              </p>
              <p className={cn('text-[9px] mt-0.5 line-clamp-2', textSecondary)}>
                {body || 'Message...'}
              </p>
            </div>
          </div>
        </div>
      </div>
      <p className="text-center text-xs text-muted-foreground mt-2">
        Apple Watch
      </p>
    </div>
  );
};

// =============================================================================
// MAIN DEVICE PREVIEW COMPONENT
// =============================================================================

export default function DevicePreview({ title, body, imageUrl, appName = 'FaithFlow' }) {
  const { t } = useTranslation();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLockScreen, setIsLockScreen] = useState(true);
  const [activeDevice, setActiveDevice] = useState('ios');

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4 justify-center">
        <div className="flex items-center gap-2">
          <Sun className="w-4 h-4 text-muted-foreground" />
          <Switch
            id="dark-mode"
            checked={isDarkMode}
            onCheckedChange={setIsDarkMode}
          />
          <Moon className="w-4 h-4 text-muted-foreground" />
          <Label htmlFor="dark-mode" className="text-sm text-muted-foreground ml-1">
            {isDarkMode ? t('broadcasts.preview.darkMode', 'Dark') : t('broadcasts.preview.lightMode', 'Light')}
          </Label>
        </div>

        <div className="flex items-center gap-2">
          <Switch
            id="lock-screen"
            checked={isLockScreen}
            onCheckedChange={setIsLockScreen}
          />
          <Label htmlFor="lock-screen" className="text-sm text-muted-foreground">
            {isLockScreen ? t('broadcasts.preview.lockScreen', 'Lock Screen') : t('broadcasts.preview.homeScreen', 'Home')}
          </Label>
        </div>
      </div>

      {/* Device Tabs */}
      <Tabs value={activeDevice} onValueChange={setActiveDevice} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="ios" className="flex items-center gap-1">
            <Smartphone className="w-4 h-4" />
            iOS
          </TabsTrigger>
          <TabsTrigger value="android" className="flex items-center gap-1">
            <TabletSmartphone className="w-4 h-4" />
            Android
          </TabsTrigger>
          <TabsTrigger value="both" className="flex items-center gap-1">
            <span className="text-xs">Both</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ios" className="mt-6 flex justify-center">
          <IOSPreview
            title={title}
            body={body}
            imageUrl={imageUrl}
            isDark={isDarkMode}
            isLockScreen={isLockScreen}
            appName={appName}
          />
        </TabsContent>

        <TabsContent value="android" className="mt-6 flex justify-center">
          <AndroidPreview
            title={title}
            body={body}
            imageUrl={imageUrl}
            isDark={isDarkMode}
            isLockScreen={isLockScreen}
            appName={appName}
          />
        </TabsContent>

        <TabsContent value="both" className="mt-6">
          <div className="flex flex-wrap justify-center gap-8">
            <IOSPreview
              title={title}
              body={body}
              imageUrl={imageUrl}
              isDark={isDarkMode}
              isLockScreen={isLockScreen}
              appName={appName}
            />
            <AndroidPreview
              title={title}
              body={body}
              imageUrl={imageUrl}
              isDark={isDarkMode}
              isLockScreen={isLockScreen}
              appName={appName}
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Tips */}
      <div className="text-center text-xs text-muted-foreground mt-4 px-4">
        <p>{t('broadcasts.preview.tips', 'Tip: Titles over 50 characters may be truncated on some devices')}</p>
      </div>
    </div>
  );
}

// Export individual components for flexible usage
export { IOSPreview, AndroidPreview, WatchPreview };
