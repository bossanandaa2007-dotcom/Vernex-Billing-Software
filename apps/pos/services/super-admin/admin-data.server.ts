import 'server-only';
import { cache } from 'react';
import { requireSuperAdmin } from '@/lib/super-admin/auth.server';
import { createPrivilegedSupabase } from '@/lib/super-admin/supabase.server';
import type { AdminAudit, AdminBusiness, AdminCustomer, AdminUser, DashboardSnapshot } from '@/types/super-admin/admin';

// The Super Admin portal is an intentionally cross-tenant surface: it must read
// every business, owner, user, and audit record regardless of which tenant the
// signed-in admin belongs to. Tenant RLS (scoped to current_vernex_business_id())
// would otherwise collapse these listings to the admin's own business, so — once
// requireSuperAdmin() has verified the caller — reads use the privileged
// service-role client, mirroring how provisioning already writes across tenants.
const client = cache(async () => {
  await requireSuperAdmin();
  return createPrivilegedSupabase();
});

function ensure(error: { message: string } | null, fallback: string) {
  if (error) throw new Error(fallback);
}

async function businessNames(ids?: string[]) {
  const supabase = await client();
  let query = supabase.from('Business').select('id,name');
  if (ids?.length) query = query.in('id', ids);
  const { data, error } = await query;
  ensure(error, 'Unable to load business names.');
  return new Map((data ?? []).map((item) => [item.id as string, item.name as string]));
}

export async function listBusinesses({
  search = '',
  status = 'ALL',
  page = 1,
  pageSize = 10,
}: {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
} = {}) {
  const supabase = await client();
  const from = (page - 1) * pageSize;
  let query = supabase
    .from('Business')
    .select('id,name,country,subscriptionStatus,planName,trialStartedAt,trialEndsAt,createdAt,updatedAt', { count: 'exact' })
    .order('createdAt', { ascending: false })
    .range(from, from + pageSize - 1);
  if (search) query = query.ilike('name', `%${search}%`);
  if (status !== 'ALL') query = query.eq('subscriptionStatus', status);
  const { data: businesses, error, count } = await query;
  ensure(error, 'Unable to load businesses.');

  const ids = (businesses ?? []).map((item) => item.id as string);
  const { data: owners, error: ownerError } = ids.length
    ? await supabase
        .from('StaffProfile')
        .select('businessId,name,email,phone,lastLoginAt')
        .in('businessId', ids)
        .eq('role', 'OWNER')
        .order('createdAt', { ascending: true })
    : { data: [], error: null };
  ensure(ownerError, 'Unable to load business owners.');
  const ownerMap = new Map<string, Record<string, unknown>>();
  for (const owner of owners ?? []) {
    if (!ownerMap.has(owner.businessId as string)) ownerMap.set(owner.businessId as string, owner);
  }
  const rows: AdminBusiness[] = (businesses ?? []).map((business) => {
    const owner = ownerMap.get(business.id as string);
    return {
      ...(business as Omit<AdminBusiness, 'ownerName' | 'ownerEmail' | 'ownerPhone' | 'lastLoginAt'>),
      ownerName: String(owner?.name ?? 'Owner unavailable'),
      ownerEmail: String(owner?.email ?? ''),
      ownerPhone: String(owner?.phone ?? ''),
      lastLoginAt: owner?.lastLoginAt ? String(owner.lastLoginAt) : null,
    };
  });
  return { rows, count: count ?? 0, page, pageSize };
}

export async function getBusiness(id: string) {
  const supabase = await client();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const weekStart = new Date(now.getTime() - 6 * 86_400_000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const [businessResult, ownerResult, ...counts] = await Promise.all([
    supabase
      .from('Business')
      .select('id,name,country,subscriptionStatus,planName,trialStartedAt,trialEndsAt,createdAt,updatedAt')
      .eq('id', id)
      .single(),
    supabase
      .from('StaffProfile')
      .select('name,email,phone,lastLoginAt')
      .eq('businessId', id)
      .eq('role', 'OWNER')
      .order('createdAt', { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase.from('ProductStock').select('*', { count: 'exact', head: true }).eq('businessId', id),
    supabase.from('Customer').select('*', { count: 'exact', head: true }).eq('businessId', id),
    supabase.from('Transaction').select('*', { count: 'exact', head: true }).eq('businessId', id).eq('isComplete', true),
    supabase.from('SaleReturn').select('*', { count: 'exact', head: true }).eq('businessId', id),
    supabase.from('StaffProfile').select('*', { count: 'exact', head: true }).eq('businessId', id),
  ]);
  const { data: business, error } = businessResult;
  ensure(error, 'Unable to load this business.');
  const { data: owner } = ownerResult;
  const { data: sales } = await supabase
    .from('Transaction')
    .select('totalAmount,completedAt')
    .eq('businessId', id)
    .eq('isComplete', true)
    .gte('completedAt', monthStart.toISOString());
  const sumSince = (date: Date) => (sales ?? [])
    .filter((sale) => sale.completedAt && new Date(sale.completedAt as string) >= date)
    .reduce((sum, sale) => sum + Number(sale.totalAmount ?? 0), 0);
  return {
    business: {
      ...(business as Omit<AdminBusiness, 'ownerName' | 'ownerEmail' | 'ownerPhone' | 'lastLoginAt'>),
      ownerName: owner?.name ?? 'Owner unavailable',
      ownerEmail: owner?.email ?? '',
      ownerPhone: owner?.phone ?? '',
      lastLoginAt: owner?.lastLoginAt ?? null,
    } as AdminBusiness,
    metrics: {
      todaySales: (sales ?? []).filter((sale) => String(sale.completedAt).startsWith(today)).reduce((sum, sale) => sum + Number(sale.totalAmount ?? 0), 0),
      weeklySales: sumSince(weekStart),
      monthlySales: sumSince(monthStart),
      products: counts[0].count ?? 0,
      customers: counts[1].count ?? 0,
      orders: counts[2].count ?? 0,
      returns: counts[3].count ?? 0,
      staff: counts[4].count ?? 0,
    },
  };
}

export async function listUsers(search = '') {
  const supabase = await client();
  let query = supabase
    .from('StaffProfile')
    .select('id,businessId,userId,name,email,phone,role,status,lastLoginAt')
    .order('createdAt', { ascending: false })
    .limit(200);
  if (search) query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,userId.ilike.%${search}%`);
  const { data, error } = await query;
  ensure(error, 'Unable to load users.');
  const names = await businessNames([...new Set((data ?? []).map((item) => item.businessId as string))]);
  return (data ?? []).map((item) => ({
    ...item,
    businessName: names.get(item.businessId as string) ?? 'Unknown business',
  })) as AdminUser[];
}

export async function listAuditLogs({
  search = '',
  businessId = '',
  module = '',
  user = '',
  action = '',
  from = '',
  to = '',
}: {
  search?: string;
  businessId?: string;
  module?: string;
  user?: string;
  action?: string;
  from?: string;
  to?: string;
} = {}) {
  const supabase = await client();
  let query = supabase
    .from('AuditLog')
    .select('id,businessId,userNameSnapshot,roleSnapshot,action,entityType,description,createdAt')
    .order('createdAt', { ascending: false })
    .limit(250);
  if (search) query = query.or(`description.ilike.%${search}%,userNameSnapshot.ilike.%${search}%,action.ilike.%${search}%`);
  if (businessId) query = query.eq('businessId', businessId);
  if (module) query = query.eq('entityType', module);
  if (user) query = query.ilike('userNameSnapshot', `%${user}%`);
  if (action) query = query.ilike('action', `%${action}%`);
  if (from) query = query.gte('createdAt', `${from}T00:00:00.000Z`);
  if (to) query = query.lte('createdAt', `${to}T23:59:59.999Z`);
  const { data, error } = await query;
  ensure(error, 'Unable to load audit logs.');
  const names = await businessNames([...new Set((data ?? []).map((item) => item.businessId as string))]);
  return (data ?? []).map((item) => ({
    ...item,
    roleSnapshot: String(item.action).startsWith('SUPER_ADMIN_') ? 'SUPER ADMIN' : item.roleSnapshot,
    businessName: names.get(item.businessId as string) ?? 'Unknown business',
  })) as AdminAudit[];
}

export async function getDashboard(businessId?: string): Promise<DashboardSnapshot> {
  const supabase = await client();
  const scoped = Boolean(businessId);
  const { rows: allBusinesses } = await listBusinesses({ pageSize: 500 });
  const businesses = scoped ? allBusinesses.filter((item) => item.id === businessId) : allBusinesses;

  let salesQuery = supabase.from('Transaction').select('id,businessId,totalAmount,completedAt').eq('isComplete', true);
  let productsQuery = supabase.from('ProductStock').select('*', { count: 'exact', head: true });
  let customersQuery = supabase.from('Customer').select('*', { count: 'exact', head: true });
  let staffQuery = supabase.from('StaffProfile').select('*', { count: 'exact', head: true });
  if (businessId) {
    salesQuery = salesQuery.eq('businessId', businessId);
    productsQuery = productsQuery.eq('businessId', businessId);
    customersQuery = customersQuery.eq('businessId', businessId);
    staffQuery = staffQuery.eq('businessId', businessId);
  }
  const [
    { data: sales, error: salesError },
    products,
    customers,
    staff,
    recentActivity,
  ] = await Promise.all([
    salesQuery,
    productsQuery,
    customersQuery,
    staffQuery,
    listAuditLogs(businessId ? { businessId } : {}),
  ]);
  ensure(salesError, 'Unable to load platform sales.');
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const totalSales = (sales ?? []).reduce((sum, item) => sum + Number(item.totalAmount ?? 0), 0);
  const todaySales = (sales ?? []).filter((item) => String(item.completedAt).startsWith(today)).reduce((sum, item) => sum + Number(item.totalAmount ?? 0), 0);
  const monthlyRevenue = (sales ?? []).filter((item) => item.completedAt && new Date(item.completedAt as string) >= monthStart).reduce((sum, item) => sum + Number(item.totalAmount ?? 0), 0);

  const dailySales = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now);
    date.setDate(date.getDate() - (6 - index));
    const key = date.toISOString().slice(0, 10);
    return {
      label: date.toLocaleDateString('en-IN', { weekday: 'short' }),
      value: (sales ?? []).filter((item) => String(item.completedAt).startsWith(key)).reduce((sum, item) => sum + Number(item.totalAmount ?? 0), 0),
    };
  });
  const monthly = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    return {
      label: date.toLocaleDateString('en-IN', { month: 'short' }),
      value: (sales ?? []).filter((item) => String(item.completedAt).startsWith(key)).reduce((sum, item) => sum + Number(item.totalAmount ?? 0), 0),
    };
  });
  const growth = monthly.map((month) => ({
    label: month.label,
    value: businesses.filter((business) => String(business.createdAt).slice(0, 7) <= `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`).length,
  }));
  return {
    totals: {
      businesses: businesses.length,
      activeBusinesses: businesses.filter((item) => item.subscriptionStatus === 'ACTIVE').length,
      trialBusinesses: businesses.filter((item) => item.subscriptionStatus === 'TRIAL').length,
      expiredBusinesses: businesses.filter((item) => ['EXPIRED', 'SUSPENDED'].includes(item.subscriptionStatus)).length,
      totalSales,
      todaySales,
      monthlyRevenue,
      orders: sales?.length ?? 0,
      products: products.count ?? 0,
      customers: customers.count ?? 0,
      staff: staff.count ?? 0,
    },
    dailySales,
    monthlyRevenue: monthly,
    businessGrowth: growth,
    recentBusinesses: businesses.slice(0, 5),
    recentActivity: recentActivity.slice(0, 6),
  };
}

export async function listBusinessOptions() {
  const supabase = await client();
  const { data, error } = await supabase.from('Business').select('id,name').order('name', { ascending: true });
  ensure(error, 'Unable to load businesses.');
  return (data ?? []) as { id: string; name: string }[];
}

export async function getTrials() {
  const { rows } = await listBusinesses({ pageSize: 500 });
  return rows.map((business) => {
    const end = business.trialEndsAt ? new Date(business.trialEndsAt) : null;
    const daysRemaining = end ? Math.max(0, Math.ceil((end.getTime() - Date.now()) / 86_400_000)) : 0;
    return { ...business, daysRemaining };
  });
}

export async function globalSearch(query: string) {
  if (!query.trim()) return { businesses: [], users: [] };
  const [businesses, users, allBusinesses] = await Promise.all([
    listBusinesses({ search: query, pageSize: 8 }),
    listUsers(query),
    listBusinesses({ pageSize: 500 }),
  ]);
  const matchingBusinessIds = new Set(users.map((user) => user.businessId));
  const combined = [...businesses.rows];
  for (const business of allBusinesses.rows) {
    if (matchingBusinessIds.has(business.id) && !combined.some((item) => item.id === business.id)) combined.push(business);
  }
  return { businesses: combined.slice(0, 8), users: users.slice(0, 8) };
}

export async function listBusinessCustomers(businessId: string, search = '') {
  const supabase = await client();
  let query = supabase
    .from('Customer')
    .select('id,businessId,name,phone,email,address,taxId,country,isActive,createdAt')
    .eq('businessId', businessId)
    .order('createdAt', { ascending: false })
    .limit(200);
  if (search) query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,taxId.ilike.%${search}%`);
  const { data, error } = await query;
  ensure(error, 'Unable to load customers.');
  const ids = (data ?? []).map((item) => item.id as string);
  const { data: sales, error: salesError } = ids.length
    ? await supabase.from('Transaction').select('customerId,totalAmount,refundedAmount').eq('businessId', businessId).eq('isComplete', true).in('customerId', ids)
    : { data: [], error: null };
  ensure(salesError, 'Unable to load customer sales.');
  return (data ?? []).map((customer) => {
    const customerSales = (sales ?? []).filter((sale) => sale.customerId === customer.id);
    return {
      ...customer,
      transactionCount: customerSales.length,
      totalSpent: customerSales.reduce((sum, sale) => sum + Number(sale.totalAmount ?? 0) - Number(sale.refundedAmount ?? 0), 0),
    };
  }) as AdminCustomer[];
}

export async function getBusinessCustomer(businessId: string, customerId: string) {
  const customers = await listBusinessCustomers(businessId);
  const customer = customers.find((item) => item.id === customerId);
  if (!customer) throw new Error('Customer not found.');
  const supabase = await client();
  const { data: sales, error } = await supabase
    .from('Transaction')
    .select('id,billNumber,totalAmount,refundedAmount,paymentMethod,paymentStatus,completedAt')
    .eq('businessId', businessId)
    .eq('customerId', customerId)
    .eq('isComplete', true)
    .order('completedAt', { ascending: false });
  ensure(error, 'Unable to load customer purchase history.');
  return { customer, sales: sales ?? [] };
}

// ---------------------------------------------------------------------------
// Support Panel
// ---------------------------------------------------------------------------
export type SupportTicketRow = {
  id: string;
  businessId: string;
  businessName: string;
  subject: string;
  status: string;
  priority: string;
  createdByName: string;
  createdByEmail: string;
  lastMessageAt: string;
  lastMessageFrom: string;
  unreadForAdmin: boolean;
  createdAt: string;
};

export type SupportMessageRow = {
  id: string;
  senderType: string;
  senderName: string;
  body: string;
  createdAt: string;
};

export async function listSupportTickets({ status = 'ALL', search = '' }: { status?: string; search?: string } = {}) {
  const supabase = await client();
  let query = supabase
    .from('support_tickets')
    .select('id, businessId, subject, status, priority, createdByName, createdByEmail, lastMessageAt, lastMessageFrom, unreadForAdmin, createdAt')
    .order('lastMessageAt', { ascending: false })
    .limit(300);
  if (status !== 'ALL') query = query.eq('status', status);
  if (search) query = query.or(`subject.ilike.%${search}%,createdByEmail.ilike.%${search}%,createdByName.ilike.%${search}%`);
  const { data, error } = await query;
  ensure(error, 'Unable to load support tickets.');
  const names = await businessNames([...new Set((data ?? []).map((item) => item.businessId as string))]);
  return (data ?? []).map((item) => ({
    ...item,
    businessName: names.get(item.businessId as string) ?? 'Unknown business',
  })) as SupportTicketRow[];
}

export async function getSupportTicket(id: string) {
  const supabase = await client();
  const { data: ticket, error } = await supabase
    .from('support_tickets')
    .select('id, businessId, subject, status, priority, createdByName, createdByEmail, lastMessageAt, lastMessageFrom, createdAt')
    .eq('id', id)
    .maybeSingle();
  ensure(error, 'Unable to load this ticket.');
  if (!ticket) throw new Error('Ticket not found.');
  const { data: messages, error: messagesError } = await supabase
    .from('support_messages')
    .select('id, senderType, senderName, body, createdAt')
    .eq('ticketId', id)
    .order('createdAt', { ascending: true });
  ensure(messagesError, 'Unable to load ticket messages.');
  const names = await businessNames([ticket.businessId as string]);
  // Opening a ticket clears its admin-unread flag.
  await supabase.from('support_tickets').update({ unreadForAdmin: false }).eq('id', id);
  return {
    ticket: { ...ticket, businessName: names.get(ticket.businessId as string) ?? 'Unknown business' } as SupportTicketRow,
    messages: (messages ?? []) as SupportMessageRow[],
  };
}

// ---------------------------------------------------------------------------
// Subscription payments
// A business pays offline and submits the reference; the admin confirms it here,
// which is what actually activates the licence.
// ---------------------------------------------------------------------------
export type SubscriptionPaymentRow = {
  id: string;
  businessId: string;
  businessName: string;
  plan: string;
  planName: string;
  amount: number;
  currency: string;
  method: string;
  reference: string;
  provider: string;
  orderId: string | null;
  paymentId: string | null;
  failureReason: string;
  payerName: string;
  note: string;
  status: string;
  reviewNote: string;
  reviewedAt: string | null;
  activatedUntil: string | null;
  submittedByName: string;
  submittedByEmail: string;
  createdAt: string;
};

export async function listSubscriptionPayments({ status = 'ALL', search = '' }: { status?: string; search?: string } = {}) {
  const supabase = await client();
  let query = supabase
    .from('subscription_payments')
    .select('id, businessId, plan, planName, amount, currency, method, reference, provider, orderId, paymentId, failureReason, payerName, note, status, reviewNote, reviewedAt, activatedUntil, submittedByName, submittedByEmail, createdAt')
    .order('createdAt', { ascending: false })
    .limit(300);
  if (status !== 'ALL') query = query.eq('status', status);
  if (search) query = query.or(`paymentId.ilike.%${search}%,orderId.ilike.%${search}%,payerName.ilike.%${search}%,submittedByEmail.ilike.%${search}%`);
  const { data, error } = await query;
  ensure(error, 'Unable to load subscription payments.');
  const names = await businessNames([...new Set((data ?? []).map((item) => item.businessId as string))]);
  return (data ?? []).map((item) => ({
    ...item,
    businessName: names.get(item.businessId as string) ?? 'Unknown business',
  })) as SubscriptionPaymentRow[];
}

// Failed gateway payments — worth surfacing because they usually mean a
// customer tried to pay and could not, which is a support issue.
export async function countFailedPayments() {
  const supabase = await client();
  const { count, error } = await supabase
    .from('subscription_payments')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'FAILED');
  if (error) return 0;
  return count ?? 0;
}

// Count of tickets awaiting an admin reply — used for the nav badge / notifications.
export async function countUnreadSupport() {
  const supabase = await client();
  const { count, error } = await supabase
    .from('support_tickets')
    .select('id', { count: 'exact', head: true })
    .eq('unreadForAdmin', true);
  if (error) return 0;
  return count ?? 0;
}
