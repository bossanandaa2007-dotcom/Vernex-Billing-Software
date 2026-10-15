'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAVBAR_ITEMS } from '@/constant/navbarMenu';
import { useBusinessAccess } from '@/hooks/use-business-access';
import { cn } from '@/lib/utils';

const mobilePaths = ['/home', '/orders', '/product', '/records', '/settings'];

export function MobileBottomNav() {
  const pathname = usePathname();
  const { role, enabledModules } = useBusinessAccess();

  const items = NAVBAR_ITEMS.filter(
    (item) =>
      mobilePaths.includes(item.path) &&
      (!item.moduleKey || enabledModules.includes(item.moduleKey)) &&
      (!item.roles || (role && item.roles.includes(role as never)))
  );

  if (!role) return null;

  return (
    <nav
      aria-label="Primary mobile navigation"
      className="fixed inset-x-0 bottom-0 z-40 flex h-[72px] items-stretch border-t border-vernex-border bg-white px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(15,23,42,0.08)] md:hidden dark:border-[#1E335F] dark:bg-vernex-navy"
    >
      {items.map((item) => {
        const active = pathname === item.path;
        return (
          <Link
            key={item.path}
            href={item.path}
            aria-label={item.title}
            aria-current={active ? 'page' : undefined}
            title={item.title}
            className={cn(
              'relative flex min-h-11 min-w-11 flex-1 items-center justify-center text-vernex-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-vernex-gold dark:text-slate-300',
              active
                ? 'text-vernex-navy before:absolute before:inset-x-3 before:top-0 before:h-0.5 before:rounded-full before:bg-vernex-gold dark:text-vernex-gold'
                : 'hover:text-vernex-navy dark:hover:text-white'
            )}
          >
            <span aria-hidden="true" className="[&>svg]:h-5 [&>svg]:w-5">{item.icon}</span>
          </Link>
        );
      })}
    </nav>
  );
}
