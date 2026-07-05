'use client';

import { useState } from 'react';
import { LogOut, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getBrowserSupabase } from '@/lib/supabase';

export function LogoutButton({ collapsed = false }: { collapsed?: boolean }) {
  const [loading, setLoading] = useState(false);

  const logout = async () => {
    setLoading(true);
    try {
      await getBrowserSupabase()?.auth.signOut();
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      window.location.replace('/login');
    }
  };

  return (
    <Button
      variant="ghost"
      className={collapsed ? 'w-10 px-0 text-slate-300 hover:text-white' : 'w-full justify-start text-slate-300 hover:text-white'}
      onClick={logout}
      disabled={loading}
      title="Sign out"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
      {!collapsed && <span className="ml-2">Sign Out</span>}
    </Button>
  );
}

