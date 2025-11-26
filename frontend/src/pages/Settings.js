import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import GeneralSettingsTab from '../components/Settings/GeneralSettingsTab';
import MemberStatusesTabNew from '../components/Settings/MemberStatusesTabNew';
import StatusRulesTab from '../components/Settings/StatusRulesTab';
import AutomationSettingsTab from '../components/Settings/AutomationSettingsTab';
import DemographicsTab from '../components/Settings/DemographicsTab';
import EventCategoriesTab from '../components/Settings/EventCategoriesTab';
import WebhooksTab from '../components/Settings/WebhooksTab';
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
        <TabsList className={`grid w-full max-w-6xl ${isSuperAdmin ? 'grid-cols-10' : 'grid-cols-9'}`}>
          <TabsTrigger value="general">{t('settings.general')}</TabsTrigger>
          <TabsTrigger value="statuses">Statuses</TabsTrigger>
          <TabsTrigger value="rules">Rules</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
          <TabsTrigger value="demographics">{t('settings.demographics')}</TabsTrigger>
          <TabsTrigger value="categories">{t('settings.eventCategories')}</TabsTrigger>
          <TabsTrigger value="webhooks">{t('settings.webhooks.title')}</TabsTrigger>
          <TabsTrigger value="kiosk">Kiosk</TabsTrigger>
          <TabsTrigger value="explore">Explore</TabsTrigger>
          {isSuperAdmin && <TabsTrigger value="ai-prompts">AI Prompts</TabsTrigger>}
        </TabsList>

        <TabsContent value="general" className="mt-6">
          <GeneralSettingsTab />
        </TabsContent>

        <TabsContent value="statuses" className="mt-6">
          <MemberStatusesTabNew />
        </TabsContent>

        <TabsContent value="rules" className="mt-6">
          <StatusRulesTab />
        </TabsContent>

        <TabsContent value="automation" className="mt-6">
          <AutomationSettingsTab />
        </TabsContent>

        <TabsContent value="demographics" className="mt-6">
          <DemographicsTab />
        </TabsContent>

        <TabsContent value="categories" className="mt-6">
          <EventCategoriesTab />
        </TabsContent>

        <TabsContent value="webhooks" className="mt-6">
          <WebhooksTab />
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
