import React from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { OrganizationManagement } from '@/components/organization/OrganizationManagement';

const OrganizationSettings = () => {
  return (
    <AuthGuard>
      <OrganizationManagement />
    </AuthGuard>
  );
};

export default OrganizationSettings;