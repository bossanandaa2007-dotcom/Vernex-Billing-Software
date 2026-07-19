'use client';

import { ErrorState } from '@/components/super-admin/ui/states';

export default function PortalError() {
  return <ErrorState message="Unable to load this portal page. Please try again." />;
}

