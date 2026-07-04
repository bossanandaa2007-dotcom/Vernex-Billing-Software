'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { NAVBAR_ITEMS } from '@/constant/navbarMenu';
import { getAuthContext } from '@/lib/client-data';
import { cn } from '@/lib/utils';

const mobilePaths = ['/home', '/orders', '/product', '/records', '/settings'];

export function MobileBottomNav() {
  const pathname = usePathname();
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    getAuthContext()
      .then((data) => setRole(data?.user?.role ?? null))
      .catch(() => setRole(null));
  }, []);

  const items = NAVBAR_ITEMS.filter(
    (item) =>
      mobilePaths.includes(item.path) &&
      (!item.roles || (role && item.roles.includes(role as never)))
  );

  if (!role) return null;

  return (
    <nav
      aria-label="Primary mobile navigation"
      className="fixed inset-x-0 bottom-0 z-40 grid h-[72px] grid-cols-5 border-t border-vernex-border bg-white px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(15,23,42,0.08)] md:hidden dark:border-[#1E335F] dark:bg-vernex-navy"
    >
      {items.map((item) => {
        const active = pathname === item.path;
        return (
          <Link
            key={item.path}
            href={item.path}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex min-w-0 flex-col items-center justify-center gap-1 rounded-md px-1 text-[10px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vernex-gold',
              active
                ? 'bg-vernex-navy text-white dark:bg-vernex-gold dark:text-vernex-dark'
                : 'text-vernex-muted hover:bg-vernex-surface dark:text-slate-300 dark:hover:bg-white/10'
            )}
          >
            <span className="[&>svg]:h-5 [&>svg]:w-5">{item.icon}</span>
            <span className="w-full truncate text-center">
              {item.path === '/settings' ? 'Business' : item.title}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
