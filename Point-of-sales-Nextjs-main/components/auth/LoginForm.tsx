'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const login = async () => {
    if (!supabaseUrl || !supabaseAnon) {
      setMessage('Supabase Auth env keys are not configured yet. Local dev uses demo owner fallback.');
      return;
    }
    setLoading(true);
    setMessage('');
    const client = createClient(supabaseUrl, supabaseAnon);
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error || !data.session) {
      setMessage(error?.message || 'Login failed.');
      return;
    }
    document.cookie = `vernex-access-token=${data.session.access_token}; path=/; max-age=${data.session.expires_in}; samesite=lax`;
    window.location.href = new URLSearchParams(window.location.search).get('next') || '/home';
  };

  const logout = async () => {
    document.cookie = 'vernex-access-token=; path=/; max-age=0; samesite=lax';
    setMessage('Logged out locally.');
  };

  return (
    <div className="w-full max-w-md rounded-2xl border border-vernex-border bg-white p-8 shadow-xl dark:border-[#1E335F] dark:bg-vernex-navy">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-vernex-gold">Vernex Billing</p>
        <h1 className="mt-2 text-2xl font-bold text-vernex-navy dark:text-white">Sign in</h1>
        <p className="mt-2 text-sm text-vernex-muted dark:text-slate-300">Use Supabase Auth credentials for your staff account.</p>
      </div>
      <div className="space-y-3">
        <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <Button className="w-full bg-vernex-navy text-white hover:bg-vernex-dark" onClick={login} disabled={loading}>
          {loading ? 'Signing in...' : 'Sign in'}
        </Button>
        <Button className="w-full" variant="outline" onClick={logout}>Clear local session</Button>
      </div>
      {message && <p className="mt-4 rounded-lg bg-vernex-surface p-3 text-sm text-vernex-muted dark:bg-vernex-dark dark:text-slate-300">{message}</p>}
    </div>
  );
}

