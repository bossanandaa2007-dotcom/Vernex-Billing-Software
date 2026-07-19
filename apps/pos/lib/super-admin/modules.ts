export const MODULE_GROUPS = [
  { label: 'Core', modules: [
    ['core', 'Core'], ['dashboard', 'Dashboard'], ['pos_billing', 'POS Billing'],
    ['products', 'Products'], ['customers', 'Customers'], ['sales_records', 'Sales Records'],
  ] },
  { label: 'Inventory', modules: [
    ['inventory', 'Inventory'], ['inventory_ledger', 'Inventory Ledger'],
    ['stock_adjustment', 'Stock Adjustment'], ['purchase_entry', 'Purchase Entry'],
    ['suppliers', 'Suppliers'],
  ] },
  { label: 'Finance', modules: [
    ['finance', 'Finance'], ['reports', 'Reports'], ['gst_reports', 'GST Reports'],
    ['tax_settings', 'Tax Settings'], ['expense_tracking', 'Expense Tracking'],
  ] },
  { label: 'Staff', modules: [
    ['staff', 'Staff'], ['staff_management', 'Staff Management'],
    ['attendance', 'Attendance'], ['roles_permissions', 'Roles & Permissions'],
  ] },
  { label: 'Business', modules: [
    ['business', 'Business'], ['business_settings', 'Business Settings'],
    ['printer_settings', 'Printer Settings'], ['receipt_customization', 'Receipt Customization'],
  ] },
  { label: 'Advanced', modules: [
    ['advanced', 'Advanced'], ['audit_logs', 'Audit Logs'], ['analytics', 'Analytics'],
    ['multi_counter', 'Multi Counter'], ['multiple_branches', 'Multiple Branches'],
    ['barcode_support', 'Barcode Support'], ['kitchen_display', 'Kitchen Display'],
    ['customer_loyalty', 'Customer Loyalty'], ['credit_sales', 'Credit Sales'],
    ['returns_refunds', 'Returns & Refunds'], ['offline_mode', 'Offline Mode'],
  ] },
  { label: 'Support', modules: [
    ['support', 'Support Panel'],
  ] },
] as const;

export type ModuleKey = (typeof MODULE_GROUPS)[number]['modules'][number][0];
export const MODULE_KEYS = MODULE_GROUPS.flatMap((group) => group.modules.map(([key]) => key));
export const DEFAULT_MODULE_KEYS: ModuleKey[] = [
  'dashboard', 'pos_billing', 'products', 'customers', 'sales_records', 'business_settings', 'support',
];
