'use client';

import React from 'react';
import { useMaintenance } from '@/contexts/MaintenanceContext';
import { AlertTriangle } from 'lucide-react';

export const MaintenanceBanner = () => {
  const { isMaintenanceMode, isLoading } = useMaintenance();

  if (isLoading || !isMaintenanceMode) {
    return null;
  }

  return (
    <div
      className="fixed top-0 left-0 right-0 flex items-center justify-center gap-x-3 bg-yellow-500 px-4 py-2 text-sm font-medium text-yellow-900 shadow-md z-[1000]"
      role="alert"
    >
      <AlertTriangle className="h-5 w-5 flex-none" aria-hidden="true" />
      <span>
        This website is currently undergoing maintenance. Please try again
        shortly.
      </span>
    </div>
  );
};
