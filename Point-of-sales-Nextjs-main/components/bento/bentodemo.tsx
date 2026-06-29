/* eslint-disable react/no-unescaped-entities */
'use client';
import { cn } from '@/lib/utils';
import React from 'react';
import { BentoGrid, BentoGridItem } from '../ui/bento-grid';
import {
  IconBuildingStore,
  IconClock,
  IconReceipt,
  IconCalendarMonth,
  IconTableColumn,
} from '@tabler/icons-react';
import DigitalClock from '../clock/clock';
import DateComponent from '../date/date';
import WeatherComponent from '../weather/weather';
import DashboardCard from '../card/card';
import NetworkSpeed from '../networkspeed/networkspeed';
export function BentoGridHome() {
  return (
    <BentoGrid className="w-full mx-auto md:auto-rows-[20rem]">
      {items.map((item, i) => (
        <BentoGridItem
          key={i}
          title={item.title}
          description={item.description}
          header={item.header}
          className={cn('[&>p:text-lg]', item.className)}
          icon={item.icon}
        />
      ))}
    </BentoGrid>
  );
}

const items = [
  {
    title: "Today's Billing Summary",
    description: <span className="text-sm">Live business time for your billing day.</span>,
    header: <DigitalClock />,
    className: 'md:col-span-1',
    icon: <IconClock className="h-4 w-4 text-vernex-gold" />,
  },
  {
    title: 'Daily Sales Overview',
    description: (
      <span className="text-sm">A clean snapshot of today&apos;s billing activity.</span>
    ),
    header: <WeatherComponent />,
    className: 'md:col-span-1',
    icon: <IconReceipt className="h-4 w-4 text-vernex-gold" />,
  },
  {
    title: 'Low Stock Alerts',
    description: <span className="text-sm">Review inventory attention for the current day.</span>,
    header: <DateComponent />,
    className: 'md:col-span-1',
    icon: <IconCalendarMonth className="h-4 w-4 text-vernex-gold" />,
  },
  {
    title: 'Business Performance',
    description: <span className="text-sm">Monitor products, revenue, and items sold.</span>,
    header: <DashboardCard />,
    className: 'md:col-span-2',
    icon: <IconTableColumn className="h-4 w-4 text-vernex-gold" />,
  },

  {
    title: 'Quick Business Status',
    description: <span className="text-sm">Billing workspace is ready for business.</span>,
    header: <NetworkSpeed />,
    className: 'md:col-span-1',
    icon: <IconBuildingStore className="h-4 w-4 text-vernex-gold" />,
  },
];
