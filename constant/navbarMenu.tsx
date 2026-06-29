import {
  Home,
  Package,
  ShoppingCart,
  Archive,
  Settings,
  BarChart3,
  ClipboardList,
  ShieldCheck,
  ScrollText,
} from 'lucide-react';
import { NavItem } from '@/types/Navbar';

export const NAVBAR_ITEMS: NavItem[] = [
  {
    title: 'Dashboard',
    path: '/home',
    icon: <Home className="h-4 w-4" />,
    roles: ['OWNER', 'MANAGER'],
  },
  {
    title: 'POS Billing',
    path: '/orders',
    icon: <ShoppingCart className="h-4 w-4" />,
    roles: ['OWNER', 'MANAGER', 'CASHIER'],
  },
  {
    title: 'Products',
    path: '/product',
    icon: <Package className="h-4 w-4" />,
    roles: ['OWNER', 'MANAGER'],
  },
  {
    title: 'Sales Records',
    path: '/records',
    icon: <Archive className="h-4 w-4" />,
    roles: ['OWNER', 'MANAGER', 'CASHIER'],
  },
  {
    title: 'Reports',
    path: '/analytics',
    icon: <BarChart3 className="h-4 w-4" />,
    roles: ['OWNER', 'MANAGER'],
  },
  {
    title: 'Inventory Ledger',
    path: '/inventory',
    icon: <ClipboardList className="h-4 w-4" />,
    roles: ['OWNER', 'MANAGER'],
  },
  {
    title: 'Staff Management',
    path: '/staff',
    icon: <ShieldCheck className="h-4 w-4" />,
    roles: ['OWNER'],
  },
  {
    title: 'Audit Logs',
    path: '/audit-logs',
    icon: <ScrollText className="h-4 w-4" />,
    roles: ['OWNER'],
  },
  {
    title: 'Business Settings',
    path: '/settings',
    icon: <Settings className="h-4 w-4" />,
    roles: ['OWNER'],
  },
];
