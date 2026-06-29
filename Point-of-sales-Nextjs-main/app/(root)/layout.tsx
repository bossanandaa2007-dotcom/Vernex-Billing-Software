'use client';
import '../globals.css';
import React, { useState, useEffect } from 'react';
interface RootLayoutProps {
  children: React.ReactNode;
}
import { Menu, Store } from 'lucide-react';
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
import { TrialBanner } from '@/components/subscription/TrialBanner';
const RootLayout = ({ children }: RootLayoutProps) => {
  const [storeName, setStoreName] = useState('Vernex Demo Shop');
  const [role, setRole] = useState<string>('OWNER');
  const pathname = usePathname();

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
      <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
        <aside className="hidden border-r border-vernex-gold/20 bg-vernex-dark md:block">
          <div className="flex h-full max-h-screen flex-col gap-2">
            <div className="flex h-16 items-center border-b border-white/10 px-4 lg:h-[72px] lg:px-5">
              <VernexBrand />
            </div>
            <Navbar />
            <div className="mt-auto border-t border-white/10 p-4 text-xs text-slate-400">
              <p className="font-medium text-white">Business workspace</p>
              <p className="mt-1 truncate">{storeName}</p>
            </div>
          </div>
        </aside>
        <div className="flex flex-col">
          <TrialBanner />
          <header className="flex h-14 items-center gap-4 border-b border-vernex-border bg-white px-4 shadow-sm lg:h-[72px] lg:px-6 dark:border-[#1E335F] dark:bg-vernex-dark">
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
            <div className="hidden items-center gap-2 rounded-lg border border-vernex-border bg-vernex-surface px-3 py-2 text-sm text-vernex-muted sm:flex dark:border-[#1E335F] dark:bg-vernex-navy dark:text-slate-300">
              <Store className="h-4 w-4 text-vernex-gold" />
              <span className="max-w-40 truncate">{storeName}</span>
            </div>
            <ModeToggle />
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
