'use client';

import { useEffect, useMemo, useState } from 'react';
import { getAuthContext } from '@/lib/client-data';
import { hasModule, type ModuleKey } from '@/lib/modules';

type AuthContext = Awaited<ReturnType<typeof getAuthContext>>;

export function useBusinessAccess() {
  const [context, setContext] = useState<AuthContext | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getAuthContext()
      .then((result) => {
        if (active) setContext(result);
      })
      .catch(() => {
        if (active) setContext(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const enabledModules = context?.user?.enabledModules ?? [];
  const role = context?.user?.role ?? null;

  return useMemo(() => ({
    context,
    loading,
    role,
    enabledModules,
    hasModuleAccess(module: ModuleKey) {
      return hasModule(enabledModules, module);
    },
  }), [context, enabledModules, loading, role]);
}