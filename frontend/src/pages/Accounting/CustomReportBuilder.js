import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Save, Play } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { useChartOfAccounts, useIncomeStatement } from '../../hooks/useAccounting';
import * as accountingApi from '../../services/accountingApi';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import CurrencyDisplay from '../../components/Accounting/CurrencyDisplay';
import { exportToCSV } from '../../utils/exportUtils';
import { useToast } from '../../hooks/use-toast';

export default function CustomReportBuilder() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [reportConfig, setReportConfig] = useState({
    name: '',
    selected_accounts: [],
    start_date: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    grouping: 'by_account'
  });

  const [reportData, setReportData] = useState(null);
  const [savedTemplates, setSavedTemplates] = useState([]);

  const { data: accounts } = useChartOfAccounts();

  const handleGenerateReport = async () => {
    // Simplified - would call custom report API in production
    // For now, use income statement as example
    try {
      const response = await accountingApi.getIncomeStatement({
        start_date: reportConfig.start_date,
        end_date: reportConfig.end_date
      });
      
      setReportData(response.data);
      
      toast({
        title: t('accounting.common.success'),
        description: 'Custom report generated'
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: t('accounting.common.error'),
        description: error.message
      });
    }
  };

  const handleSaveTemplate = async () => {
    if (!reportConfig.name) {
      toast({
        variant: "destructive",
        title: t('accounting.common.error'),
        description: 'Please enter template name'
      });
      return;
    }

    try {
      await accountingApi.createReportTemplate({
        name: reportConfig.name,
        report_type: 'custom',
        config: reportConfig
      });

      toast({
        title: t('accounting.common.success'),
        description: `Template "${reportConfig.name}" saved`
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: t('accounting.common.error'),
        description: error.message
      });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('accounting.reports.customReport')}</h1>
        <p className="text-gray-600">Build custom financial reports</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Template Name (to save)</Label>
            <Input
              value={reportConfig.name}
              onChange={(e) => setReportConfig({...reportConfig, name: e.target.value})}
              placeholder="Monthly Income Report"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>{t('accounting.reports.startDate')}</Label>
              <Input
                type="date"
                value={reportConfig.start_date}
                onChange={(e) => setReportConfig({...reportConfig, start_date: e.target.value})}
              />
            </div>

            <div>
              <Label>{t('accounting.reports.endDate')}</Label>
              <Input
                type="date"
                value={reportConfig.end_date}
                onChange={(e) => setReportConfig({...reportConfig, end_date: e.target.value})}
              />
            </div>
          </div>

          <div>
            <Label>Grouping</Label>
            <Select 
              value={reportConfig.grouping} 
              onValueChange={(value) => setReportConfig({...reportConfig, grouping: value})}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="by_account">By Account</SelectItem>
                <SelectItem value="by_month">By Month</SelectItem>
                <SelectItem value="by_type">By Account Type</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2 pt-4">
            <Button onClick={handleGenerateReport}>
              <Play className="w-4 h-4 mr-2" />
              {t('accounting.reports.generateReport')}
            </Button>
            <Button variant="outline" onClick={handleSaveTemplate}>
              <Save className="w-4 h-4 mr-2" />
              Save Template
            </Button>
            {reportData && (
              <Button 
                variant="outline" 
                onClick={() => exportToCSV(
                  [...(reportData.income || []), ...(reportData.expenses || [])], 
                  reportConfig.name || 'custom-report'
                )}
              >
                {t('accounting.reports.exportCSV')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {reportData && (
        <Card>
          <CardHeader>
            <CardTitle>Report Results</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.income?.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{row.account_code} - {row.account_name}</TableCell>
                    <TableCell className="text-right">
                      <CurrencyDisplay amount={row.amount} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
