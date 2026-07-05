import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();
const baseUrl = process.env.MASTER_TEST_URL || 'http://localhost:3001';
const suffix = Date.now();
const businessA = `master-a-${suffix}`;
const businessB = `master-b-${suffix}`;

function assert(condition, message, details) {
  if (!condition) throw new Error(`${message}${details === undefined ? '' : `: ${JSON.stringify(details)}`}`);
}

function headers(businessId) {
  return {
    'x-vernex-test-role': 'OWNER',
    'x-vernex-test-business': businessId,
    'content-type': 'application/json',
  };
}

async function request(path, businessId, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { ...headers(businessId), ...(options.headers ?? {}) },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const data = await response.json();
  return { status: response.status, data };
}

async function createBusiness(id, name, status = 'TRIAL') {
  const now = new Date();
  await db.business.create({
    data: {
      id,
      name,
      ownerUserId: `owner-${id}`,
      subscriptionStatus: status,
      trialStartedAt: now,
      trialEndsAt: status === 'TRIAL' ? new Date(now.getTime() + 7 * 86_400_000) : new Date(now.getTime() - 86_400_000),
      planName: status === 'TRIAL' ? 'Integration Trial' : 'Expired',
      shopData: { create: { name, country: 'India', currency: 'INR', taxMode: 'GST', tax: 5 } },
      billSequences: { create: { id, nextNumber: 1 } },
    },
  });
}

async function cleanup() {
  await db.business.deleteMany({ where: { id: { in: [businessA, businessB] } } });
}

try {
  await createBusiness(businessA, 'Master Tenant A');
  await createBusiness(businessB, 'Master Tenant B', 'EXPIRED');
  const productA = await db.productStock.create({
    data: { id: `MASTER-A-${suffix}`, businessId: businessA, name: 'Tenant A Product', price: 10, stock: 20, cat: 'FOOD', Product: { create: { sellprice: 20 } } },
  });
  const productB = await db.productStock.create({
    data: { id: `MASTER-B-${suffix}`, businessId: businessB, name: 'Tenant B Product', price: 15, stock: 30, cat: 'DRINK', Product: { create: { sellprice: 30 } } },
  });
  await db.customer.create({ data: { businessId: businessA, name: 'Tenant A Customer', phone: '9000011111' } });
  await db.customer.create({ data: { businessId: businessB, name: 'Tenant B Customer', phone: '9000022222' } });

  const [storageA, storageB, customersA, customersB] = await Promise.all([
    request('/api/storage', businessA),
    request('/api/storage', businessB),
    request('/api/customers', businessA),
    request('/api/customers', businessB),
  ]);
  assert(storageA.status === 200 && storageA.data.length === 1 && storageA.data[0].id === productA.id, 'Tenant A product isolation failed', storageA);
  assert(storageB.status === 200 && storageB.data.length === 1 && storageB.data[0].id === productB.id, 'Tenant B product isolation failed', storageB);
  assert(customersA.status === 200 && customersA.data.length === 1 && customersA.data[0].name === 'Tenant A Customer', 'Tenant A customer isolation failed', customersA);
  assert(customersB.status === 200 && customersB.data.length === 1 && customersB.data[0].name === 'Tenant B Customer', 'Tenant B customer isolation failed', customersB);

  const billA = await request('/api/transactions', businessA, { method: 'POST' });
  assert(billA.status === 201, 'Tenant A could not start a bill', billA);
  const crossProduct = await request('/api/onsale', businessA, {
    method: 'POST',
    body: { transactionId: billA.data.id, productId: productB.id, qTy: 1 },
  });
  assert(crossProduct.status === 404, 'Cross-business product was accepted', crossProduct);

  const expiredBill = await request('/api/transactions', businessB, { method: 'POST' });
  assert(expiredBill.status === 402, 'Expired tenant was allowed to start billing', expiredBill);

  let nullRejected = false;
  try {
    await db.$executeRawUnsafe(`INSERT INTO "Customer" ("id","name","phone","isActive","createdAt","updatedAt") VALUES ('master-null-${suffix}','Invalid Tenant','0',true,NOW(),NOW())`);
  } catch {
    nullRejected = true;
  }
  assert(nullRejected, 'Database accepted a customer without business ownership');

  const policies = await db.$queryRawUnsafe(`SELECT count(*)::int AS count FROM pg_policies WHERE schemaname='public' AND policyname LIKE 'vernex_%'`);
  assert(Number(policies[0]?.count ?? 0) >= 26, 'RLS policy coverage is incomplete', policies);

  console.log(JSON.stringify({
    success: true,
    checks: {
      productIsolation: true,
      customerIsolation: true,
      crossBusinessBillingBlocked: true,
      expiredTrialBlocked: true,
      nonNullOwnershipEnforced: true,
      rlsPoliciesPresent: true,
    },
  }, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await cleanup();
  const remaining = await db.business.count({ where: { id: { in: [businessA, businessB] } } });
  console.log(`CLEANUP remaining temporary businesses: ${remaining}`);
  await db.$disconnect();
}
