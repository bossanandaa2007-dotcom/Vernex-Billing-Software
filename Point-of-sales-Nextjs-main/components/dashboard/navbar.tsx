'use client';
import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { NAVBAR_ITEMS } from '@/constant/navbarMenu';

function Navbar() {
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
      <div className="flex-1">
        {/* Navigation bar container */}
        <nav className="grid items-start gap-1 px-3 py-4 text-sm font-medium lg:px-4">
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
      </div>
    </>
  );
}

export default Navbar;
