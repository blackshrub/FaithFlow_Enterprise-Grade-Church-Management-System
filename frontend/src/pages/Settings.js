import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import GeneralSettingsTab from '../components/Settings/GeneralSettingsTab';
import CategoriesTab from '../components/Settings/CategoriesTab';
import StatusAutomationTab from '../components/Settings/StatusAutomationTab';
import DemographicsTab from '../components/Settings/DemographicsTab';
import KioskSettingsTab from './Settings/KioskSettings';
import ExploreSettingsTab from '../components/Settings/ExploreSettingsTab';
import ExploreAIPromptsTab from '../components/Settings/ExploreAIPromptsTab';

export default function Settings() {
  const { t } = useTranslation();
  const { isSuperAdmin, church, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('general');

  // Early return while auth is loading or church context not ready
  // This prevents child tabs from rendering before church.id is available
  if (authLoading || !church?.id) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">{t('common.loading') || 'Loading...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('settings.title')}</h1>
        <p className="text-gray-600 mt-1">{t('settings.subtitle')}</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <TabsList className="inline-flex w-max md:w-full md:grid md:max-w-4xl md:grid-cols-6 lg:grid-cols-7 gap-1">
            <TabsTrigger value="general" className="whitespace-nowrap">{t('settings.general')}</TabsTrigger>
            <TabsTrigger value="categories" className="whitespace-nowrap">{t('settings.categories') || 'Categories'}</TabsTrigger>
            <TabsTrigger value="automation" className="whitespace-nowrap">{t('settings.statusAutomation') || 'Automation'}</TabsTrigger>
            <TabsTrigger value="demographics" className="whitespace-nowrap">{t('settings.demographics')}</TabsTrigger>
            <TabsTrigger value="kiosk" className="whitespace-nowrap">{t('settings.kiosk') || 'Kiosk'}</TabsTrigger>
            <TabsTrigger value="explore" className="whitespace-nowrap">{t('settings.explore') || 'Explore'}</TabsTrigger>
            {isSuperAdmin && <TabsTrigger value="ai-prompts" className="whitespace-nowrap">{t('settings.aiPrompts') || 'AI Prompts'}</TabsTrigger>}
          </TabsList>
        </div>

        <TabsContent value="general" className="mt-6">
          <GeneralSettingsTab />
        </TabsContent>

        <TabsContent value="categories" className="mt-6">
          <CategoriesTab />
        </TabsContent>

        <TabsContent value="automation" className="mt-6">
          <StatusAutomationTab />
        </TabsContent>

        <TabsContent value="demographics" className="mt-6">
          <DemographicsTab />
        </TabsContent>

        <TabsContent value="kiosk" className="mt-6">
          <KioskSettingsTab />
        </TabsContent>

        <TabsContent value="explore" className="mt-6">
          <ExploreSettingsTab />
        </TabsContent>

        {isSuperAdmin && (
          <TabsContent value="ai-prompts" className="mt-6">
            <ExploreAIPromptsTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
