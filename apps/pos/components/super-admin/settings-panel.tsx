'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useTheme } from 'next-themes';
import { Loader2, Save } from 'lucide-react';
import { Card } from '@/components/super-admin/ui/card';
import { Button } from '@/components/super-admin/ui/button';
import { Input } from '@/components/super-admin/ui/input';

export function SettingsPanel({ email }: { email: string }) {
  const { theme, setTheme } = useTheme();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [brandName, setBrandName] = useState('Vernex Control');

  useEffect(() => {
    setBrandName(localStorage.getItem('vernex-admin-brand') || 'Vernex Control');
  }, []);

  async function changePassword(event: FormEvent) {
    event.preventDefault();
    if (password !== confirm) return setMessage('The passwords do not match.');
    setSaving(true);
    const response = await fetch('/api/super-admin/admin/password', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
    const result = await response.json();
    setSaving(false);
    setMessage(response.ok ? 'Password changed successfully.' : result.error || 'Unable to change password.');
    if (response.ok) { setPassword(''); setConfirm(''); }
  }

  function saveBranding() {
    localStorage.setItem('vernex-admin-brand', brandName.trim() || 'Vernex Control');
    setMessage('Portal preferences saved successfully.');
  }

  return <div className="grid gap-5 xl:grid-cols-2"><Card className="p-5"><h2 className="font-semibold">Profile</h2><p className="mt-1 text-sm text-slate-500">The only authorized Super Admin account.</p><div className="mt-5"><label className="text-sm font-medium">Email<Input className="mt-2" value={email} disabled /></label></div></Card><Card className="p-5"><h2 className="font-semibold">Change Password</h2><form className="mt-5 space-y-4" onSubmit={changePassword}><label className="text-sm font-medium">New Password<Input className="mt-2" type="password" minLength={10} value={password} onChange={(event) => setPassword(event.target.value)} required /></label><label className="text-sm font-medium">Confirm Password<Input className="mt-2" type="password" minLength={10} value={confirm} onChange={(event) => setConfirm(event.target.value)} required /></label><Button type="submit" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{saving ? 'Saving...' : 'Save Password'}</Button></form></Card><Card className="p-5"><h2 className="font-semibold">Branding</h2><p className="mt-1 text-sm text-slate-500">Local portal display preferences. Customer POS branding is not changed.</p><label className="mt-5 block text-sm font-medium">Portal Name<Input className="mt-2" value={brandName} onChange={(event) => setBrandName(event.target.value)} /></label><Button className="mt-4" onClick={saveBranding}><Save className="h-4 w-4" />Save Changes</Button></Card><Card className="p-5"><h2 className="font-semibold">Theme and General Settings</h2><p className="mt-1 text-sm text-slate-500">Choose the interface appearance for this browser.</p><div className="mt-5 flex gap-3"><Button variant={theme === 'light' ? 'default' : 'outline'} onClick={() => setTheme('light')}>Light</Button><Button variant={theme === 'dark' ? 'default' : 'outline'} onClick={() => setTheme('dark')}>Dark</Button><Button variant={theme === 'system' ? 'default' : 'outline'} onClick={() => setTheme('system')}>System</Button></div></Card>{message && <div role="status" className="xl:col-span-2 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300">{message}</div>}</div>;
}

