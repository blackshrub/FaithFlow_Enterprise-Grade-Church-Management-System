import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Alert, AlertDescription } from '../../ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Badge } from '../../ui/badge';
import { RadioGroup, RadioGroupItem } from '../../ui/radio-group';
import { Label } from '../../ui/label';
import { CheckCircle, AlertCircle, Loader2, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';

export default function StepSimulation({ wizardData, updateWizardData, simulateImport, nextStep, prevStep }) {
  const { t } = useTranslation();
  const [simulating, setSimulating] = useState(false);
  const [simulationComplete, setSimulationComplete] = useState(false);
  const [showDuplicateResolution, setShowDuplicateResolution] = useState(false);
  const [localResolutions, setLocalResolutions] = useState({});  // MOVED TO TOP LEVEL!

  const runSimulation = async () => {
    setSimulating(true);
    try {
      const result = await simulateImport.mutateAsync({
        file_content: wizardData.fileContent,
        file_type: wizardData.fileType,
        field_mappings: JSON.stringify(wizardData.fieldMappings),
        value_mappings: JSON.stringify(wizardData.valueMappings),
        default_values: JSON.stringify(wizardData.defaultValues || {}),
        custom_fields: JSON.stringify(wizardData.customFields || []),
        date_format: wizardData.dateFormat,
      });
      
      updateWizardData({ simulationResults: result });
      setSimulationComplete(true);
    } catch (error) {
      console.error('Simulation error:', error);
    } finally {
      setSimulating(false);
    }
  };

  useEffect(() => {
    if (!wizardData.simulationResults && !simulating) {
      runSimulation();
    }
  }, []);

  // Always define these at top level (before any conditionals)
  const simulationResults = wizardData.simulationResults;
  const hasErrors = simulationResults?.errors && simulationResults.errors.length > 0;
  const hasDuplicates = simulationResults?.duplicate_conflicts && simulationResults.duplicate_conflicts.length > 0;
  
  // Handler functions (defined at top level)
  const handleResolution = (phone, rowIndex) => {
    setLocalResolutions({
      ...localResolutions,
      [phone]: rowIndex
    });
  };

  const proceedWithResolutions = () => {
    updateWizardData({ duplicateResolutions: localResolutions });
    setShowDuplicateResolution(false);
  };

  const allResolved = simulationResults?.duplicate_conflicts?.every(c => localResolutions[c.phone]) || false;

  // Render different content based on state (but always same structure)
  if (simulating) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <Loader2 className="h-16 w-16 animate-spin text-blue-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">{t('importExport.simulatingImport')}</h3>
            <p className="text-gray-600">{t('importExport.validatingData')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (simulationComplete && simulationResults) {
    const needsDuplicateResolution = hasDuplicates && (!wizardData.duplicateResolutions || Object.keys(wizardData.duplicateResolutions).length === 0);

    // Render duplicate resolution OR validation results
    return (
      <div>
        {showDuplicateResolution && needsDuplicateResolution ? (
          <Card>
            <CardHeader>
              <CardTitle>{t('importExport.resolveDuplicates')}</CardTitle>
              <CardDescription>{t('importExport.resolveDuplicatesDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {t('importExport.duplicatePhoneWarning', { count: simulationResults.duplicate_conflicts?.length || 0 })}
                </AlertDescription>
              </Alert>

              {simulationResults.duplicate_conflicts?.map((conflict, index) => (
                <Card key={index} className="border-orange-500">
                  <CardHeader>
                    <CardTitle className="text-base">
                      {t('importExport.conflict')} #{index + 1}: {conflict.phone}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <RadioGroup
                      value={localResolutions[conflict.phone]?.toString()}
                      onValueChange={(value) => handleResolution(conflict.phone, parseInt(value))}
                    >
                      {conflict.existing_member && (
                        <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50">
                          <RadioGroupItem value={conflict.existing_member.row_index?.toString() || 'existing'} id={`existing-${index}`} />
                          <Label htmlFor={`existing-${index}`} className="flex-1 cursor-pointer">
                            <div>
                              <p className="font-semibold">{conflict.existing_member.full_name}</p>
                              <p className="text-sm text-gray-600">
                                <Badge variant="outline">{t('importExport.row')} {conflict.existing_member.row_index}</Badge>
                              </p>
                            </div>
                          </Label>
                        </div>
                      )}

                      <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50">
                        <RadioGroupItem value={conflict.new_record.row_index.toString()} id={`new-${index}`} />
                        <Label htmlFor={`new-${index}`} className="flex-1 cursor-pointer">
                          <div>
                            <p className="font-semibold">{conflict.new_record.full_name}</p>
                            <p className="text-sm text-gray-600">
                              <Badge variant="outline">{t('importExport.row')} {conflict.new_record.row_index}</Badge>
                            </p>
                          </div>
                        </Label>
                      </div>

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
                <Button variant="outline" onClick={() => setShowDuplicateResolution(false)}>
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  {t('importExport.backToValidation')}
                </Button>
                <Button onClick={proceedWithResolutions} disabled={!allResolved}>
                  {t('importExport.continueWithResolutions')}
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
        <CardHeader>
          <CardTitle>{t('importExport.simulationComplete')}</CardTitle>
          <CardDescription>
            {hasErrors 
              ? t('importExport.simulationFoundErrors') 
              : t('importExport.simulationSuccessful')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Success Alert */}
          {!hasErrors && !hasDuplicates && (
            <Alert className="border-green-500 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                {t('importExport.readyToImport', { count: simulationResults.valid_records })}
              </AlertDescription>
            </Alert>
          )}
          
          {/* Duplicate Alert */}
          {hasDuplicates && !hasErrors && (
            <Alert className="border-orange-500 bg-orange-50">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                {t('importExport.duplicatePhoneWarning', { count: simulationResults.duplicate_conflicts.length })}
              </AlertDescription>
            </Alert>
          )}

          {/* Results Summary */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-gray-600">{t('importExport.totalRecords')}</p>
                  <p className="text-3xl font-bold">{simulationResults.total_records}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-green-500">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-gray-600">{t('importExport.validRecords')}</p>
                  <p className="text-3xl font-bold text-green-600">{simulationResults.valid_records}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-red-500">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-gray-600">{t('importExport.invalidRecords')}</p>
                  <p className="text-3xl font-bold text-red-600">{simulationResults.invalid_records || 0}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sample Valid Data Preview */}
          {simulationResults.sample_valid && simulationResults.sample_valid.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">{t('importExport.sampleValidData')}</h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Full Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Gender</TableHead>
                      <TableHead>Demographic</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {simulationResults.sample_valid.slice(0, 5).map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{row.full_name}</TableCell>
                        <TableCell>{row.phone_whatsapp || '-'}</TableCell>
                        <TableCell>
                          {row.gender && <Badge>{row.gender}</Badge>}
                        </TableCell>
                        <TableCell>
                          {row.demographic_category && (
                            <Badge variant="secondary">{row.demographic_category}</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Photo/Document Matching Summary */}
          {(wizardData.photoSimulation || wizardData.documentSimulation) && (
            <div className="grid grid-cols-2 gap-4">
              {wizardData.photoSimulation && (
                <Card className="border-blue-500">
                  <CardHeader>
                    <CardTitle className="text-base">{t('importExport.photoMatching')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{t('importExport.totalFiles')}:</span>
                      <span className="font-semibold">{wizardData.photoSimulation.summary?.total_files || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm text-green-600">
                      <span>{t('importExport.willMatch')}:</span>
                      <span className="font-semibold">{wizardData.photoSimulation.summary?.matched_count || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm text-orange-600">
                      <span>{t('importExport.unmatchedFiles')}:</span>
                      <span className="font-semibold">{wizardData.photoSimulation.summary?.unmatched_files_count || 0}</span>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {wizardData.documentSimulation && (
                <Card className="border-purple-500">
                  <CardHeader>
                    <CardTitle className="text-base">{t('importExport.documentMatching')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{t('importExport.totalFiles')}:</span>
                      <span className="font-semibold">{wizardData.documentSimulation.summary?.total_files || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm text-green-600">
                      <span>{t('importExport.willMatch')}:</span>
                      <span className="font-semibold">{wizardData.documentSimulation.summary?.matched_count || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm text-orange-600">
                      <span>{t('importExport.unmatchedFiles')}:</span>
                      <span className="font-semibold">{wizardData.documentSimulation.summary?.unmatched_files_count || 0}</span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Errors List */}
          {hasErrors && (
            <div>
              <h3 className="font-semibold mb-3 text-red-600">
                {t('importExport.validationErrors')} ({simulationResults.errors.length})
              </h3>
              <div className="border border-red-200 rounded-lg p-4 max-h-64 overflow-y-auto bg-red-50">
                <ul className="space-y-1">
                  {simulationResults.errors.map((error, idx) => (
                    <li key={idx} className="text-sm text-red-700">
                      • {error}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={prevStep}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              {t('importExport.previous')}
            </Button>
            <Button 
              onClick={() => {
                setSimulationComplete(false);
                runSimulation();
              }} 
              variant="outline"
              className="mr-auto ml-4"
            >
              <Loader2 className="h-4 w-4 mr-2" />
              {t('importExport.rerunSimulation')}
            </Button>
            <Button 
              onClick={() => {
                if (hasDuplicates) {
                  setShowDuplicateResolution(true);
                } else {
                  nextStep();
                }
              }}
              disabled={!simulationResults.ready_to_import && !hasDuplicates}
            >
              {hasDuplicates 
                ? t('importExport.resolveDuplicates')
                : t('importExport.proceedToImport')}
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
        )}
      </div>
    );
  }

  return null;
}
