'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  BarChart3,
  Bell,
  Building2,
  ChevronDown,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  Moon,
  Search,
  Settings,
  ShieldCheck,
  Sun,
  Users,
  X,
} from 'lucide-react';
import { Button } from '@/components/super-admin/ui/button';
import { Input } from '@/components/super-admin/ui/input';
import { cn } from '@/lib/super-admin/utils';
import type { AdminBusiness, AdminUser } from '@/types/super-admin/admin';

const navItems = [
  { href: '/super-admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/super-admin/businesses', label: 'Businesses', icon: Building2 },
  { href: '/super-admin/users', label: 'Users', icon: Users },
  { href: '/super-admin/support', label: 'Support', icon: LifeBuoy },
  { href: '/super-admin/audit-logs', label: 'Audit Logs', icon: ShieldCheck },
  { href: '/super-admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/super-admin/trials', label: 'Trials', icon: Activity },
  { href: '/super-admin/settings', label: 'Settings', icon: Settings },
];

type Notification = {
  title: string;
  description: string;
  href: string;
  tone: 'warning' | 'info';
};

export function AdminShell({
  adminEmail,
  notifications,
  children,
}: {
  adminEmail: string;
  notifications: Notification[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<{ businesses: AdminBusiness[]; users: AdminUser[] }>({ businesses: [], users: [] });
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (query.trim().length < 2) {
      setResults({ businesses: [], users: [] });
      setSearching(false);
      return;
    }
    setSearching(true);
    searchTimer.current = setTimeout(() => {
      fetch(`/api/super-admin/search?q=${encodeURIComponent(query.trim())}`)
        .then((response) => response.json())
        .then((data) => setResults({ businesses: data.businesses ?? [], users: data.users ?? [] }))
        .catch(() => setResults({ businesses: [], users: [] }))
        .finally(() => setSearching(false));
    }, 250);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [query]);

  const crumbs = useMemo(() => {
    const segments = pathname.split('/').filter(Boolean);
    return ['Portal', ...segments.map((segment) => segment.replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()))];
  }, [pathname]);

  async function logout() {
    await fetch('/api/super-admin/auth/logout', { method: 'POST' });
    window.location.replace('/login');
  }

  const sidebar = (
    <div className="flex h-full flex-col bg-[#071c42] text-white">
      <div className="flex h-[72px] items-center gap-3 border-b border-white/10 px-5">
        <Image src="/vernex-logo.png" alt="Vernex" width={44} height={44} className="h-10 w-10 rounded-md bg-white object-contain p-1" />
        <div><p className="font-bold">Vernex Control</p><p className="text-xs text-slate-300">Super Admin Portal</p></div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {navItems.map((item) => {
          const active = item.href === '/super-admin' ? pathname === '/super-admin' : pathname.startsWith(item.href);
          return <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className={cn('flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition', active ? 'bg-white text-[#071c42]' : 'text-slate-300 hover:bg-white/10 hover:text-white')}><item.icon className="h-5 w-5" />{item.label}</Link>;
        })}
      </nav>
      <div className="border-t border-white/10 p-4">
        <button onClick={logout} className="flex h-11 w-full items-center gap-3 rounded-md px-3 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"><LogOut className="h-5 w-5" />Logout</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f4f7fb] dark:bg-[#071327]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">{sidebar}</aside>
      {mobileOpen && <div className="fixed inset-0 z-50 lg:hidden"><button aria-label="Close navigation" className="absolute inset-0 bg-slate-950/50" onClick={() => setMobileOpen(false)} /><aside className="relative h-full w-72 shadow-2xl">{sidebar}<button aria-label="Close navigation" onClick={() => setMobileOpen(false)} className="absolute right-3 top-[18px] grid h-9 w-9 place-items-center rounded-md bg-white/10 text-white transition hover:bg-white/20"><X className="h-5 w-5" /></button></aside></div>}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-[72px] items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:px-6 dark:border-slate-800 dark:bg-slate-950/95">
          <Button variant="outline" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu className="h-5 w-5" /></Button>
          <div className="hidden min-w-0 items-center gap-2 text-sm text-slate-500 md:flex">
            {crumbs.map((crumb, index) => <span key={`${crumb}-${index}`} className={index === crumbs.length - 1 ? 'font-semibold text-slate-900 dark:text-white' : ''}>{index > 0 && <span className="mr-2 text-slate-300">/</span>}{crumb}</span>)}
          </div>
          {/^\/super-admin\/businesses\/[^/]+$/.test(pathname) && <Link href={`${pathname}/modules`} className="inline-flex h-9 items-center rounded-md border border-slate-300 px-3 text-sm font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">Modules</Link>}
          <div className="relative ml-auto w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input value={query} onChange={(event) => { setQuery(event.target.value); setSearchOpen(true); }} onFocus={() => setSearchOpen(true)} placeholder="Search businesses, owners, users..." className="pl-9" />
            {searchOpen && query.trim().length >= 2 && <div className="absolute right-0 top-12 w-full min-w-80 rounded-lg border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center justify-between px-2 py-1 text-xs font-semibold uppercase text-slate-400"><span>Search Results</span><button onClick={() => setSearchOpen(false)} aria-label="Close search"><X className="h-4 w-4" /></button></div>
              {searching ? <p className="p-4 text-sm text-slate-500">Searching...</p> : results.businesses.length || results.users.length ? <div className="max-h-80 overflow-auto">
                {results.businesses.map((business) => <Link key={business.id} href={`/super-admin/businesses/${business.id}`} className="flex items-center gap-3 rounded-md p-2 hover:bg-slate-50 dark:hover:bg-slate-800"><Building2 className="h-4 w-4 text-amber-600" /><span><b className="block text-sm">{business.name}</b><span className="text-xs text-slate-500">{business.ownerEmail}</span></span></Link>)}
                {results.users.map((user) => <Link key={user.id} href={`/super-admin/users?search=${encodeURIComponent(user.email)}`} className="flex items-center gap-3 rounded-md p-2 hover:bg-slate-50 dark:hover:bg-slate-800"><Users className="h-4 w-4 text-blue-600" /><span><b className="block text-sm">{user.name}</b><span className="text-xs text-slate-500">{user.email}</span></span></Link>)}
              </div> : <p className="p-4 text-sm text-slate-500">No matching results found.</p>}
            </div>}
          </div>
          <Button variant="outline" size="icon" onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')} aria-label="Toggle theme">{resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</Button>
          <div className="relative">
            <Button variant="outline" size="icon" onClick={() => setNotificationsOpen((value) => !value)} aria-label="Notifications"><Bell className="h-4 w-4" />{notifications.length > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-amber-500" />}</Button>
            {notificationsOpen && <div className="absolute right-0 top-12 w-80 rounded-lg border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900"><h3 className="font-semibold">Notifications</h3><div className="mt-2 max-h-80 space-y-1 overflow-auto">{notifications.length ? notifications.map((item, index) => <Link key={`${item.title}-${index}`} href={item.href} className="block rounded-md p-3 hover:bg-slate-50 dark:hover:bg-slate-800"><p className="text-sm font-semibold">{item.title}</p><p className="mt-1 text-xs text-slate-500">{item.description}</p></Link>) : <p className="p-4 text-center text-sm text-slate-500">No new notifications.</p>}</div></div>}
          </div>
          <div className="relative hidden sm:block">
            <button onClick={() => setProfileOpen((value) => !value)} className="flex h-10 items-center gap-2 rounded-md border border-slate-200 px-2 text-sm dark:border-slate-700"><span className="grid h-7 w-7 place-items-center rounded-full bg-[#071c42] font-bold text-white">SA</span><ChevronDown className="h-4 w-4 text-slate-400" /></button>
            {profileOpen && <div className="absolute right-0 top-12 w-64 rounded-lg border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900"><p className="text-xs uppercase text-slate-400">Super Admin</p><p className="mt-1 truncate text-sm font-semibold">{adminEmail}</p><div className="my-3 border-t border-slate-100 dark:border-slate-800" /><Link href="/super-admin/settings" className="flex items-center gap-2 rounded-md p-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"><Settings className="h-4 w-4" />Profile Settings</Link><button onClick={logout} className="flex w-full items-center gap-2 rounded-md p-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"><LogOut className="h-4 w-4" />Sign Out</button></div>}
          </div>
        </header>
        <main className="p-4 md:p-6 xl:p-8">{children}</main>
      </div>
    </div>
  );
}
