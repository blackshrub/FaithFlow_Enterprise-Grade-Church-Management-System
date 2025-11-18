import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, Clock } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { useScheduleArticle, useUnscheduleArticle } from '../../hooks/useArticles';
import ScheduleStatusBadge from './ScheduleStatusBadge';
import { useToast } from '../../hooks/use-toast';

const SchedulingPanel = ({ article, onSuccess }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [scheduledDate, setScheduledDate] = useState('');
  
  const scheduleMutation = useScheduleArticle();
  const unscheduleMutation = useUnscheduleArticle();

  const handleSchedule = async () => {
    if (!scheduledDate) {
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: t('articles.scheduling.scheduleNowInvalid')
      });
      return;
    }

    try {
      await scheduleMutation.mutateAsync({
        id: article.id,
        scheduledPublishDate: scheduledDate
      });
      
      toast({
        title: t('common.success'),
        description: t('articles.scheduling.scheduleSuccess')
      });
      
      if (onSuccess) onSuccess();
    } catch (error) {
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: error.response?.data?.detail?.message || error.message
      });
    }
  };

  const handleUnschedule = async () => {
    try {
      await unscheduleMutation.mutateAsync(article.id);
      
      toast({
        title: t('common.success'),
        description: t('articles.scheduling.scheduleRemoved')
      });
      
      if (onSuccess) onSuccess();
    } catch (error) {
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: error.message
      });
    }
  };

  const isScheduled = article?.schedule_status && article.schedule_status !== 'none';
  const canSchedule = article?.status === 'draft';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center">
          <Calendar className="w-4 h-4 mr-2" />
          {t('articles.scheduling.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isScheduled ? (
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">{t('articles.scheduling.scheduleStatus')}</p>
              <ScheduleStatusBadge status={article.schedule_status} />
            </div>
            
            {article.scheduled_publish_date && (
              <div>
                <p className="text-sm text-gray-600">{t('articles.scheduling.scheduledFor')}</p>
                <p className="text-sm font-medium">
                  {new Date(article.scheduled_publish_date).toLocaleString('id-ID')}
                </p>
              </div>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleUnschedule}
              disabled={unscheduleMutation.isLoading}
            >
              {t('articles.scheduling.unscheduleArticle')}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <Label>{t('articles.scheduling.scheduledPublishDate')}</Label>
              <Input
                type="datetime-local"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                disabled={!canSchedule}
              />
              {!canSchedule && (
                <p className="text-xs text-red-600 mt-1">
                  {t('articles.scheduling.onlyDraftCanSchedule')}
                </p>
              )}
            </div>
            
            <Button
              size="sm"
              onClick={handleSchedule}
              disabled={!canSchedule || !scheduledDate || scheduleMutation.isLoading}
              className="w-full"
            >
              <Clock className="w-4 h-4 mr-2" />
              {t('articles.scheduling.scheduleArticle')}
            </Button>
            
            <p className="text-xs text-gray-500">
              {t('articles.scheduling.scheduleForFuture')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SchedulingPanel;
