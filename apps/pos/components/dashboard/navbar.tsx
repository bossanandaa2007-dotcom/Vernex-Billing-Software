'use client';
import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { NAVBAR_ITEMS } from '@/constant/navbarMenu';
import { cn } from '@/lib/utils';
import { useBusinessAccess } from '@/hooks/use-business-access';

function Navbar({ collapsed = false }: { collapsed?: boolean }) {
  const pathname = usePathname();
  const { role, enabledModules } = useBusinessAccess();

  const items = role
    ? NAVBAR_ITEMS.filter((item) =>
        enabledModules.includes(item.moduleKey) &&
        (!item.roles || item.roles.includes(role as any)))
    : [];

  return (
    <>
      <div className="flex-1">
        {/* Navigation bar container */}
        <nav className={cn('grid items-start gap-1 px-3 py-4 text-sm font-medium', !collapsed && 'lg:px-4')}>
          {/* Map through NAVBAR_ITEMS to create navigation links */}
          {items.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              title={collapsed ? item.title : undefined}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 ${
                pathname === item.path
                  ? 'bg-white text-vernex-navy shadow-sm ring-1 ring-white/60'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              } transition-all`}
            >
              {/* Render the icon and title for each navigation item */}
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/5 text-current transition group-hover:bg-white/10">
                {item.icon}
              </span>
              {!collapsed && <span className="truncate">{item.title}</span>}
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}

export default Navbar;
