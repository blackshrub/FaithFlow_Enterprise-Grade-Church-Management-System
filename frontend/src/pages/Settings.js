import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import GeneralSettingsTab from '../components/Settings/GeneralSettingsTab';
import MemberStatusesTabNew from '../components/Settings/MemberStatusesTabNew';
import StatusRulesTab from '../components/Settings/StatusRulesTab';
import AutomationSettingsTab from '../components/Settings/AutomationSettingsTab';
import DemographicsTab from '../components/Settings/DemographicsTab';
import EventCategoriesTab from '../components/Settings/EventCategoriesTab';
import WebhooksTab from '../components/Settings/WebhooksTab';

export default function Settings() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('general');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('settings.title')}</h1>
        <p className="text-gray-600 mt-1">{t('settings.subtitle')}</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-5xl grid-cols-7">
          <TabsTrigger value="general">{t('settings.general')}</TabsTrigger>
          <TabsTrigger value="statuses">Statuses</TabsTrigger>
          <TabsTrigger value="rules">Rules</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
          <TabsTrigger value="demographics">{t('settings.demographics')}</TabsTrigger>
          <TabsTrigger value="categories">{t('settings.eventCategories')}</TabsTrigger>
          <TabsTrigger value="webhooks">{t('settings.webhooks.title')}</TabsTrigger>
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
      </Tabs>
    </div>
  );
}
