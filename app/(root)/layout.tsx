'use client';
import '../globals.css';
import React, { useState, useEffect } from 'react';
interface RootLayoutProps {
  children: React.ReactNode;
}
import { Bell, ChevronsLeft, ChevronsRight, Menu, Search, Settings, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetTrigger } from '@/components/ui/sheet';
import { ModeToggle } from '@/components/darkmode/darkmode';
import Navbar from '@/components/dashboard/navbar';
import { NavbarSheet } from '@/components/dashboard/NavbarSheet';
import Bread from '@/components/dashboard/breadcrumb';
import { toast } from 'react-toastify';
import axios from 'axios';
import eventBus from '@/lib/even';
import { VernexBrand } from '@/components/dashboard/brand';
import { NAVBAR_ITEMS } from '@/constant/navbarMenu';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { TrialBanner } from '@/components/subscription/TrialBanner';
const RootLayout = ({ children }: RootLayoutProps) => {
  const [storeName, setStoreName] = useState('Vernex Demo Shop');
  const [role, setRole] = useState<string>('OWNER');
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const showHeaderSearch = pathname !== '/home';

  useEffect(() => {
    const fetchShopData = async () => {
      try {
        const isOnline = navigator.onLine;

        if (!isOnline) {
          toast.error(
            'You are offline. Please check your internet connection.'
          );
          return;
        }

        const response = await axios.get('/api/shopdata');
        const shopdata = response.data?.data;

        if (response.status === 200) {
          setStoreName(shopdata?.name || 'Vernex Demo Shop');
        } else {
          toast.error('Failed to fetch data: ' + shopdata.error);
        }
      } catch (error: any) {
        toast.error(
          'Failed to fetch data: ' +
            (error.response?.data.error || error.message)
        );
      }
    };

    fetchShopData();
    fetch('/api/auth/context')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setRole(data?.user?.role ?? 'OWNER'))
      .catch(() => setRole('OWNER'));

    const handleEventBusEvent = () => {
      fetchShopData();
    };

    eventBus.on('fetchStoreData', handleEventBusEvent);

    // Clean up event listener
    return () => {
      eventBus.removeListener('fetchStoreData', handleEventBusEvent);
    };
  }, []);
  const route = NAVBAR_ITEMS.find((item) => item.path === pathname);
  const denied = route?.roles && !route.roles.includes(role as any);

  return (
    <div className="bg-vernex-surface dark:bg-vernex-dark">
      <div className="min-h-screen w-full">
        <aside
          className={`fixed inset-y-0 left-0 z-30 hidden border-r border-vernex-gold/20 bg-vernex-dark transition-[width] duration-300 md:block ${
            collapsed ? 'w-[92px]' : 'w-[220px] lg:w-[280px]'
          }`}
        >
          <div className="flex h-screen flex-col gap-2 overflow-hidden">
            <div className="flex h-16 items-center justify-between gap-2 border-b border-white/10 px-4 lg:h-[72px] lg:px-5">
              {!collapsed && <VernexBrand />}
              {collapsed && <div className="grid h-10 w-10 place-items-center rounded-xl bg-vernex-gold font-black text-vernex-dark">V</div>}
              <Button variant="ghost" size="icon" className="text-slate-300 hover:text-white" onClick={() => setCollapsed((value) => !value)}>
                {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
                <span className="sr-only">Toggle sidebar</span>
              </Button>
            </div>
            <Navbar collapsed={collapsed} />
            <div className="mt-auto border-t border-white/10 p-4 text-xs text-slate-400">
              {!collapsed ? (
                <>
                  <p className="font-medium text-white">Business workspace</p>
                  <p className="mt-1 truncate">{storeName}</p>
                </>
              ) : (
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-white/10 text-vernex-gold">
                  <Store className="h-4 w-4" />
                </div>
              )}
            </div>
          </div>
        </aside>
        <div
          className={`flex min-h-screen flex-col transition-[margin-left] duration-300 ${
            collapsed ? 'md:ml-[92px]' : 'md:ml-[220px] lg:ml-[280px]'
          }`}
        >
          <TrialBanner />
          <header className="flex h-14 items-center gap-3 border-b border-vernex-border bg-white px-4 shadow-sm lg:h-[72px] lg:px-6 dark:border-[#1E335F] dark:bg-vernex-dark">
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0 md:hidden"
                >
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle navigation menu</span>
                </Button>
              </SheetTrigger>
              <NavbarSheet />
            </Sheet>
            <Bread />
            {showHeaderSearch && (
              <div className="relative ml-auto hidden min-w-0 flex-1 max-w-xl lg:block">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-vernex-muted" />
                <input
                  className="h-10 w-full rounded-xl border border-vernex-border bg-vernex-surface pl-9 pr-3 text-sm outline-none transition focus:border-vernex-gold focus:ring-2 focus:ring-vernex-gold/20 dark:border-[#1E335F] dark:bg-vernex-navy"
                  placeholder="Search products, bills, customers..."
                />
              </div>
            )}
            {!showHeaderSearch && <div className="ml-auto" />}
            <div className="hidden items-center gap-2 rounded-xl border border-vernex-border bg-vernex-surface px-3 py-2 text-sm text-vernex-muted sm:flex dark:border-[#1E335F] dark:bg-vernex-navy dark:text-slate-300">
              <Store className="h-4 w-4 text-vernex-gold" />
              <span className="max-w-40 truncate">{storeName}</span>
            </div>
            <Button variant="outline" size="icon" className="relative">
              <Bell className="h-4 w-4" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-vernex-gold" />
              <span className="sr-only">Notifications</span>
            </Button>
            <ModeToggle />
            <Button variant="outline" size="icon" asChild>
              <Link href="/settings">
                <Settings className="h-4 w-4" />
                <span className="sr-only">Settings</span>
              </Link>
            </Button>
          </header>
          <main className="flex flex-1 flex-col gap-4 bg-vernex-surface p-4 lg:gap-6 lg:p-6 dark:bg-vernex-dark">
            <div
              className="flex flex-1 items-start justify-center"
              x-chunk="dashboard-02-chunk-1"
            >
              {denied ? (
                <div className="w-full rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
                  <h1 className="text-lg font-semibold">Access denied</h1>
                  <p className="mt-1 text-sm">Your current role does not have permission to open this page.</p>
                </div>
              ) : children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default RootLayout;
