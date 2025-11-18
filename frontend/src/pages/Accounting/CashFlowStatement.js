import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import CurrencyDisplay from '../../components/Accounting/CurrencyDisplay';

export default function CashFlowStatement() {
  const { t } = useTranslation();

  const [params, setParams] = useState({
    start_date: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0]
  });

  const [reportData, setReportData] = useState(null);

  const handleGenerate = () => {
    // Simplified cash flow data - in production would call API
    setReportData({
      operating_activities: {
        items: [
          { description: 'Net Income', amount: 120000000 },
          { description: 'Depreciation', amount: 50000000 },
          { description: 'Changes in Working Capital', amount: -10000000 }
        ],
        total: 160000000
      },
      investing_activities: {
        items: [
          { description: 'Purchase of Fixed Assets', amount: -200000000 },
          { description: 'Sale of Equipment', amount: 30000000 }
        ],
        total: -170000000
      },
      financing_activities: {
        items: [
          { description: 'Loan Proceeds', amount: 100000000 },
          { description: 'Loan Repayment', amount: -50000000 }
        ],
        total: 50000000
      },
      beginning_cash: 100000000,
      ending_cash: 140000000,
      net_change: 40000000
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('accounting.reports.cashFlow')}</h1>
        <p className="text-gray-600">Statement of Cash Flows</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div>
              <Label>{t('accounting.reports.startDate')}</Label>
              <Input
                type="date"
                value={params.start_date}
                onChange={(e) => setParams({...params, start_date: e.target.value})}
              />
            </div>
            <div>
              <Label>{t('accounting.reports.endDate')}</Label>
              <Input
                type="date"
                value={params.end_date}
                onChange={(e) => setParams({...params, end_date: e.target.value})}
              />
            </div>
            <Button onClick={handleGenerate} className="mt-6">
              {t('accounting.reports.generateReport')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {reportData && (
        <Card>
          <CardHeader>
            <CardTitle>{t('accounting.reports.cashFlow')}</CardTitle>
            <p className="text-sm text-gray-600">{params.start_date} - {params.end_date}</p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Operating Activities */}
            <div>
              <h3 className="font-bold mb-2">Operating Activities</h3>
              <Table>
                <TableBody>
                  {reportData.operating_activities.items.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-right">
                        <CurrencyDisplay amount={item.amount} />
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold">
                    <TableCell>Net Cash from Operating</TableCell>
                    <TableCell className="text-right">
                      <CurrencyDisplay amount={reportData.operating_activities.total} />
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {/* Investing Activities */}
            <div>
              <h3 className="font-bold mb-2">Investing Activities</h3>
              <Table>
                <TableBody>
                  {reportData.investing_activities.items.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-right">
                        <CurrencyDisplay amount={item.amount} />
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold">
                    <TableCell>Net Cash from Investing</TableCell>
                    <TableCell className="text-right">
                      <CurrencyDisplay amount={reportData.investing_activities.total} />
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {/* Financing Activities */}
            <div>
              <h3 className="font-bold mb-2">Financing Activities</h3>
              <Table>
                <TableBody>
                  {reportData.financing_activities.items.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-right">
                        <CurrencyDisplay amount={item.amount} />
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold">
                    <TableCell>Net Cash from Financing</TableCell>
                    <TableCell className="text-right">
                      <CurrencyDisplay amount={reportData.financing_activities.total} />
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {/* Summary */}
            <div className="pt-4 border-t space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">Beginning Cash Balance</span>
                <CurrencyDisplay amount={reportData.beginning_cash} />
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Net Change in Cash</span>
                <span className={reportData.net_change >= 0 ? 'text-green-600' : 'text-red-600'}>
                  <CurrencyDisplay amount={reportData.net_change} />
                </span>
              </div>
              <div className="flex items-center justify-between text-xl font-bold pt-2 border-t">
                <span>Ending Cash Balance</span>
                <CurrencyDisplay amount={reportData.ending_cash} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
