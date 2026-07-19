export const MODULE_KEYS = [
  'core', 'dashboard', 'pos_billing', 'products', 'customers', 'sales_records',
  'inventory', 'inventory_ledger', 'stock_adjustment', 'purchase_entry', 'suppliers',
  'finance', 'reports', 'gst_reports', 'tax_settings', 'expense_tracking',
  'staff', 'staff_management', 'attendance', 'roles_permissions',
  'business', 'business_settings', 'printer_settings', 'receipt_customization',
  'advanced', 'audit_logs', 'analytics', 'multi_counter', 'multiple_branches',
  'barcode_support', 'kitchen_display', 'customer_loyalty', 'credit_sales',
  'returns_refunds', 'offline_mode', 'support',
] as const;

export type ModuleKey = (typeof MODULE_KEYS)[number];
export const DEFAULT_MODULE_KEYS: ModuleKey[] = [
  'dashboard', 'pos_billing', 'products', 'customers', 'sales_records', 'business_settings', 'support',
];

export const MODULE_ROUTE_PREFIXES: Record<ModuleKey, string[]> = {
  core: [],
  dashboard: ['/home'],
  pos_billing: ['/orders'],
  products: ['/product'],
  customers: ['/customers'],
  sales_records: ['/records'],
  inventory: [],
  inventory_ledger: ['/inventory'],
  stock_adjustment: [],
  purchase_entry: [],
  suppliers: [],
  finance: [],
  reports: ['/analytics'],
  gst_reports: [],
  tax_settings: [],
  expense_tracking: [],
  staff: ['/staff'],
  staff_management: ['/staff'],
  attendance: [],
  roles_permissions: [],
  business: [],
  business_settings: ['/settings'],
  printer_settings: ['/settings'],
  receipt_customization: ['/settings'],
  advanced: [],
  audit_logs: ['/audit-logs'],
  analytics: [],
  multi_counter: [],
  multiple_branches: [],
  barcode_support: [],
  kitchen_display: [],
  customer_loyalty: [],
  credit_sales: [],
  returns_refunds: [],
  offline_mode: [],
  support: ['/support'],
};

export const MODULE_PERMISSION_MAP = {
  DASHBOARD_VIEW: 'dashboard',
  POS_BILLING: 'pos_billing',
  PRODUCT_WRITE: 'products',
  CUSTOMER_WRITE: 'customers',
  INVENTORY_VIEW: 'inventory_ledger',
  STOCK_ADJUST: 'stock_adjustment',
  RETURNS_MANAGE: 'returns_refunds',
  RECORDS_VIEW: 'sales_records',
  REPORTS_VIEW: 'reports',
  SETTINGS_WRITE: 'business_settings',
  BILL_SETTINGS_WRITE: 'business_settings',
  RECEIPT_SETTINGS_WRITE: 'business_settings',
  STAFF_MANAGE: 'staff_management',
  AUDIT_VIEW: 'audit_logs',
} as const;

export function hasModule(modules: readonly string[] | undefined, module: ModuleKey) {
  return modules?.includes(module) === true;
}

export function hasModuleAccess(modules: readonly string[] | undefined, module: ModuleKey | undefined) {
  return !module || hasModule(modules, module);
}

export function getModuleForPermission(permission: keyof typeof MODULE_PERMISSION_MAP) {
  return MODULE_PERMISSION_MAP[permission];
}

export function getModuleForPathname(pathname: string) {
  const normalized = pathname === '/' ? '' : pathname.toLowerCase();
  for (const moduleKey of MODULE_KEYS) {
    const prefixes = MODULE_ROUTE_PREFIXES[moduleKey] ?? [];
    if (prefixes.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`))) {
      return moduleKey;
    }
  }
  return null;
}
