import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Label } from '../../ui/label';
import { Input } from '../../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Badge } from '../../ui/badge';
import { Alert, AlertDescription } from '../../ui/alert';
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
  const [defaultValues, setDefaultValues] = useState({});

  const handleMappingChange = (targetField, sourceField) => {
    // Store reversed mapping: sourceField -> targetField for backend
    const newMappings = { ...wizardData.fieldMappings };
    
    // Remove old mapping for this target field
    Object.keys(newMappings).forEach(key => {
      if (newMappings[key] === targetField) {
        delete newMappings[key];
      }
    });
    
    // Add new mapping if not skip
    if (sourceField && sourceField !== '_skip_' && sourceField !== '_default_') {
      newMappings[sourceField] = targetField;
    }
    
    updateWizardData({ fieldMappings: newMappings });
  };

  const handleDefaultValueChange = (targetField, value) => {
    setDefaultValues({
      ...defaultValues,
      [targetField]: value,
    });
    
    // Store default values in wizard data
    updateWizardData({
      defaultValues: {
        ...wizardData.defaultValues,
        [targetField]: value,
      },
    });
  };

  const autoMap = () => {
    const mappings = {};
    TARGET_FIELDS.forEach(targetField => {
      const normalized = targetField.value.toLowerCase().replace(/[\s_-]+/g, '_');
      
      // Try to find matching source column
      const match = wizardData.headers.find(header => {
        const headerNormalized = header.toLowerCase().replace(/[\s_-]+/g, '_');
        return headerNormalized === normalized || headerNormalized.includes(normalized);
      });
      
      if (match) {
        mappings[match] = targetField.value;
      }
    });
    updateWizardData({ fieldMappings: mappings });
  };

  const getSourceFieldForTarget = (targetField) => {
    // Find which source field maps to this target field
    const entry = Object.entries(wizardData.fieldMappings).find(
      ([source, target]) => target === targetField
    );
    return entry ? entry[0] : '';
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
                <TableHead>{t('importExport.appField')}</TableHead>
                <TableHead>{t('importExport.required')}</TableHead>
                <TableHead>{t('importExport.sourceColumn')}</TableHead>
                <TableHead>{t('importExport.defaultValue')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {TARGET_FIELDS.map((field) => {
                const sourceField = getSourceFieldForTarget(field.value);
                const hasDefault = defaultValues[field.value];
                
                return (
                  <TableRow key={field.value}>
                    <TableCell className="font-medium">
                      {field.label}
                      {field.required && <Badge className="ml-2" variant="destructive">Required</Badge>}
                    </TableCell>
                    <TableCell>
                      {field.required ? (
                        <Badge variant="destructive">Yes</Badge>
                      ) : (
                        <Badge variant="secondary">No</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={sourceField || ''}
                        onValueChange={(value) => handleMappingChange(field.value, value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('importExport.selectColumn')} />
                        </SelectTrigger>
                        <SelectContent>
                          {!field.required && (
                            <>
                              <SelectItem value="_skip_">{t('importExport.skipField')}</SelectItem>
                              <SelectItem value="_default_">{t('importExport.useDefault')}</SelectItem>
                            </>
                          )}
                          {wizardData.headers.map((header) => (
                            <SelectItem key={header} value={header}>
                              {header}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        placeholder={t('importExport.enterDefault')}
                        value={defaultValues[field.value] || ''}
                        onChange={(e) => handleDefaultValueChange(field.value, e.target.value)}
                        disabled={!!sourceField && sourceField !== '_default_'}
                        className="max-w-xs"
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
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
