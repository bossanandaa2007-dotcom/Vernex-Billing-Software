'use client';

import Image from 'next/image';
import { useEffect, useState, type FormEvent } from 'react';
import { Loader2, LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('message') === 'session-expired') {
      setError('Your session has expired. Please sign in again.');
    }
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setError(result?.error || 'Login server error. Please restart the admin server and try again.');
        return;
      }
      window.location.replace('/');
    } catch {
      setError('Unable to connect. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-700 dark:bg-slate-900">
      <Image src="/vernex-logo.png" alt="Vernex" width={64} height={64} className="h-14 w-14 object-contain" priority />
      <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-amber-600">Vernex Control</p>
      <h1 className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">Super Admin Sign In</h1>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Secure access for the Vernex platform owner.</p>
      <form className="mt-7 space-y-4" onSubmit={submit}>
        <label className="block text-sm font-medium">
          Email
          <Input className="mt-2" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={loading} autoFocus required />
        </label>
        <label className="block text-sm font-medium">
          Password
          <Input className="mt-2" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} disabled={loading} required />
        </label>
        <Button className="w-full" type="submit" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}
          {loading ? 'Signing In...' : 'Sign In'}
        </Button>
      </form>
      {error && <p role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">{error}</p>}
    </section>
  );
}
