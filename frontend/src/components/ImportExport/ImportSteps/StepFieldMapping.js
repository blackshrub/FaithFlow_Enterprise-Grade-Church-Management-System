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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../../ui/dialog';
import { Switch } from '../../ui/switch';
import { ChevronRight, ChevronLeft, Plus, Trash2 } from 'lucide-react';

const TARGET_FIELDS = [
  { value: 'full_name', label: 'Full Name', required: true, info: 'Only required field - will be split into first and last name' },
  { value: 'gender', label: 'Gender', required: false, info: 'Optional - Must be: Male or Female' },
  { value: 'date_of_birth', label: 'Birth Date', required: false, info: 'Optional - Format must match church setting' },
  { value: 'address', label: 'Address', required: false, info: 'Optional - Member address' },
  { value: 'phone_whatsapp', label: 'Phone Number (WhatsApp)', required: false, info: 'Optional - Will be normalized to 62XXXXXXXXX if provided' },
  { value: 'blood_type', label: 'Blood Type', required: false, info: 'Optional - Must be: A, B, AB, or O' },
  { value: 'marital_status', label: 'Marital Status', required: false, info: 'Optional - Must be: Married, Not Married, Widower, or Widow' },
  { value: 'baptism_date', label: 'Baptism Date', required: false, info: 'Optional - Format must match church setting' },
  { value: 'photo_filename', label: 'Photo Filename', required: false, info: 'Optional - Filename to match with bulk uploaded photos' },
  { value: 'personal_document', label: 'Personal Document', required: false, info: 'Optional - Filename to match with bulk uploaded documents' },
  { value: 'email', label: 'Email', required: false, info: 'Optional' },
  { value: 'city', label: 'City', required: false, info: 'Optional' },
  { value: 'occupation', label: 'Occupation', required: false, info: 'Optional' },
  { value: 'notes', label: 'Notes', required: false, info: 'Optional' },
];

export default function StepFieldMapping({ wizardData, updateWizardData, nextStep, prevStep }) {
  const { t } = useTranslation();
  const [defaultValues, setDefaultValues] = useState({});
  const [customFields, setCustomFields] = useState(wizardData.customFields || []);
  const [isAddCustomFieldOpen, setIsAddCustomFieldOpen] = useState(false);
  const [newCustomField, setNewCustomField] = useState({
    name: '',
    type: 'string',
    required: false,
    description: ''
  });

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

  const addCustomField = () => {
    if (!newCustomField.name) return;
    
    const updatedCustomFields = [...customFields, newCustomField];
    setCustomFields(updatedCustomFields);
    updateWizardData({ customFields: updatedCustomFields });
    
    setIsAddCustomFieldOpen(false);
    setNewCustomField({
      name: '',
      type: 'string',
      required: false,
      description: ''
    });
  };

  const removeCustomField = (index) => {
    const updatedCustomFields = customFields.filter((_, i) => i !== index);
    setCustomFields(updatedCustomFields);
    updateWizardData({ customFields: updatedCustomFields });
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
    const requiredFields = ['full_name'];  // Only full_name is required now
    const mappedTargets = Object.values(wizardData.fieldMappings);
    const hasDefaults = wizardData.defaultValues || {};
    
    // Check if full_name is either mapped or has a default value
    return requiredFields.every(rf => 
      mappedTargets.includes(rf) || (hasDefaults[rf] && hasDefaults[rf].trim() !== '')
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>{t('importExport.mapFields')}</CardTitle>
            <CardDescription>
              {t('importExport.mapFieldsDesc')} • {t('importExport.totalRecordsToImport', { count: wizardData.totalRecords })}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button onClick={autoMap} variant="outline" size="sm">
              {t('importExport.autoMap')}
            </Button>
            <Dialog open={isAddCustomFieldOpen} onOpenChange={setIsAddCustomFieldOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  {t('importExport.addCustomField')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('importExport.createCustomField')}</DialogTitle>
                  <DialogDescription>{t('importExport.createCustomFieldDesc')}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>{t('importExport.fieldName')} *</Label>
                    <Input
                      placeholder={t('importExport.fieldNamePlaceholder')}
                      value={newCustomField.name}
                      onChange={(e) => setNewCustomField({ ...newCustomField, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('importExport.fieldType')}</Label>
                    <Select
                      value={newCustomField.type}
                      onValueChange={(value) => setNewCustomField({ ...newCustomField, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="string">{t('importExport.typeString')}</SelectItem>
                        <SelectItem value="number">{t('importExport.typeNumber')}</SelectItem>
                        <SelectItem value="date">{t('importExport.typeDate')}</SelectItem>
                        <SelectItem value="email">{t('importExport.typeEmail')}</SelectItem>
                        <SelectItem value="boolean">{t('importExport.typeBoolean')}</SelectItem>
                        <SelectItem value="url">{t('importExport.typeUrl')}</SelectItem>
                        <SelectItem value="phone">{t('importExport.typePhone')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('importExport.description')}</Label>
                    <Input
                      placeholder={t('importExport.descriptionPlaceholder')}
                      value={newCustomField.description}
                      onChange={(e) => setNewCustomField({ ...newCustomField, description: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={newCustomField.required}
                      onCheckedChange={(checked) => setNewCustomField({ ...newCustomField, required: checked })}
                    />
                    <Label>{t('importExport.requiredField')}</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddCustomFieldOpen(false)}>
                    {t('common.cancel')}
                  </Button>
                  <Button onClick={addCustomField} disabled={!newCustomField.name}>
                    {t('common.add')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Date Format Info */}
        <Alert>
          <AlertDescription>
            <strong>{t('importExport.dateFormatRequired')}</strong> {wizardData.dateFormat}
            <br />
            <span className="text-sm">Example: {wizardData.dateFormat === 'DD-MM-YYYY' ? '31-12-2025' : wizardData.dateFormat === 'MM-DD-YYYY' ? '12-31-2025' : '2025-12-31'}</span>
          </AlertDescription>
        </Alert>
        
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
                      <div>
                        {field.label}
                        {field.required && <Badge className="ml-2" variant="destructive">Required</Badge>}
                        {field.info && (
                          <p className="text-xs text-gray-500 mt-1">{field.info}</p>
                        )}
                      </div>
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
              
              {/* Custom Fields */}
              {customFields.map((customField, index) => {
                const sourceField = getSourceFieldForTarget(customField.name);
                const hasDefault = defaultValues[customField.name];
                
                return (
                  <TableRow key={`custom-${index}`} className="bg-blue-50">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {customField.name}
                        <Badge variant="outline" className="text-xs">{t('importExport.custom')}</Badge>
                        {customField.required && <Badge variant="destructive">Required</Badge>}
                      </div>
                      {customField.description && (
                        <p className="text-xs text-gray-500 mt-1">{customField.description}</p>
                      )}
                      <p className="text-xs text-blue-600 mt-1">
                        {t('importExport.type')}: {customField.type}
                      </p>
                    </TableCell>
                    <TableCell>
                      {customField.required ? (
                        <Badge variant="destructive">Yes</Badge>
                      ) : (
                        <Badge variant="secondary">No</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Select
                          value={sourceField || ''}
                          onValueChange={(value) => handleMappingChange(customField.name, value)}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder={t('importExport.selectColumn')} />
                          </SelectTrigger>
                          <SelectContent>
                            {!customField.required && (
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCustomField(index)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        placeholder={t('importExport.enterDefault')}
                        value={defaultValues[customField.name] || ''}
                        onChange={(e) => handleDefaultValueChange(customField.name, e.target.value)}
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
              {t('importExport.mapOnlyFullName')}
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
