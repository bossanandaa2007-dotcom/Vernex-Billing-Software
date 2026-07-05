export type SubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'EXPIRED' | 'SUSPENDED';

export type AdminBusiness = {
  id: string;
  name: string;
  country: string;
  subscriptionStatus: SubscriptionStatus;
  planName: string;
  trialStartedAt: string;
  trialEndsAt: string | null;
  createdAt: string;
  updatedAt: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  lastLoginAt: string | null;
};

export type AdminUser = {
  id: string;
  businessId: string;
  businessName: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  lastLoginAt: string | null;
};

export type AdminAudit = {
  id: string;
  businessId: string;
  businessName: string;
  userNameSnapshot: string;
  roleSnapshot: string;
  action: string;
  entityType: string;
  description: string;
  createdAt: string;
};

export type AdminCustomer = {
  id: string;
  businessId: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  taxId: string | null;
  country: string | null;
  isActive: boolean;
  createdAt: string;
  transactionCount: number;
  totalSpent: number;
};

export type DashboardSnapshot = {
  totals: {
    businesses: number;
    activeBusinesses: number;
    trialBusinesses: number;
    expiredBusinesses: number;
    totalSales: number;
    todaySales: number;
    monthlyRevenue: number;
    orders: number;
    products: number;
    customers: number;
    staff: number;
  };
  dailySales: Array<{ label: string; value: number }>;
  monthlyRevenue: Array<{ label: string; value: number }>;
  businessGrowth: Array<{ label: string; value: number }>;
  recentBusinesses: AdminBusiness[];
  recentActivity: AdminAudit[];
};
