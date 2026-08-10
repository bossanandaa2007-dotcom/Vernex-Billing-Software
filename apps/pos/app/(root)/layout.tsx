'use client';
import React, { useState, useEffect } from 'react';
interface RootLayoutProps {
  children: React.ReactNode;
}
import { ChevronsLeft, ChevronsRight, Menu, Search, Settings, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetTrigger } from '@/components/ui/sheet';
import { ModeToggle } from '@/components/darkmode/darkmode';
import Navbar from '@/components/dashboard/navbar';
import { NavbarSheet } from '@/components/dashboard/NavbarSheet';
import Bread from '@/components/dashboard/breadcrumb';
import { toast } from 'react-toastify';
import eventBus from '@/lib/even';
import { VernexBrand } from '@/components/dashboard/brand';
import { NAVBAR_ITEMS } from '@/constant/navbarMenu';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { TrialBanner } from '@/components/subscription/TrialBanner';
import { useBusinessAccess } from '@/hooks/use-business-access';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { MobileBottomNav } from '@/components/dashboard/MobileBottomNav';
import Image from 'next/image';
import { getModuleForPathname } from '@/lib/modules';
import { getShopData } from '@/lib/client-data';
const RootLayout = ({ children }: RootLayoutProps) => {
  const [storeName, setStoreName] = useState('Vernex');
  const [storeLogo, setStoreLogo] = useState('/assets/vernex-logo.png');
  const [collapsed, setCollapsed] = useState(false);
  // Interactive Radix chrome (mobile nav Sheet, theme toggle) generates ids with
  // useId. Client-only providers above this tree (theme provider, top loader)
  // shift that tree, so SSR and the first client render disagree on those ids and
  // React logs a hydration mismatch. Rendering these widgets only after mount
  // keeps the server and first client render identical.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const pathname = usePathname();
  const showHeaderSearch = pathname !== '/home';
  const { role, enabledModules, loading } = useBusinessAccess();
  useEffect(() => {
    const fetchShopData = async (fresh = false) => {
      try {
        const isOnline = navigator.onLine;

        if (!isOnline) {
          toast.error(
            'You are offline. Please check your internet connection.'
          );
          return;
        }

        const response = await getShopData({ fresh });
        setStoreName(response.data?.name || 'Vernex');
        setStoreLogo(response.data?.receiptLogo || '/assets/vernex-logo.png');
      } catch {
        toast.error('Unable to load business details. Please check your connection.');
      }
    };

    fetchShopData(false);
    const handleEventBusEvent = () => {
      fetchShopData(true);
    };

    eventBus.on('fetchStoreData', handleEventBusEvent);

    // Clean up event listener
    return () => {
      eventBus.removeListener('fetchStoreData', handleEventBusEvent);
    };
  }, []);
  const routeModule = getModuleForPathname(pathname);
  const route = NAVBAR_ITEMS.find((item) => item.path === pathname) ?? NAVBAR_ITEMS.find((item) => item.moduleKey === routeModule);
  const denied = Boolean(role && routeModule && !enabledModules.includes(routeModule)) || Boolean(role && route && route.roles && !route.roles.includes(role as any));

  return (
    <div className="bg-vernex-surface dark:bg-vernex-dark">
      <div className="min-h-screen w-full">
        <aside
          className={`fixed inset-y-0 left-0 z-30 hidden border-r border-vernex-gold/20 bg-vernex-dark transition-[width] duration-300 lg:block ${
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
              <div className="mt-3">
                <LogoutButton collapsed={collapsed} />
              </div>
            </div>
          </div>
        </aside>
        <div
          className={`flex min-h-screen flex-col transition-[margin-left] duration-300 ${
            collapsed ? 'lg:ml-[92px]' : 'lg:ml-[280px]'
          }`}
        >
          <TrialBanner />
          <header className="flex h-16 items-center gap-2 border-b border-white/10 bg-vernex-dark px-3 shadow-sm sm:gap-3 sm:px-4 lg:h-[72px] lg:border-vernex-border lg:bg-white lg:px-6 dark:border-[#1E335F] dark:bg-vernex-dark">
            {mounted ? (
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-11 w-11 shrink-0 border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white lg:hidden"
                  >
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Toggle navigation menu</span>
                  </Button>
                </SheetTrigger>
                <NavbarSheet storeName={storeName} storeLogo={storeLogo} />
              </Sheet>
            ) : (
              <Button
                variant="outline"
                size="icon"
                className="h-11 w-11 shrink-0 border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white lg:hidden"
                aria-label="Toggle navigation menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            )}
            <div className="flex min-w-0 flex-1 items-center justify-center gap-2 lg:hidden">
              <span className="grid h-9 w-10 shrink-0 place-items-center overflow-hidden rounded-md bg-white p-1">
                <Image src="/assets/vernex-logo.png" alt="Vernex logo" width={40} height={30} className="h-full w-full object-contain" unoptimized />
              </span>
              <span className="min-w-0 leading-tight text-white">
                <span className="block truncate text-sm font-bold">VERNEX</span>
                <span className="block truncate text-[10px] text-vernex-gold-soft">Billing Software</span>
              </span>
            </div>
            <div className="hidden lg:block"><Bread /></div>
            {showHeaderSearch && ['products', 'customers', 'sales_records'].some((key) => enabledModules.includes(key)) && (
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
            <div className="hidden sm:block">{mounted && <ModeToggle />}</div>
            {enabledModules.includes('business_settings') && <Button variant="outline" size="icon" asChild className="h-11 w-11 shrink-0 border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white lg:border-vernex-border lg:bg-white lg:text-vernex-navy lg:hover:bg-vernex-surface dark:border-[#1E335F] dark:bg-vernex-navy dark:text-white">
              <Link href="/settings">
                <Settings className="h-4 w-4" />
                <span className="sr-only">Settings</span>
              </Link>
            </Button>}
          </header>
          <main className="flex min-w-0 flex-1 flex-col gap-4 bg-vernex-surface px-3 py-4 pb-24 sm:px-4 md:pb-6 lg:gap-6 lg:p-6 dark:bg-vernex-dark">
            <div
              className="flex flex-1 items-start justify-center"
              x-chunk="dashboard-02-chunk-1"
            >
              {loading || !role ? (
                <div className="flex min-h-48 w-full items-center justify-center text-sm text-vernex-muted">
                  Verifying your account...
                </div>
              ) : denied ? (
                <div className="w-full rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
                  <h1 className="text-lg font-semibold">Access denied</h1>
                  <p className="mt-1 text-sm">{routeModule && !enabledModules.includes(routeModule) ? 'This feature is not enabled for your business.' : 'Your current role does not have permission to open this page.'}</p>
                </div>
              ) : children}
            </div>
          </main>
          <MobileBottomNav />
        </div>
      </div>
    </div>
  );
};

export default RootLayout;
