import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Label } from '../../ui/label';
import { Input } from '../../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Badge } from '../../ui/badge';
import { ChevronRight, ChevronLeft, Plus, Trash2 } from 'lucide-react';

const PREDEFINED_MAPPINGS = {
  gender: {
    values: ['Male', 'Female'],
    commonMappings: {
      'M': 'Male', 'F': 'Female', 'Male': 'Male', 'Female': 'Female',
      'L': 'Male', 'P': 'Female', 'Laki-laki': 'Male', 'Perempuan': 'Female',
      'male': 'Male', 'female': 'Female', '1': 'Male', '2': 'Female'
    }
  },
  blood_type: {
    values: ['A', 'B', 'AB', 'O'],
    commonMappings: {
      'A+': 'A', 'A-': 'A', 'B+': 'B', 'B-': 'B',
      'AB+': 'AB', 'AB-': 'AB', 'O+': 'O', 'O-': 'O'
    }
  },
  marital_status: {
    values: ['Married', 'Not Married', 'Widower', 'Widow'],
    commonMappings: {
      'M': 'Married', 'Married': 'Married', 'married': 'Married',
      'S': 'Not Married', 'Single': 'Not Married', 'single': 'Not Married',
      'Belum Menikah': 'Not Married', 'Menikah': 'Married',
      'W': 'Widower', 'Widower': 'Widower', 'widower': 'Widower',
      'Widow': 'Widow', 'widow': 'Widow', 'Janda': 'Widow', 'Duda': 'Widower',
      'D': 'Not Married', 'Divorced': 'Not Married', 'divorced': 'Not Married'
    }
  }
};

export default function StepValueMapping({ wizardData, updateWizardData, nextStep, prevStep }) {
  const { t } = useTranslation();
  const [selectedField, setSelectedField] = useState('gender');
  const [customMapping, setCustomMapping] = useState({ source: '', target: '' });

  // Get unique values from sample data for selected field
  const getUniqueValues = (field) => {
    const sourceField = Object.keys(wizardData.fieldMappings).find(
      key => wizardData.fieldMappings[key] === field
    );
    if (!sourceField) return [];

    const values = new Set();
    wizardData.sampleData.forEach(row => {
      if (row[sourceField]) {
        values.add(row[sourceField]);
      }
    });
    return Array.from(values);
  };

  const addMapping = (field, sourceValue, targetValue) => {
    updateWizardData({
      valueMappings: {
        ...wizardData.valueMappings,
        [field]: {
          ...(wizardData.valueMappings[field] || {}),
          [sourceValue]: targetValue,
        },
      },
    });
  };

  const removeMapping = (field, sourceValue) => {
    const fieldMappings = { ...wizardData.valueMappings[field] };
    delete fieldMappings[sourceValue];
    updateWizardData({
      valueMappings: {
        ...wizardData.valueMappings,
        [field]: fieldMappings,
      },
    });
  };

  const applyCommonMappings = (field) => {
    const common = PREDEFINED_MAPPINGS[field]?.commonMappings || {};
    updateWizardData({
      valueMappings: {
        ...wizardData.valueMappings,
        [field]: { ...(wizardData.valueMappings[field] || {}), ...common },
      },
    });
  };

  const mappableFields = ['gender', 'blood_type', 'marital_status'].filter(field =>
    Object.values(wizardData.fieldMappings).includes(field)
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('importExport.mapValues')}</CardTitle>
        <CardDescription>{t('importExport.mapValuesDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {mappableFields.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>{t('importExport.noMappableFields')}</p>
            <p className="text-sm mt-2">{t('importExport.skipValueMapping')}</p>
          </div>
        ) : (
          <>
            {/* Field Selector */}
            <div className="space-y-2">
              <Label>{t('importExport.selectFieldToMap')}</Label>
              <Select value={selectedField} onValueChange={setSelectedField}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {mappableFields.map((field) => (
                    <SelectItem key={field} value={field}>
                      {field.replace('_', ' ').charAt(0).toUpperCase() + field.slice(1).replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Auto-apply common mappings */}
            {PREDEFINED_MAPPINGS[selectedField] && (
              <Button
                onClick={() => applyCommonMappings(selectedField)}
                variant="outline"
                size="sm"
              >
                {t('importExport.applyCommonMappings')}
              </Button>
            )}

            {/* Current Mappings Table */}
            <div>
              <h3 className="font-semibold mb-3">{t('importExport.currentMappings')}</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('importExport.sourceValue')}</TableHead>
                    <TableHead>{t('importExport.targetValue')}</TableHead>
                    <TableHead className="w-20">{t('importExport.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {wizardData.valueMappings[selectedField] &&
                    Object.entries(wizardData.valueMappings[selectedField]).map(([source, target]) => (
                      <TableRow key={source}>
                        <TableCell>
                          <Badge variant="outline">{source}</Badge>
                        </TableCell>
                        <TableCell>{target}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeMapping(selectedField, source)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  {(!wizardData.valueMappings[selectedField] ||
                    Object.keys(wizardData.valueMappings[selectedField]).length === 0) && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-gray-500">
                        {t('importExport.noMappingsDefined')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Unique Values from Sample */}
            <div>
              <h3 className="font-semibold mb-3">{t('importExport.valuesInFile')}</h3>
              <div className="flex flex-wrap gap-2">
                {getUniqueValues(selectedField).map((value) => (
                  <Badge key={value} variant="secondary">
                    {value}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Add Custom Mapping */}
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">{t('importExport.addCustomMapping')}</h3>
              <div className="grid grid-cols-3 gap-4">
                <Input
                  placeholder={t('importExport.sourceValue')}
                  value={customMapping.source}
                  onChange={(e) => setCustomMapping({ ...customMapping, source: e.target.value })}
                />
                <Select
                  value={customMapping.target}
                  onValueChange={(value) => setCustomMapping({ ...customMapping, target: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('importExport.targetValue')} />
                  </SelectTrigger>
                  <SelectContent>
                    {PREDEFINED_MAPPINGS[selectedField]?.values.map((value) => (
                      <SelectItem key={value} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => {
                    if (customMapping.source && customMapping.target) {
                      addMapping(selectedField, customMapping.source, customMapping.target);
                      setCustomMapping({ source: '', target: '' });
                    }
                  }}
                  disabled={!customMapping.source || !customMapping.target}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t('importExport.add')}
                </Button>
              </div>
            </div>
          </>
        )}

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={prevStep}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            {t('importExport.previous')}
          </Button>
          <Button onClick={nextStep}>
            {t('importExport.next')}
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
