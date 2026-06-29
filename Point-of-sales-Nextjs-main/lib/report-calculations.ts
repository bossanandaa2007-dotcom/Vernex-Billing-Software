import { db } from '@/lib/db';
import { PaymentMethod } from '@prisma/client';

export type ReportRange = { start: Date; end: Date };

const paymentMethods: PaymentMethod[] = ['CASH', 'UPI', 'CARD', 'CREDIT', 'ONLINE'];
const money = (value: unknown) => Number(value ?? 0);

export async function getShopForBusiness(businessId: string) {
  return db.shopData.findFirst({ where: { businessId } });
}

export async function getSalesReport(businessId: string, range: ReportRange) {
  const transactions = await db.transaction.findMany({
    where: { businessId, isComplete: true, completedAt: { gte: range.start, lte: range.end } },
    include: { products: true, customer: true },
    orderBy: { completedAt: 'desc' },
  });
  return transactions.map((sale) => ({
    id: sale.id,
    billNumber: sale.billNumber ?? sale.id,
    completedAt: sale.completedAt ?? sale.createdAt,
    customerName: sale.customerName ?? 'Walk-in',
    paymentMethod: sale.paymentMethod ?? 'UNKNOWN',
    paymentStatus: sale.paymentStatus,
    itemCount: sale.products.reduce((sum, line) => sum + line.quantity, 0),
    subtotal: money(sale.subtotal),
    discount: money(sale.discount),
    taxAmount: money(sale.taxAmount),
    grossTotal: money(sale.totalAmount),
    refundedAmount: money(sale.refundedAmount),
    netTotal: money(sale.totalAmount) - money(sale.refundedAmount),
  }));
}

export async function getPaymentReport(businessId: string, range: ReportRange) {
  const [sales, refunds] = await Promise.all([
    db.transaction.findMany({
      where: { businessId, isComplete: true, completedAt: { gte: range.start, lte: range.end } },
      select: { paymentMethod: true, paymentStatus: true, totalAmount: true, amountReceived: true },
    }),
    db.saleReturn.aggregate({ where: { businessId, createdAt: { gte: range.start, lte: range.end } }, _sum: { refundAmount: true }, _count: true }),
  ]);
  const totals = Object.fromEntries(paymentMethods.map((method) => [method, 0])) as Record<PaymentMethod, number>;
  let pendingCredit = 0;
  for (const sale of sales) {
    const method = sale.paymentMethod;
    if (method) totals[method] += money(sale.totalAmount);
    if (sale.paymentStatus === 'PENDING' || sale.paymentStatus === 'PARTIAL') {
      pendingCredit += money(sale.totalAmount) - money(sale.amountReceived);
    }
  }
  const refundTotal = money(refunds._sum.refundAmount);
  const grossCollection = Object.values(totals).reduce((sum, value) => sum + value, 0);
  return { totals, refundTotal, refundCount: refunds._count, pendingCredit, grossCollection, netCollection: grossCollection - refundTotal };
}

export async function getProductReport(businessId: string, range: ReportRange) {
  const [sales, returns, stock] = await Promise.all([
    db.onSaleProduct.findMany({
      where: { transaction: { businessId, isComplete: true, completedAt: { gte: range.start, lte: range.end } } },
      include: { transaction: { select: { billNumber: true, completedAt: true } } },
    }),
    db.returnItem.findMany({ where: { saleReturn: { businessId, createdAt: { gte: range.start, lte: range.end } } } }),
    db.productStock.findMany({ where: { businessId, Product: { some: {} } }, include: { Product: true }, orderBy: { name: 'asc' } }),
  ]);
  const returned = new Map<string, number>();
  for (const item of returns) returned.set(item.productName, (returned.get(item.productName) ?? 0) + item.quantity);
  const byProduct = new Map<string, { productName: string; quantitySold: number; revenue: number; returnedQuantity: number }>();
  for (const line of sales) {
    const key = line.productName || line.productId || line.id;
    const entry = byProduct.get(key) ?? { productName: line.productName || 'Unknown product', quantitySold: 0, revenue: 0, returnedQuantity: 0 };
    entry.quantitySold += line.quantity;
    entry.revenue += money(line.lineTotal);
    byProduct.set(key, entry);
  }
  const productValues = Array.from(byProduct.values());
  for (const entry of productValues) entry.returnedQuantity = returned.get(entry.productName) ?? 0;
  const products = productValues.sort((a, b) => b.quantitySold - a.quantitySold);
  const lowStock = stock.filter((item) => item.stock <= 10).map((item) => ({ id: item.id, name: item.name, stock: item.stock, category: item.cat }));
  const stockValue = stock.reduce((sum, item) => sum + item.price * item.stock, 0);
  const slowMoving = stock
    .filter((item) => !products.some((sold) => sold.productName === item.name))
    .slice(0, 10)
    .map((item) => ({ id: item.id, name: item.name, stock: item.stock }));
  return { products, topProduct: products[0] ?? null, lowStock, slowMoving, stockValue };
}

export async function getCustomerReport(businessId: string, range: ReportRange) {
  const customers = await db.customer.findMany({
    where: { businessId, isActive: true },
    include: {
      transactions: {
        where: { businessId, isComplete: true, completedAt: { gte: range.start, lte: range.end } },
        orderBy: { completedAt: 'desc' },
      },
    },
  });
  return customers
    .map((customer) => {
      const totalSpent = customer.transactions.reduce((sum, sale) => sum + money(sale.totalAmount) - money(sale.refundedAmount), 0);
      const pendingCredit = customer.transactions.reduce((sum, sale) => ['PENDING', 'PARTIAL'].includes(sale.paymentStatus) ? sum + money(sale.totalAmount) - money(sale.amountReceived) : sum, 0);
      return {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        billCount: customer.transactions.length,
        totalSpent,
        pendingCredit,
        lastPurchaseDate: customer.transactions[0]?.completedAt ?? null,
      };
    })
    .sort((a, b) => b.totalSpent - a.totalSpent);
}

export async function getInventoryReport(businessId: string, range: ReportRange) {
  const [movements, products] = await Promise.all([
    db.inventoryMovement.findMany({ where: { businessId, createdAt: { gte: range.start, lte: range.end } }, orderBy: { createdAt: 'desc' }, take: 500 }),
    db.productStock.findMany({ where: { businessId, Product: { some: {} } }, orderBy: { name: 'asc' } }),
  ]);
  const summary = movements.reduce<Record<string, number>>((acc, movement) => {
    acc[movement.movementType] = (acc[movement.movementType] ?? 0) + Math.abs(movement.quantityChange);
    return acc;
  }, {});
  return {
    movements,
    summary,
    currentStock: products.map((item) => ({ id: item.id, name: item.name, stock: item.stock, category: item.cat })),
    lowStock: products.filter((item) => item.stock <= 10).map((item) => ({ id: item.id, name: item.name, stock: item.stock })),
  };
}

export async function getReturnsReport(businessId: string, range: ReportRange) {
  const returns = await db.saleReturn.findMany({
    where: { businessId, createdAt: { gte: range.start, lte: range.end } },
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  });
  return {
    returns: returns.map((saleReturn) => ({
      id: saleReturn.id,
      originalBillNumber: saleReturn.originalBillNumber,
      refundAmount: money(saleReturn.refundAmount),
      refundMethod: saleReturn.refundMethod,
      status: saleReturn.status,
      reason: saleReturn.reason,
      itemCount: saleReturn.items.reduce((sum, item) => sum + item.quantity, 0),
      createdAt: saleReturn.createdAt,
    })),
    totalRefund: returns.reduce((sum, item) => sum + money(item.refundAmount), 0),
  };
}

export async function getStaffReport(businessId: string, range: ReportRange) {
  const logs = await db.auditLog.findMany({
    where: { businessId, createdAt: { gte: range.start, lte: range.end } },
    orderBy: { createdAt: 'desc' },
  });
  const byStaff = new Map<string, { userName: string; role: string; sales: number; returns: number; stockAdjustments: number; settingsChanges: number }>();
  for (const log of logs) {
    const key = log.userId ?? log.userNameSnapshot;
    const entry = byStaff.get(key) ?? { userName: log.userNameSnapshot, role: log.roleSnapshot, sales: 0, returns: 0, stockAdjustments: 0, settingsChanges: 0 };
    if (log.action === 'SALE_COMPLETED') entry.sales += 1;
    if (log.action === 'RETURN_CREATED') entry.returns += 1;
    if (log.action === 'STOCK_ADJUSTED' || log.action === 'STOCK_RESTOCKED') entry.stockAdjustments += 1;
    if (log.action.includes('SETTINGS')) entry.settingsChanges += 1;
    byStaff.set(key, entry);
  }
  return Array.from(byStaff.values()).sort((a, b) => b.sales - a.sales);
}
