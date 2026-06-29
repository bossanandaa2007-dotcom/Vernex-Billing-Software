import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();
const base = process.env.BASE_URL || 'http://localhost:3000';
const jsonHeaders = { 'content-type': 'application/json', 'x-vernex-test-role': 'OWNER' };
const assert = (condition, message) => { if (!condition) throw new Error(message); };

async function request(path, { method = 'GET', body, expected = 200, role = 'OWNER' } = {}) {
  const response = await fetch(base + path, { method, headers: { ...jsonHeaders, 'x-vernex-test-role': role }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (response.status !== expected) throw new Error(`${method} ${path}: expected ${expected}, got ${response.status}: ${JSON.stringify(data).slice(0, 300)}`);
  return data;
}

const post = (path, body, expected = 200, role = 'OWNER') => request(path, { method: 'POST', body, expected, role });
const patch = (path, body, expected = 200, role = 'OWNER') => request(path, { method: 'PATCH', body, expected, role });

async function setSubscription(status, daysFromNow = 14, planName = 'Free Trial') {
  const now = new Date();
  const trialEndsAt = new Date(now);
  trialEndsAt.setDate(trialEndsAt.getDate() + daysFromNow);
  return db.business.update({
    where: { id: 'vernex-demo-business' },
    data: {
      trialStartedAt: now,
      trialEndsAt,
      subscriptionStatus: status,
      planName,
      activatedAt: status === 'ACTIVE' ? now : null,
      suspendedAt: status === 'SUSPENDED' ? now : null,
    },
  });
}

try {
  await setSubscription('TRIAL', 14);
  const trialStatus = await request('/api/subscription');
  assert(trialStatus.subscription.isTrialActive, 'Trial should be active.');

  const trialBill = await post('/api/transactions', undefined, 201);
  await post('/api/onsale', { productId: 'COFFEE-001', transactionId: trialBill.id, qTy: 1 }, 201);
  const sale = await patch(`/api/transactions/${trialBill.id}`, { discount: 0, paymentMethod: 'CASH', amountReceived: 40 }, 200);
  assert(sale.isComplete, 'Trial business checkout failed.');

  await setSubscription('EXPIRED', -1);
  const expiredStatus = await request('/api/subscription');
  assert(expiredStatus.subscription.isTrialExpired, 'Expired status not detected.');
  await post('/api/transactions', undefined, 402);
  await post('/api/customers', { name: 'Expired Customer', phone: '+91 90000 80008' }, 402);
  await request('/api/reports/export?type=sales&preset=today', { expected: 402 });
  await request('/api/reports/sales?preset=today', { expected: 200 });
  await request(`/api/transactions/${sale.id}`, { expected: 200 });
  await request('/api/dashboard', { expected: 200 });
  await request('/api/reports/sales?preset=today', { role: 'CASHIER', expected: 403 });

  await request('/api/admin/activate-business', { method: 'POST', body: { businessId: 'vernex-demo-business' }, expected: 403 });

  await setSubscription('ACTIVE', 365, 'Manual Active');
  const activeStatus = await request('/api/subscription');
  assert(activeStatus.subscription.canUsePaidFeatures, 'Active subscription should allow paid features.');
  const activeBill = await post('/api/transactions', undefined, 201);
  await request(`/api/transactions/${activeBill.id}`, { method: 'DELETE', expected: 200 });

  await setSubscription('TRIAL', 14, 'Free Trial');
  console.log(JSON.stringify({
    ok: true,
    trialCheckout: true,
    expiredBlocksCheckout: true,
    expiredReadOnlyReports: true,
    expiredReceiptView: true,
    activeSubscriptionWorks: true,
    rolePermissionsStillWork: true,
    adminActivationProtected: true,
  }, null, 2));
} finally {
  await setSubscription('TRIAL', 14, 'Free Trial').catch(() => {});
  await db.shopData.updateMany({ where: { businessId: 'vernex-demo-business' }, data: { billPrefix: 'VNX', billPadding: 6 } }).catch(() => {});
  await db.$disconnect();
}
