import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useExportMembers } from '../../hooks/useImportExport';
import { useDemographics } from '../../hooks/useSettings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Download, Loader2, FileDown } from 'lucide-react';

export default function ExportPanel() {
  const { t } = useTranslation();
  const [format, setFormat] = useState('csv');
  const [statusFilter, setStatusFilter] = useState('all');
  const [demographicFilter, setDemographicFilter] = useState('all');
  
  const exportMembers = useExportMembers();
  const { data: demographics = [] } = useDemographics();

  const handleExport = () => {
    const params = { format };
    
    if (statusFilter !== 'all') {
      params.status_filter = statusFilter;
    }
    
    if (demographicFilter !== 'all') {
      params.demographic_filter = demographicFilter;
    }
    
    exportMembers.mutate(params);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('importExport.exportData')}</CardTitle>
        <CardDescription>{t('importExport.exportDataDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Format Selection */}
        <div className="space-y-2">
          <Label>{t('importExport.exportFormat')}</Label>
          <Select value={format} onValueChange={setFormat}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">
                <div className="flex items-center">
                  <FileDown className="h-4 w-4 mr-2" />
                  CSV (Comma-Separated Values)
                </div>
              </SelectItem>
              <SelectItem value="json">
                <div className="flex items-center">
                  <FileDown className="h-4 w-4 mr-2" />
                  JSON (JavaScript Object Notation)
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t('importExport.filterByStatus')}</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('importExport.allMembers')}</SelectItem>
                <SelectItem value="active">{t('importExport.activeOnly')}</SelectItem>
                <SelectItem value="inactive">{t('importExport.inactiveOnly')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('importExport.filterByDemographic')}</Label>
            <Select value={demographicFilter} onValueChange={setDemographicFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('importExport.allDemographics')}</SelectItem>
                {demographics.map((demo) => (
                  <SelectItem key={demo.id} value={demo.name}>
                    {demo.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Export Button */}
        <div className="pt-4">
          <Button
            onClick={handleExport}
            disabled={exportMembers.isPending}
            size="lg"
            className="w-full"
          >
            {exportMembers.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('importExport.exporting')}
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                {t('importExport.downloadExport')}
              </>
            )}
          </Button>
        </div>

        {/* Export Info */}
        <div className="text-sm text-gray-600 space-y-2">
          <p><strong>{t('importExport.exportedFields')}:</strong></p>
          <ul className="list-disc list-inside pl-4 space-y-1">
            <li>First Name, Last Name</li>
            <li>Email, WhatsApp Number</li>
            <li>Date of Birth, Gender, Blood Type</li>
            <li>Address, City, State, Country</li>
            <li>Marital Status, Occupation</li>
            <li>Baptism Date, Membership Date</li>
            <li>Demographic Category, Notes</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
