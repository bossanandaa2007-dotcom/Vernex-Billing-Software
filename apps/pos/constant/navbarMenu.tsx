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
  Users,
  LifeBuoy,
  CreditCard,
} from 'lucide-react';
import { NavItem } from '@/types/Navbar';

export const NAVBAR_ITEMS: NavItem[] = [
  {
    title: 'Dashboard',
    path: '/home',
    icon: <Home className="h-4 w-4" />,
    roles: ['OWNER', 'MANAGER'],
    moduleKey: 'dashboard',
  },
  {
    title: 'POS Billing',
    path: '/orders',
    icon: <ShoppingCart className="h-4 w-4" />,
    roles: ['OWNER', 'MANAGER', 'CASHIER'],
    moduleKey: 'pos_billing',
  },
  {
    title: 'Products',
    path: '/product',
    icon: <Package className="h-4 w-4" />,
    roles: ['OWNER', 'MANAGER'],
    moduleKey: 'products',
  },
  {
    title: 'Sales Records',
    path: '/records',
    icon: <Archive className="h-4 w-4" />,
    roles: ['OWNER', 'MANAGER', 'CASHIER'],
    moduleKey: 'sales_records',
  },
  {
    title: 'Customers',
    path: '/customers',
    icon: <Users className="h-4 w-4" />,
    roles: ['OWNER', 'MANAGER', 'CASHIER'],
    moduleKey: 'customers',
  },
  {
    title: 'Reports',
    path: '/analytics',
    icon: <BarChart3 className="h-4 w-4" />,
    roles: ['OWNER', 'MANAGER'],
    moduleKey: 'reports',
  },
  {
    title: 'Inventory Ledger',
    path: '/inventory',
    icon: <ClipboardList className="h-4 w-4" />,
    roles: ['OWNER', 'MANAGER'],
    moduleKey: 'inventory_ledger',
  },
  {
    title: 'Staff Management',
    path: '/staff',
    icon: <ShieldCheck className="h-4 w-4" />,
    roles: ['OWNER'],
    moduleKey: 'staff_management',
  },
  {
    title: 'Audit Logs',
    path: '/audit-logs',
    icon: <ScrollText className="h-4 w-4" />,
    roles: ['OWNER'],
    moduleKey: 'audit_logs',
  },
  {
    title: 'Business Settings',
    path: '/settings',
    icon: <Settings className="h-4 w-4" />,
    roles: ['OWNER'],
    moduleKey: 'business_settings',
  },
  {
    title: 'Subscription',
    path: '/subscription',
    icon: <CreditCard className="h-4 w-4" />,
    // No module and no role limit: this is the one page that must stay reachable
    // for everyone, including when an expired licence has locked the rest of the app.
  },
  {
    title: 'Support',
    path: '/support',
    icon: <LifeBuoy className="h-4 w-4" />,
    roles: ['OWNER', 'MANAGER', 'CASHIER'],
    moduleKey: 'support',
  },
];
