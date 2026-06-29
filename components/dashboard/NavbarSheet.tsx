'use client';
import Link from 'next/link';
import { SheetContent } from '@/components/ui/sheet';
import { NAVBAR_ITEMS } from '@/constant/navbarMenu';
import { usePathname } from 'next/navigation';
import { VernexBrand } from './brand';
import { useEffect, useState } from 'react';

export function NavbarSheet() {
  // Get the current pathname from Next.js router
  const pathname = usePathname();
  const [role, setRole] = useState<string>('OWNER');

  useEffect(() => {
    fetch('/api/auth/context')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setRole(data?.user?.role ?? 'OWNER'))
      .catch(() => setRole('OWNER'));
  }, []);
  const items = NAVBAR_ITEMS.filter((item) => !item.roles || item.roles.includes(role as any));

  return (
    <>
      {/* SheetContent component to render the navigation content */}
      <SheetContent side="left" className="flex flex-col border-vernex-gold/20 bg-vernex-dark p-0">
        {/* Navigation container */}
        <div className="border-b border-white/10 px-5 py-4">
          <VernexBrand />
        </div>
        <nav className="grid gap-1 p-4 text-sm font-medium">
          {/* Link for the top section with an icon */}
          {/* Map through NAVBAR_ITEMS to create navigation links */}
          {items.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ${
                pathname === item.path
                  ? 'bg-white text-vernex-navy shadow-sm'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              } transition-all`}
            >
              {/* Render the icon and title for each navigation item */}
              {item.icon}
              {item.title}
            </Link>
          ))}

        </nav>
      </SheetContent>
    </>
  );
}
