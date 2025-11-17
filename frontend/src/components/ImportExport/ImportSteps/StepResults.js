import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '../../ui/card';
import { CheckCircle } from 'lucide-react';

export default function StepResults() {
  const { t } = useTranslation();
  
  return (
    <Card>
      <CardContent className="py-12">
        <div className="text-center">
          <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">{t('importExport.importComplete')}</h3>
        </div>
      </CardContent>
    </Card>
  );
}
