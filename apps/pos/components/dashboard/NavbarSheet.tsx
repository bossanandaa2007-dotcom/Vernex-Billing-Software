'use client';
import Link from 'next/link';
import Image from 'next/image';
import { SheetClose, SheetContent } from '@/components/ui/sheet';
import { NAVBAR_ITEMS } from '@/constant/navbarMenu';
import { usePathname } from 'next/navigation';
import { useBusinessAccess } from '@/hooks/use-business-access';
import { LogoutButton } from '@/components/auth/LogoutButton';

const bottomNavigationPaths = new Set(['/home', '/orders', '/product', '/records', '/settings']);

export function NavbarSheet({ storeName, storeLogo }: { storeName: string; storeLogo: string }) {
  const pathname = usePathname();
  const { role, enabledModules } = useBusinessAccess();
  const items = role
    ? NAVBAR_ITEMS.filter(
        (item) =>
          !bottomNavigationPaths.has(item.path) &&
          enabledModules.includes(item.moduleKey) &&
          (!item.roles || item.roles.includes(role as any))
      )
    : [];

  return (
    <>
      {/* SheetContent component to render the navigation content */}
      <SheetContent side="left" className="flex w-[min(86vw,340px)] flex-col border-vernex-gold/20 bg-vernex-dark p-0">
        {/* Navigation container */}
        <div className="border-b border-white/10 px-5 py-4">
          <Link href="/home" className="flex items-center gap-3" aria-label={`${storeName} dashboard`}>
            <span className="flex h-12 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1 shadow-sm">
              <Image
                src={storeLogo}
                alt={`${storeName} logo`}
                width={56}
                height={48}
                unoptimized={storeLogo.startsWith('data:')}
                className="h-full w-full object-contain"
              />
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-sm font-bold tracking-wide text-white">
                {storeName}
              </span>
            </span>
          </Link>
        </div>
        <nav className="grid flex-1 content-start gap-1 overflow-y-auto p-4 text-sm font-medium">
          {/* Link for the top section with an icon */}
          {/* Map through NAVBAR_ITEMS to create navigation links */}
          {items.map((item) => (
            <SheetClose asChild key={item.path}>
              <Link
                href={item.path}
                className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 ${
                  pathname === item.path
                    ? 'bg-white text-vernex-navy shadow-sm'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                } transition-all`}
              >
                {item.icon}
                {item.title}
              </Link>
            </SheetClose>
          ))}
        </nav>
        <div className="border-t border-white/10 p-4 text-xs text-slate-400">
          <p className="font-medium text-white">Business workspace</p>
          <p className="mt-1 truncate">{storeName}</p>
          <div className="mt-3">
            <LogoutButton />
          </div>
        </div>
      </SheetContent>
    </>
  );
}
