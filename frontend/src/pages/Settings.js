import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import GeneralSettingsTab from '../components/Settings/GeneralSettingsTab';
import MemberStatusesTab from '../components/Settings/MemberStatusesTab';
import DemographicsTab from '../components/Settings/DemographicsTab';
import EventCategoriesTab from '../components/Settings/EventCategoriesTab';

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
        <TabsList className="grid w-full max-w-3xl grid-cols-4">
          <TabsTrigger value="general">{t('settings.general')}</TabsTrigger>
          <TabsTrigger value="statuses">{t('settings.memberStatuses')}</TabsTrigger>
          <TabsTrigger value="demographics">{t('settings.demographics')}</TabsTrigger>
          <TabsTrigger value="categories">{t('settings.eventCategories')}</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6">
          <GeneralSettingsTab />
        </TabsContent>

        <TabsContent value="statuses" className="mt-6">
          <MemberStatusesTab />
        </TabsContent>

        <TabsContent value="demographics" className="mt-6">
          <DemographicsTab />
        </TabsContent>

        <TabsContent value="categories" className="mt-6">
          <EventCategoriesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
