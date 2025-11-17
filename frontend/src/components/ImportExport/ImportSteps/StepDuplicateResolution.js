import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Alert, AlertDescription } from '../../ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Badge } from '../../ui/badge';
import { RadioGroup, RadioGroupItem } from '../../ui/radio-group';
import { Label } from '../../ui/label';
import { ChevronRight, ChevronLeft, AlertTriangle } from 'lucide-react';

export default function StepDuplicateResolution({ wizardData, updateWizardData, nextStep, prevStep }) {
  const { t } = useTranslation();
  const { duplicate_conflicts } = wizardData.simulationResults || {};
  const [resolutions, setResolutions] = useState({});

  const handleResolution = (phone, rowIndex) => {
    setResolutions({
      ...resolutions,
      [phone]: rowIndex
    });
  };

  const allResolved = duplicate_conflicts?.every(conflict => resolutions[conflict.phone]) || false;

  const proceedWithResolutions = () => {
    updateWizardData({ duplicateResolutions: resolutions });
    nextStep();
  };

  // If no duplicates, return empty (but still render hooks above)
  if (!duplicate_conflicts || duplicate_conflicts.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('importExport.resolveDuplicates')}</CardTitle>
        <CardDescription>{t('importExport.resolveDuplicatesDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {t('importExport.duplicatePhoneWarning', { count: duplicate_conflicts.length })}
          </AlertDescription>
        </Alert>

        {duplicate_conflicts.map((conflict, index) => (
          <Card key={index} className="border-orange-500">
            <CardHeader>
              <CardTitle className="text-base">
                {t('importExport.conflict')} #{index + 1}: {conflict.phone}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={resolutions[conflict.phone]?.toString()}
                onValueChange={(value) => handleResolution(conflict.phone, parseInt(value))}
              >
                {/* Existing Member */}
                {conflict.existing_member && (
                  <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50">
                    <RadioGroupItem value={conflict.existing_member.row_index?.toString() || 'existing'} id={`existing-${index}`} />
                    <Label htmlFor={`existing-${index}`} className="flex-1 cursor-pointer">
                      <div>
                        <p className="font-semibold">{conflict.existing_member.full_name}</p>
                        <p className="text-sm text-gray-600">
                          {conflict.existing_member.source === 'database' ? (
                            <Badge variant="secondary">{t('importExport.existingInDatabase')}</Badge>
                          ) : (
                            <Badge variant="outline">{t('importExport.row')} {conflict.existing_member.row_index}</Badge>
                          )}
                        </p>
                      </div>
                    </Label>
                  </div>
                )}

                {/* New Record */}
                <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50">
                  <RadioGroupItem value={conflict.new_record.row_index.toString()} id={`new-${index}`} />
                  <Label htmlFor={`new-${index}`} className="flex-1 cursor-pointer">
                    <div>
                      <p className="font-semibold">{conflict.new_record.full_name}</p>
                      <p className="text-sm text-gray-600">
                        <Badge variant="outline">{t('importExport.row')} {conflict.new_record.row_index}</Badge>
                        {conflict.new_record.gender && (
                          <Badge variant="secondary" className="ml-2">{conflict.new_record.gender}</Badge>
                        )}
                      </p>
                      {conflict.new_record.address && (
                        <p className="text-sm text-gray-500 mt-1">{conflict.new_record.address}</p>
                      )}
                    </div>
                  </Label>
                </div>

                {/* Blank Option */}
                <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50">
                  <RadioGroupItem value="blank" id={`blank-${index}`} />
                  <Label htmlFor={`blank-${index}`} className="flex-1 cursor-pointer">
                    <div>
                      <p className="font-semibold">{t('importExport.removePhoneFromBoth')}</p>
                      <p className="text-sm text-gray-600">{t('importExport.blankPhoneOption')}</p>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>
        ))}

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={prevStep}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            {t('importExport.previous')}
          </Button>
          <Button onClick={proceedWithResolutions} disabled={!allResolved}>
            {t('importExport.continueWithResolutions')}
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
