import React from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';

const groupSchema = z.object({
  name: z.string().min(1),
  category: z.enum(['cell_group', 'ministry_team', 'activity', 'support_group']),
  description: z.string().optional(),
  meeting_schedule: z.string().optional(),
  location: z.string().optional(),
  leader_member_id: z.string().optional(),
  max_members: z
    .union([z.string().optional(), z.number().optional()])
    .transform((val) => (val === '' || val == null ? undefined : Number(val)))
    .refine((val) => val == null || (!Number.isNaN(val) && val > 0), {
      message: 'Must be a positive number',
    })
    .optional(),
  is_open_for_join: z.boolean().default(true),
});

export function GroupForm({ initialData, onSubmit, onCancel, isSaving }) {
  const { t } = useTranslation();

  const form = useForm({
    resolver: zodResolver(groupSchema),
    defaultValues: {
      name: initialData?.name || '',
      category: initialData?.category || 'cell_group',
      description: initialData?.description || '',
      meeting_schedule: initialData?.meeting_schedule || '',
      location: initialData?.location || '',
      leader_name: initialData?.leader_name || '',
      leader_contact: initialData?.leader_contact || '',
      max_members: initialData?.max_members ?? '',
      is_open_for_join: initialData?.is_open_for_join ?? true,
    },
  });

  const handleSubmit = (values) => {
    onSubmit(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('groups.form.name')}</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('groups.form.category')}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('groups.form.selectCategory')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="cell_group">{t('groups.categories.cellGroup')}</SelectItem>
                    <SelectItem value="ministry_team">{t('groups.categories.ministryTeam')}</SelectItem>
                    <SelectItem value="activity">{t('groups.categories.activityGroup')}</SelectItem>
                    <SelectItem value="support_group">{t('groups.categories.supportGroup')}</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('groups.form.description')}</FormLabel>
              <FormControl>
                <Textarea rows={4} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="meeting_schedule"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('groups.form.meetingSchedule')}</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Every Tuesday 7PM" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('groups.form.location')}</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Church building, room, or area" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="leader_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('groups.form.leaderName')}</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="leader_contact"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('groups.form.leaderContact')}</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="628123456789" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          <FormField
            control={form.control}
            name="max_members"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('groups.form.maxMembers')}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    placeholder={t('groups.form.maxMembersPlaceholder')}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="is_open_for_join"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                <div className="space-y-0.5">
                  <FormLabel>{t('groups.form.openForJoin')}</FormLabel>
                  <p className="text-xs text-muted-foreground">
                    {t('groups.form.openForJoinHelper')}
                  </p>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? t('common.loading') : t('common.save')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
