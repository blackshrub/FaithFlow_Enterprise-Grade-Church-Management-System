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
  const { isSuperAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('general');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('settings.title')}</h1>
        <p className="text-gray-600 mt-1">{t('settings.subtitle')}</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className={`grid w-full max-w-4xl ${isSuperAdmin ? 'grid-cols-7' : 'grid-cols-6'}`}>
          <TabsTrigger value="general">{t('settings.general')}</TabsTrigger>
          <TabsTrigger value="categories">{t('settings.categories') || 'Categories'}</TabsTrigger>
          <TabsTrigger value="automation">{t('settings.statusAutomation') || 'Status Automation'}</TabsTrigger>
          <TabsTrigger value="demographics">{t('settings.demographics')}</TabsTrigger>
          <TabsTrigger value="kiosk">{t('settings.kiosk') || 'Kiosk'}</TabsTrigger>
          <TabsTrigger value="explore">{t('settings.explore') || 'Explore'}</TabsTrigger>
          {isSuperAdmin && <TabsTrigger value="ai-prompts">{t('settings.aiPrompts') || 'AI Prompts'}</TabsTrigger>}
        </TabsList>

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
