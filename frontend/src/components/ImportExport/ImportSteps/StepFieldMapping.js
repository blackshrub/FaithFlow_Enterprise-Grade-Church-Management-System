import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Badge } from '../../ui/badge';
import { ChevronRight, ChevronLeft } from 'lucide-react';

const TARGET_FIELDS = [
  { value: 'first_name', label: 'First Name', required: true },
  { value: 'last_name', label: 'Last Name', required: true },
  { value: 'phone_whatsapp', label: 'WhatsApp Number', required: true },
  { value: 'email', label: 'Email', required: false },
  { value: 'date_of_birth', label: 'Date of Birth', required: false },
  { value: 'gender', label: 'Gender', required: false },
  { value: 'blood_type', label: 'Blood Type', required: false },
  { value: 'address', label: 'Address', required: false },
  { value: 'city', label: 'City', required: false },
  { value: 'marital_status', label: 'Marital Status', required: false },
  { value: 'occupation', label: 'Occupation', required: false },
  { value: 'baptism_date', label: 'Baptism Date', required: false },
  { value: 'membership_date', label: 'Membership Date', required: false },
  { value: 'notes', label: 'Notes', required: false },
];

export default function StepFieldMapping({ wizardData, updateWizardData, nextStep, prevStep }) {
  const { t } = useTranslation();

  const handleMappingChange = (sourceField, targetField) => {
    updateWizardData({
      fieldMappings: {
        ...wizardData.fieldMappings,
        [sourceField]: targetField,
      },
    });
  };

  const autoMap = () => {
    const mappings = {};
    wizardData.headers.forEach(header => {
      const normalized = header.toLowerCase().replace(/[\s_-]+/g, '_');
      
      // Try to find matching target field
      const match = TARGET_FIELDS.find(tf => 
        tf.value === normalized || 
        tf.label.toLowerCase().replace(/[\s_-]+/g, '_') === normalized
      );
      
      if (match) {
        mappings[header] = match.value;
      }
    });
    updateWizardData({ fieldMappings: mappings });
  };

  const canProceed = () => {
    const requiredFields = TARGET_FIELDS.filter(f => f.required).map(f => f.value);
    const mappedTargets = Object.values(wizardData.fieldMappings);
    return requiredFields.every(rf => mappedTargets.includes(rf));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>{t('importExport.mapFields')}</CardTitle>
            <CardDescription>{t('importExport.mapFieldsDesc')}</CardDescription>
          </div>
          <Button onClick={autoMap} variant="outline" size="sm">
            {t('importExport.autoMap')}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('importExport.sourceColumn')}</TableHead>
                <TableHead>{t('importExport.sampleValue')}</TableHead>
                <TableHead>{t('importExport.targetField')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {wizardData.headers.map((header) => (
                <TableRow key={header}>
                  <TableCell className="font-medium">{header}</TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {wizardData.sampleData[0]?.[header] || '-'}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={wizardData.fieldMappings[header] || ''}
                      onValueChange={(value) => handleMappingChange(header, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('importExport.selectField')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_skip_">{t('importExport.skipField')}</SelectItem>
                        {TARGET_FIELDS.map((field) => (
                          <SelectItem key={field.value} value={field.value}>
                            {field.label} {field.required && '(Required)'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {!canProceed() && (
          <Alert variant="destructive">
            <AlertDescription>
              {t('importExport.mapRequiredFields')}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={prevStep}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            {t('importExport.previous')}
          </Button>
          <Button onClick={nextStep} disabled={!canProceed()}>
            {t('importExport.next')}
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
