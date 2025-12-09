import React from 'react';
import { Badge } from '../../../components/ui/badge';

const STATUS_CONFIG = {
  new: {
    label: 'New',
    labelId: 'Baru',
    variant: 'default',
    className: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
  },
  contacted: {
    label: 'Contacted',
    labelId: 'Dihubungi',
    variant: 'secondary',
    className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
  },
  scheduled: {
    label: 'Scheduled',
    labelId: 'Dijadwalkan',
    variant: 'outline',
    className: 'bg-purple-100 text-purple-800 hover:bg-purple-100',
  },
  completed: {
    label: 'Completed',
    labelId: 'Selesai',
    variant: 'default',
    className: 'bg-green-100 text-green-800 hover:bg-green-100',
  },
  cancelled: {
    label: 'Cancelled',
    labelId: 'Dibatalkan',
    variant: 'destructive',
    className: 'bg-red-100 text-red-800 hover:bg-red-100',
  },
};

export const RequestStatusBadge = ({ status, isIndonesian = false }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.new;

  return (
    <Badge className={config.className} variant="outline">
      {isIndonesian ? config.labelId : config.label}
    </Badge>
  );
};

export const getStatusConfig = (status) => STATUS_CONFIG[status] || STATUS_CONFIG.new;

export default RequestStatusBadge;
