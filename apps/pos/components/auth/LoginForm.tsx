'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getBrowserSupabase } from '@/lib/supabase';
import Image from 'next/image';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Loader2, LockKeyhole, Mail } from 'lucide-react';

type LoginMode = 'sign-in' | 'create-account' | 'forgot-password' | 'new-password';

export function LoginForm() {
  const [mode, setMode] = useState<LoginMode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'error' | 'success'>('error');
  const [loading, setLoading] = useState(false);
  const [setupAvailable, setSetupAvailable] = useState(false);

  const establishServerSession = async (accessToken: string) => {
    const response = await fetch('/api/auth/session', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) throw new Error('Session exchange failed');
  };

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('message') === 'session-expired') {
      setMessage('Your session has expired. Please sign in again.');
    }
    const client = getBrowserSupabase();
    fetch('/api/auth/setup-status', { cache: 'no-store' })
      .then((response) => response.json())
      .then((data) => setSetupAvailable(data?.available === true))
      .catch(() => setSetupAvailable(false));
    if (!client) return;
    const { data } = client.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('new-password');
        setMessage('');
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const login = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password) {
      setMessage('Please enter your email and password.');
      return;
    }
    setLoading(true);
    setMessage('');
    setMessageType('error');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        setMessage(result?.error || 'The email or password is incorrect.');
        return;
      }
      window.location.href = new URLSearchParams(window.location.search).get('next') || '/home';
    } catch {
      setMessage('Unable to sign in. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const requestPasswordReset = async (event: FormEvent) => {
    event.preventDefault();
    const client = getBrowserSupabase();
    if (!client) {
      setMessage('Password recovery is temporarily unavailable. Please contact your administrator.');
      return;
    }
    if (!email.trim()) {
      setMessage('Please enter your account email.');
      return;
    }
    setLoading(true);
    setMessage('');
    setMessageType('error');
    try {
      const { error } = await client.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/login`,
      });
      if (error) {
        setMessage('Unable to send the reset email. Please try again.');
        return;
      }
      setMessageType('success');
      setMessage('Check your inbox for a password reset link.');
    } catch {
      setMessage('Unable to send the reset email. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const createAccount = async (event: FormEvent) => {
    event.preventDefault();
    const client = getBrowserSupabase();
    if (!client) {
      setMessage('Account creation is temporarily unavailable. Please try again later.');
      return;
    }
    if (!email.trim()) {
      setMessage('Please enter your email.');
      return;
    }
    if (password.length < 8) {
      setMessage('Use at least 8 characters for your password.');
      return;
    }
    if (password !== confirmPassword) {
      setMessage('The passwords do not match.');
      return;
    }
    setLoading(true);
    setMessage('');
    setMessageType('error');
    try {
      const { data, error } = await client.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: `${window.location.origin}/login` },
      });
      if (error) {
        setMessage(
          error.message.toLowerCase().includes('already')
            ? 'An account already exists for this email. Try signing in or reset your password.'
            : 'Unable to create your account. Please try again.'
        );
        return;
      }
      if (data.session) {
        await establishServerSession(data.session.access_token);
        window.location.href = '/home';
        return;
      }
      setMessageType('success');
      setMessage('Account created. Check your inbox to confirm your email, then sign in.');
    } catch {
      setMessage('Unable to create your account. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const updatePassword = async (event: FormEvent) => {
    event.preventDefault();
    const client = getBrowserSupabase();
    if (!client) {
      setMessage('Password recovery is temporarily unavailable. Please contact your administrator.');
      return;
    }
    if (password.length < 8) {
      setMessage('Use at least 8 characters for your new password.');
      return;
    }
    if (password !== confirmPassword) {
      setMessage('The passwords do not match.');
      return;
    }
    setLoading(true);
    setMessage('');
    setMessageType('error');
    try {
      const { error } = await client.auth.updateUser({ password });
      if (error) {
        setMessage('Unable to update your password. Please request a new reset link.');
        return;
      }
      const { data } = await client.auth.getSession();
      if (data.session) {
        await establishServerSession(data.session.access_token);
      }
      window.location.href = '/home';
    } catch {
      setMessage('Unable to update your password. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const title =
    mode === 'forgot-password'
      ? 'Reset password'
      : mode === 'new-password'
        ? 'Create new password'
        : mode === 'create-account'
          ? 'Create owner account'
        : 'Sign in';
  const description =
    mode === 'forgot-password'
      ? 'Enter your account email and we will send you a reset link.'
      : mode === 'new-password'
        ? 'Choose a secure password for your Vernex account.'
        : mode === 'create-account'
          ? 'Set up the first secure login for this Vernex workspace.'
        : 'Enter your staff account details to continue.';

  return (
    <div className="w-full max-w-md rounded-2xl border border-vernex-border bg-white p-8 shadow-xl dark:border-[#1E335F] dark:bg-vernex-navy">
      <div className="mb-6">
        <Image src="/assets/vernex-logo.png" alt="Vernex" width={72} height={72} className="mb-4 h-16 w-16 object-contain" priority />
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-vernex-gold">Vernex</p>
        <h1 className="mt-2 text-2xl font-bold text-vernex-navy dark:text-white">{title}</h1>
        <p className="mt-2 text-sm text-vernex-muted dark:text-slate-300">{description}</p>
      </div>
      {mode === 'sign-in' && (
        <form className="space-y-4" onSubmit={login}>
          <div className="space-y-2">
            <Label htmlFor="login-email">Email</Label>
            <Input id="login-email" placeholder="you@business.com" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" disabled={loading} autoFocus />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="login-password">Password</Label>
              <button
                type="button"
                className="text-sm font-semibold text-vernex-navy underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vernex-gold dark:text-vernex-gold"
                onClick={() => {
                  setMode('forgot-password');
                  setMessage('');
                }}
              >
                Forgot password?
              </button>
            </div>
            <Input id="login-password" placeholder="Enter your password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" disabled={loading} />
          </div>
          <Button className="h-11 w-full bg-vernex-navy text-white hover:bg-vernex-dark" type="submit" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LockKeyhole className="mr-2 h-4 w-4" />}
            {loading ? 'Signing In...' : 'Sign In'}
          </Button>
          {setupAvailable && (
            <Button
              variant="outline"
              className="w-full"
              type="button"
              onClick={() => {
                setMode('create-account');
                setPassword('');
                setConfirmPassword('');
                setMessage('');
              }}
            >
              Create Owner Account
            </Button>
          )}
        </form>
      )}
      {mode === 'create-account' && (
        <form className="space-y-4" onSubmit={createAccount}>
          <div className="space-y-2">
            <Label htmlFor="create-email">Email</Label>
            <Input id="create-email" placeholder="you@business.com" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" disabled={loading} autoFocus />
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-password">Password</Label>
            <Input id="create-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" disabled={loading} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-confirm-password">Confirm Password</Label>
            <Input id="create-confirm-password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" disabled={loading} />
          </div>
          <Button className="h-11 w-full" type="submit" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LockKeyhole className="mr-2 h-4 w-4" />}
            {loading ? 'Creating Account...' : 'Create Account'}
          </Button>
          <Button variant="ghost" className="w-full" type="button" onClick={() => {
            setMode('sign-in');
            setPassword('');
            setConfirmPassword('');
            setMessage('');
          }}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Sign In
          </Button>
        </form>
      )}
      {mode === 'forgot-password' && (
        <form className="space-y-4" onSubmit={requestPasswordReset}>
          <div className="space-y-2">
            <Label htmlFor="reset-email">Account Email</Label>
            <Input id="reset-email" placeholder="you@business.com" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" disabled={loading} autoFocus />
          </div>
          <Button className="h-11 w-full" type="submit" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
            {loading ? 'Sending...' : 'Send Reset Link'}
          </Button>
          <Button variant="ghost" className="w-full" type="button" onClick={() => {
            setMode('sign-in');
            setMessage('');
          }}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Sign In
          </Button>
        </form>
      )}
      {mode === 'new-password' && (
        <form className="space-y-4" onSubmit={updatePassword}>
          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <Input id="new-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" disabled={loading} autoFocus />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <Input id="confirm-password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" disabled={loading} />
          </div>
          <Button className="h-11 w-full" type="submit" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LockKeyhole className="mr-2 h-4 w-4" />}
            {loading ? 'Saving...' : 'Save New Password'}
          </Button>
        </form>
      )}
      {message && (
        <p
          className={`mt-4 rounded-lg border p-3 text-sm ${
            messageType === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300'
              : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300'
          }`}
          role={messageType === 'error' ? 'alert' : 'status'}
        >
          {message}
        </p>
      )}
    </div>
  );
}
