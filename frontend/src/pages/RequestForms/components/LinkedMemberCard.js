import React from 'react';
import { useTranslation } from 'react-i18next';
import { User, Phone, Mail, Calendar, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import MemberAvatar from '../../../components/MemberAvatar';
import { format, parseISO } from 'date-fns';

const LinkedMemberCard = ({ member, title, onViewMember }) => {
  const { t } = useTranslation();

  if (!member) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span>{title || t('requestForms.linkedMember', 'Linked Member')}</span>
          {member.member_id && onViewMember && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewMember(member.member_id)}
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              {t('requestForms.viewProfile', 'View Profile')}
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-start gap-3">
          <MemberAvatar
            name={member.full_name || member.name}
            photo={member.photo_url}
            size="lg"
          />
          <div className="flex-1 space-y-1">
            <p className="font-medium">{member.full_name || member.name}</p>

            {member.phone && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Phone className="h-3 w-3" />
                <span>{member.phone}</span>
              </div>
            )}

            {member.email && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Mail className="h-3 w-3" />
                <span>{member.email}</span>
              </div>
            )}

            {member.date_of_birth && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Calendar className="h-3 w-3" />
                <span>
                  {format(parseISO(member.date_of_birth), 'MMM dd, yyyy')}
                </span>
              </div>
            )}

            {member.is_baptized !== undefined && (
              <div className="flex items-center gap-2 text-sm">
                <span
                  className={`px-2 py-0.5 rounded-full text-xs ${
                    member.is_baptized
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {member.is_baptized
                    ? t('requestForms.baptized', 'Baptized')
                    : t('requestForms.notBaptized', 'Not Baptized')}
                </span>
              </div>
            )}

            {member.membership_status && (
              <div className="text-xs text-gray-400">
                {t('requestForms.membershipStatus', 'Status')}: {member.membership_status}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LinkedMemberCard;
