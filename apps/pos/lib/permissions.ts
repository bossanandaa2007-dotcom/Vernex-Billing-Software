import { UserRole } from '@prisma/client';

export type Permission =
  | 'DASHBOARD_VIEW'
  | 'POS_BILLING'
  | 'PRODUCT_WRITE'
  | 'CUSTOMER_WRITE'
  | 'INVENTORY_VIEW'
  | 'STOCK_ADJUST'
  | 'RETURNS_MANAGE'
  | 'RECORDS_VIEW'
  | 'REPORTS_VIEW'
  | 'SETTINGS_WRITE'
  | 'BILL_SETTINGS_WRITE'
  | 'RECEIPT_SETTINGS_WRITE'
  | 'STAFF_MANAGE'
  | 'AUDIT_VIEW';

const rolePermissions: Record<UserRole, Permission[]> = {
  OWNER: [
    'DASHBOARD_VIEW',
    'POS_BILLING',
    'PRODUCT_WRITE',
    'CUSTOMER_WRITE',
    'INVENTORY_VIEW',
    'STOCK_ADJUST',
    'RETURNS_MANAGE',
    'RECORDS_VIEW',
    'REPORTS_VIEW',
    'SETTINGS_WRITE',
    'BILL_SETTINGS_WRITE',
    'RECEIPT_SETTINGS_WRITE',
    'STAFF_MANAGE',
    'AUDIT_VIEW',
  ],
  MANAGER: [
    'DASHBOARD_VIEW',
    'POS_BILLING',
    'PRODUCT_WRITE',
    'CUSTOMER_WRITE',
    'INVENTORY_VIEW',
    'STOCK_ADJUST',
    'RETURNS_MANAGE',
    'RECORDS_VIEW',
    'REPORTS_VIEW',
  ],
  CASHIER: ['POS_BILLING', 'CUSTOMER_WRITE', 'RECORDS_VIEW'],
  WORKER: ['POS_BILLING'],
  UNKNOW: [],
};

export function hasPermission(role: UserRole, permission: Permission) {
  return rolePermissions[role]?.includes(permission) ?? false;
}

export function isRoleAllowed(role: UserRole, roles: UserRole[]) {
  return roles.includes(role);
}

