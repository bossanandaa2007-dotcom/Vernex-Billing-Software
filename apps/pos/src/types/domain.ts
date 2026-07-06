export const USER_ROLES = ['OWNER', 'MANAGER', 'CASHIER', 'WORKER', 'UNKNOW'] as const;
export type UserRole = (typeof USER_ROLES)[number];
export const UserRole = Object.fromEntries(USER_ROLES.map((value) => [value, value])) as Record<UserRole, UserRole>;

export const STAFF_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
export type StaffStatus = (typeof STAFF_STATUSES)[number];
export const StaffStatus = Object.fromEntries(STAFF_STATUSES.map((value) => [value, value])) as Record<StaffStatus, StaffStatus>;

export const PRODUCT_CATEGORIES = ['ELECTRO', 'DRINK', 'FOOD', 'FASHION', 'STATIONERY'] as const;
export type CatProduct = (typeof PRODUCT_CATEGORIES)[number];
export const CatProduct = Object.fromEntries(PRODUCT_CATEGORIES.map((value) => [value, value])) as Record<CatProduct, CatProduct>;

export const PAYMENT_METHODS = ['CASH', 'UPI', 'CARD', 'CREDIT', 'ONLINE'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export const PaymentMethod = Object.fromEntries(PAYMENT_METHODS.map((value) => [value, value])) as Record<PaymentMethod, PaymentMethod>;

export const PAYMENT_STATUSES = ['PAID', 'PENDING', 'PARTIAL'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export const PaymentStatus = Object.fromEntries(PAYMENT_STATUSES.map((value) => [value, value])) as Record<PaymentStatus, PaymentStatus>;

export const TAX_MODES = ['GST', 'VAT', 'SALES_TAX', 'TAX', 'NONE'] as const;
export type TaxMode = (typeof TAX_MODES)[number];
export const TaxMode = Object.fromEntries(TAX_MODES.map((value) => [value, value])) as Record<TaxMode, TaxMode>;

export const RETURN_STATUSES = ['PARTIAL', 'RETURNED'] as const;
export type ReturnStatus = (typeof RETURN_STATUSES)[number];
export const ReturnStatus = Object.fromEntries(RETURN_STATUSES.map((value) => [value, value])) as Record<ReturnStatus, ReturnStatus>;

export type SubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'EXPIRED' | 'SUSPENDED';
export const SubscriptionStatus: Record<SubscriptionStatus, SubscriptionStatus> = {
  TRIAL: 'TRIAL',
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
  SUSPENDED: 'SUSPENDED',
};

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
