import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();
const baseUrl = process.env.PHASE5_BASE_URL || 'http://localhost:3001';
const businessId = `phase5-${Date.now()}`;
const results = [];

const approx = (actual, expected, tolerance = 0.01) =>
  Math.abs(Number(actual) - Number(expected)) <= tolerance;

function assert(condition, message, details) {
  if (!condition) {
    throw new Error(`${message}${details === undefined ? '' : `: ${JSON.stringify(details)}`}`);
  }
}

function record(name, details = 'passed') {
  results.push({ name, details });
  console.log(`PASS ${name}`);
}

function headers(role, json = false) {
  return {
    'x-vernex-test-role': role,
    'x-vernex-test-business': businessId,
    ...(json ? { 'content-type': 'application/json' } : {}),
  };
}

async function request(path, { role = 'OWNER', method = 'GET', body, expected } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: headers(role, body !== undefined),
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  });
  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await response.json()
    : await response.text();
  if (expected !== undefined) {
    const statuses = Array.isArray(expected) ? expected : [expected];
    assert(statuses.includes(response.status), `${method} ${path} returned ${response.status}`, data);
  }
  return { response, data };
}

async function addProduct(name, buyPrice, sellPrice, stockProduct, category) {
  const { data } = await request('/api/product', {
    method: 'POST',
    body: { productName: name, buyPrice, sellPrice, stockProduct, category },
    expected: 201,
  });
  return data;
}

async function startBill(role = 'OWNER') {
  return (await request('/api/transactions', { role, method: 'POST', expected: 201 })).data;
}

async function addLine(transactionId, productId, quantity, role = 'OWNER') {
  return (await request('/api/onsale', {
    role,
    method: 'POST',
    body: { transactionId, productId, qTy: quantity },
    expected: 201,
  })).data;
}

async function completeBill(transactionId, body, role = 'OWNER') {
  return (await request(`/api/transactions/${transactionId}`, {
    role,
    method: 'PATCH',
    body,
    expected: 200,
  })).data;
}

async function prepareBusiness() {
  const now = new Date();
  const trialEndsAt = new Date(now.getTime() + 7 * 86_400_000);
  await db.business.create({
    data: {
      id: businessId,
      name: 'Phase 5 Verification Shop',
      country: 'India',
      currency: 'INR',
      taxMode: 'GST',
      ownerUserId: 'vernex-test-owner',
      trialStartedAt: now,
      trialEndsAt,
      subscriptionStatus: 'TRIAL',
      planName: 'Phase 5 Trial',
      shopData: {
        create: {
          name: 'Phase 5 Verification Shop',
          tax: 5,
          country: 'India',
          currency: 'INR',
          taxMode: 'GST',
          taxId: '33ABCDE1234F1Z5',
          showCustomerDetails: true,
          showItemTax: true,
          showBusinessLogo: true,
          showFooter: true,
          billPrefix: 'P5',
          billPadding: 5,
        },
      },
      billSequences: {
        create: { id: businessId, nextNumber: 1 },
      },
    },
  });
}

async function runTeaShopFlow() {
  const tea = await addProduct('Tea', 5, 10, 100, 'DRINK');
  const coffee = await addProduct('Coffee', 12, 20, 80, 'DRINK');
  const samosa = await addProduct('Samosa', 8, 15, 60, 'FOOD');

  const before = (await request('/api/dashboard?period=today', { expected: 200 })).data;
  const bill = await startBill();
  const teaLine = await addLine(bill.id, tea.id, 1);
  await request(`/api/onsale/${teaLine.id}`, {
    method: 'PATCH',
    body: { qTy: 2 },
    expected: 200,
  });
  await addLine(bill.id, coffee.id, 1);
  await addLine(bill.id, samosa.id, 3);

  const sale = await completeBill(bill.id, {
    discount: 0,
    paymentMethod: 'UPI',
    amountReceived: 89.25,
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    customerAddress: '',
    customerTaxId: '',
    customerId: '',
  });

  assert(approx(sale.subtotal, 85), 'Tea sale subtotal mismatch', sale.subtotal);
  assert(approx(sale.taxAmount, 4.25), 'Tea sale GST mismatch', sale.taxAmount);
  assert(approx(sale.totalAmount, 89.25), 'Tea sale total mismatch', sale.totalAmount);
  assert(sale.paymentMethod === 'UPI' && sale.paymentStatus === 'PAID', 'UPI payment was not saved');
  assert(!sale.customerId && !sale.customerName, 'Walk-in sale unexpectedly has a customer');
  assert(sale.billNumber?.startsWith('P5-'), 'Bill number was not generated', sale.billNumber);

  const stocks = await db.productStock.findMany({
    where: { id: { in: [tea.id, coffee.id, samosa.id] } },
    select: { id: true, stock: true },
  });
  const stockMap = Object.fromEntries(stocks.map((item) => [item.id, item.stock]));
  assert(stockMap[tea.id] === 98, 'Tea stock mismatch', stockMap);
  assert(stockMap[coffee.id] === 79, 'Coffee stock mismatch', stockMap);
  assert(stockMap[samosa.id] === 57, 'Samosa stock mismatch', stockMap);

  const movements = await db.inventoryMovement.findMany({
    where: { businessId, referenceId: bill.id, movementType: 'SALE' },
  });
  assert(movements.length === 3, 'Expected one sale movement per product', movements.length);
  assert(movements.reduce((sum, item) => sum + item.quantityChange, 0) === -6, 'Sale movement quantity mismatch');

  const dashboard = (await request('/api/dashboard?period=today', { expected: 200 })).data;
  assert(dashboard.todayBills === before.todayBills + 1, 'Dashboard bill count did not update', dashboard);
  assert(approx(dashboard.todayRevenue, before.todayRevenue + 89.25), 'Dashboard revenue did not update', dashboard);
  assert(dashboard.itemsSold === before.itemsSold + 6, 'Dashboard item count did not update', dashboard);

  const persisted = (await request(`/api/transactions/${bill.id}`, { expected: 200 })).data.transaction;
  assert(persisted.isComplete && persisted.products.length === 3, 'Completed sale did not persist');

  const report = (await request('/api/reports/sales?preset=today', { expected: 200 })).data;
  assert(report.sales.some((item) => item.billNumber === sale.billNumber), 'Sale missing from sales report');

  const unavailable = await startBill();
  const tooMany = await request('/api/onsale', {
    method: 'POST',
    body: { transactionId: unavailable.id, productId: tea.id, qTy: 9999 },
    expected: 409,
  });
  assert(/available|stock/i.test(JSON.stringify(tooMany.data)), 'Insufficient stock message is not friendly', tooMany.data);
  await request(`/api/transactions/${unavailable.id}`, { method: 'DELETE', expected: 200 });

  record('Tea shop billing, receipt data, stock, ledger, dashboard, records, and persistence');
  return { tea, coffee, samosa, sale };
}

async function runRetailFlow() {
  const customer = (await request('/api/customers', {
    method: 'POST',
    body: {
      name: 'Phase Five Retail Customer',
      phone: '+91 90000 12345',
      email: 'phase5.customer@example.com',
      address: 'Chennai',
      taxId: '33ABCDE1234F1Z5',
      country: 'India',
      notes: 'Phase 5 verification customer',
    },
    expected: 201,
  })).data;
  const notebook = await addProduct('Notebook', 30, 50, 40, 'STATIONERY');
  const pen = await addProduct('Pen', 5, 10, 100, 'STATIONERY');
  const bill = await startBill();
  await addLine(bill.id, notebook.id, 2);
  await addLine(bill.id, pen.id, 3);
  const sale = await completeBill(bill.id, {
    discount: 5,
    paymentMethod: 'CASH',
    amountReceived: 150,
    customerId: customer.id,
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    customerAddress: '',
    customerTaxId: '',
  });

  assert(approx(sale.subtotal, 130), 'Retail subtotal mismatch', sale.subtotal);
  assert(approx(sale.taxAmount, 6.5), 'Retail GST mismatch', sale.taxAmount);
  assert(approx(sale.discount, 5), 'Retail discount mismatch', sale.discount);
  assert(approx(sale.totalAmount, 131.5), 'Retail total mismatch', sale.totalAmount);
  assert(approx(sale.changeAmount, 18.5), 'Cash change mismatch', sale.changeAmount);
  assert(sale.customerId === customer.id, 'Customer was not linked to sale');
  assert(sale.customerName === customer.name && sale.customerTaxId === customer.taxId, 'Receipt customer snapshot mismatch');

  const customerDetail = (await request(`/api/customers/${customer.id}`, { expected: 200 })).data;
  assert(customerDetail.transactions.some((item) => item.id === bill.id), 'Customer purchase history missing sale');
  const search = (await request('/api/customers?q=Phase%20Five', { expected: 200 })).data;
  assert(search.some((item) => item.id === customer.id), 'Customer search failed');

  const csvResult = await request('/api/reports/export?type=sales&preset=today', { expected: 200 });
  const disposition = csvResult.response.headers.get('content-disposition') || '';
  assert(csvResult.response.headers.get('content-type')?.includes('text/csv'), 'Sales export is not CSV');
  assert(disposition.includes('vernex-sales-'), 'CSV filename is missing', disposition);
  assert(csvResult.data.includes(sale.billNumber), 'CSV does not contain the retail bill');
  assert(csvResult.data.includes(customer.name), 'CSV does not contain customer details');
  assert(csvResult.data.split(/\r?\n/).length >= 3, 'CSV does not contain both sales');

  record('Customer billing, discount, GST, cash change, receipt snapshot, history, search, and CSV');
  return { customer, notebook, pen, sale };
}

async function runReturnFlow(retail) {
  const notebookLine = retail.sale.products.find((item) => item.productId === retail.notebook.id);
  assert(notebookLine, 'Notebook line missing from completed sale');
  const stockBefore = await db.productStock.findUnique({ where: { id: retail.notebook.id } });
  const priorReturns = await db.inventoryMovement.count({
    where: { businessId, productId: retail.notebook.id, movementType: 'RETURN' },
  });
  const result = (await request('/api/returns', {
    method: 'POST',
    body: {
      transactionId: retail.sale.id,
      refundMethod: 'CASH',
      reason: 'Phase 5 partial customer return',
      items: [{ saleLineId: notebookLine.id, quantity: 1 }],
    },
    expected: 201,
  })).data;

  const expectedRefund = ((Number(notebookLine.lineTotal) / retail.sale.products.reduce((sum, item) => sum + Number(item.lineTotal), 0)) * Number(retail.sale.totalAmount)) / notebookLine.quantity;
  assert(approx(result.refundAmount, expectedRefund), 'Refund allocation mismatch', { actual: result.refundAmount, expectedRefund });

  const stockAfter = await db.productStock.findUnique({ where: { id: retail.notebook.id } });
  assert(stockAfter.stock === stockBefore.stock + 1, 'Returned stock was not restored');
  const returnMovements = await db.inventoryMovement.findMany({
    where: { businessId, productId: retail.notebook.id, movementType: 'RETURN' },
  });
  assert(returnMovements.length === priorReturns + 1, 'Return ledger movement missing or duplicated');
  assert(returnMovements.at(-1)?.quantityChange === 1, 'Return ledger quantity mismatch');

  const saleAfter = await db.transaction.findUnique({ where: { id: retail.sale.id } });
  assert(saleAfter.returnStatus === 'PARTIAL', 'Sale was not marked partially returned', saleAfter.returnStatus);
  assert(approx(saleAfter.refundedAmount, expectedRefund), 'Sale refunded amount mismatch');

  const dashboard = (await request('/api/dashboard?period=today', { expected: 200 })).data;
  assert(dashboard.returnsToday === 1, 'Dashboard return count mismatch', dashboard);
  assert(approx(dashboard.refundTotalToday, expectedRefund), 'Dashboard refund total mismatch', dashboard);
  assert(approx(dashboard.netRevenueToday, dashboard.todayRevenue - expectedRefund), 'Dashboard net revenue mismatch', dashboard);

  record('Partial return, refund allocation, stock restoration, ledger, status, and dashboard consistency');
}

async function runRoleFlow() {
  const cashierBill = await startBill('CASHIER');
  await request(`/api/transactions/${cashierBill.id}`, { role: 'CASHIER', method: 'DELETE', expected: 200 });
  await request('/api/reports/sales?preset=today', { role: 'CASHIER', expected: 403 });
  await request('/api/shopdata', { role: 'CASHIER', method: 'POST', body: { storeName: 'Blocked' }, expected: 403 });
  await request('/api/inventory-ledger', { role: 'CASHIER', method: 'POST', body: { productId: 'none', newStock: 1, reason: 'Blocked check' }, expected: 403 });
  await request('/api/audit-logs', { role: 'CASHIER', expected: 403 });
  await request('/api/dashboard', { role: 'CASHIER', expected: 403 });

  await request('/api/storage', { role: 'MANAGER', expected: 200 });
  await request('/api/inventory-ledger', { role: 'MANAGER', expected: 200 });
  await request('/api/reports/sales?preset=today', { role: 'MANAGER', expected: 200 });
  await request('/api/returns', { role: 'MANAGER', method: 'POST', body: {}, expected: 400 });
  await request('/api/staff', { role: 'MANAGER', expected: 403 });
  await request('/api/audit-logs', { role: 'MANAGER', expected: 403 });
  await request('/api/shopdata', { role: 'MANAGER', method: 'POST', body: { storeName: 'Blocked' }, expected: 403 });

  const ownerChecks = [
    '/api/dashboard',
    '/api/storage',
    '/api/customers',
    '/api/inventory-ledger',
    '/api/reports/sales?preset=today',
    '/api/staff',
    '/api/audit-logs',
    '/api/shopdata',
  ];
  for (const path of ownerChecks) await request(path, { role: 'OWNER', expected: 200 });

  record('Cashier, Manager, and Owner role permissions');
}

async function runTrialFlow(productId) {
  await db.business.update({
    where: { id: businessId },
    data: { subscriptionStatus: 'EXPIRED', trialEndsAt: new Date(Date.now() - 86_400_000) },
  });
  const blockedBill = await request('/api/transactions', { method: 'POST', expected: 402 });
  assert(
    blockedBill.data.error === 'Your trial has expired. Contact Vernex to activate your license.',
    'Expired trial message mismatch',
    blockedBill.data
  );
  await request('/api/dashboard', { expected: 200 });
  await db.business.update({
    where: { id: businessId },
    data: { subscriptionStatus: 'TRIAL', trialEndsAt: new Date(Date.now() + 7 * 86_400_000) },
  });

  const stock = await db.productStock.findUnique({ where: { id: productId } });
  assert(stock.stock >= 0, 'Negative stock detected');
  record('Active and expired trial behavior');
}

async function cleanup() {
  const transactions = await db.transaction.findMany({
    where: { businessId },
    select: { id: true },
  });
  const transactionIds = transactions.map((item) => item.id);
  await db.saleReturn.deleteMany({ where: { businessId } });
  if (transactionIds.length) {
    await db.inventoryMovement.deleteMany({
      where: { businessId, referenceId: { in: transactionIds } },
    });
  }
  await db.transaction.deleteMany({ where: { businessId } });
  await db.inventoryMovement.deleteMany({ where: { businessId } });
  await db.customer.deleteMany({ where: { businessId } });
  await db.productStock.deleteMany({ where: { businessId } });
  await db.shopData.deleteMany({ where: { businessId } });
  await db.auditLog.deleteMany({ where: { businessId } });
  await db.staffProfile.deleteMany({ where: { businessId } });
  await db.billSequence.deleteMany({ where: { OR: [{ id: businessId }, { businessId }] } });
  await db.business.deleteMany({ where: { id: businessId } });
}

try {
  await prepareBusiness();
  const tea = await runTeaShopFlow();
  const retail = await runRetailFlow();
  await runReturnFlow(retail);
  await runRoleFlow();
  await runTrialFlow(tea.tea.id);
  record('All Phase 5 database invariants');
  console.log(JSON.stringify({ success: true, checks: results.length, results }, null, 2));
} catch (error) {
  console.error(`FAIL ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  try {
    await cleanup();
    console.log('CLEANUP Phase 5 temporary business removed');
  } catch (cleanupError) {
    console.error(`CLEANUP FAILED ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`);
    process.exitCode = 1;
  }
  await db.$disconnect();
}
