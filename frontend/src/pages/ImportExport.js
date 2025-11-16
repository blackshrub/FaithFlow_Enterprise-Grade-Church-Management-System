import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import ImportWizard from '../components/ImportExport/ImportWizard';
import ExportPanel from '../components/ImportExport/ExportPanel';
import ImportHistory from '../components/ImportExport/ImportHistory';

export default function ImportExport() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('import');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('importExport.title')}</h1>
        <p className="text-gray-600 mt-1">{t('importExport.subtitle')}</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
          <TabsTrigger value="import">{t('importExport.import')}</TabsTrigger>
          <TabsTrigger value="export">{t('importExport.export')}</TabsTrigger>
          <TabsTrigger value="history">{t('importExport.history')}</TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="mt-6">
          <ImportWizard />
        </TabsContent>

        <TabsContent value="export" className="mt-6">
          <ExportPanel />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <ImportHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}
