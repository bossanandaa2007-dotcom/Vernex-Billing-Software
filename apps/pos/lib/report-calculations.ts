import { PaymentMethod } from '@/src/types/domain';
import { createServerClient } from '@/src/lib/supabase/server';

export type ReportRange = { start: Date; end: Date };

const paymentMethods: PaymentMethod[] = ['CASH', 'UPI', 'CARD', 'CREDIT', 'ONLINE'];
const money = (value: unknown) => Number(value ?? 0);

export async function getShopForBusiness(businessId: string) {
  const supabase = await createServerClient();
  return (await supabase.from('ShopData').select('*').eq('businessId', businessId).maybeSingle()).data;
}

export async function getSalesReport(businessId: string, range: ReportRange) {
  const supabase = await createServerClient();
  const { data } = await supabase.from('Transaction')
    .select('*, products:OnSaleProduct(*), customer:Customer(*)')
    .eq('businessId', businessId).eq('isComplete', true)
    .gte('completedAt', range.start.toISOString()).lte('completedAt', range.end.toISOString())
    .order('completedAt', { ascending: false });
  const transactions = (data ?? []) as any[];
  return transactions.map((sale) => ({
    id: sale.id,
    billNumber: sale.billNumber ?? sale.id,
    completedAt: sale.completedAt ?? sale.createdAt,
    customerName: sale.customerName ?? 'Walk-in',
    paymentMethod: sale.paymentMethod ?? 'UNKNOWN',
    paymentStatus: sale.paymentStatus,
    itemCount: sale.products.reduce((sum: number, line: any) => sum + line.quantity, 0),
    subtotal: money(sale.subtotal),
    discount: money(sale.discount),
    taxAmount: money(sale.taxAmount),
    grossTotal: money(sale.totalAmount),
    refundedAmount: money(sale.refundedAmount),
    netTotal: money(sale.totalAmount) - money(sale.refundedAmount),
  }));
}

export async function getPaymentReport(businessId: string, range: ReportRange) {
  const supabase = await createServerClient();
  const [sales, refunds] = await Promise.all([
    supabase.from('Transaction').select('paymentMethod,paymentStatus,totalAmount,amountReceived')
      .eq('businessId', businessId).eq('isComplete', true)
      .gte('completedAt', range.start.toISOString()).lte('completedAt', range.end.toISOString()),
    supabase.from('SaleReturn').select('refundAmount')
      .eq('businessId', businessId)
      .gte('createdAt', range.start.toISOString()).lte('createdAt', range.end.toISOString()),
  ]);
  const totals = Object.fromEntries(paymentMethods.map((method) => [method, 0])) as Record<PaymentMethod, number>;
  let pendingCredit = 0;
  for (const sale of sales.data ?? []) {
    const method = sale.paymentMethod;
    if (method && paymentMethods.includes(method as PaymentMethod)) totals[method as PaymentMethod] += money(sale.totalAmount);
    if (sale.paymentStatus === 'PENDING' || sale.paymentStatus === 'PARTIAL') {
      pendingCredit += money(sale.totalAmount) - money(sale.amountReceived);
    }
  }
  const refundTotal = (refunds.data ?? []).reduce((sum, item) => sum + money(item.refundAmount), 0);
  const grossCollection = Object.values(totals).reduce((sum, value) => sum + value, 0);
  return { totals, refundTotal, refundCount: refunds.data?.length ?? 0, pendingCredit, grossCollection, netCollection: grossCollection - refundTotal };
}

export async function getProductReport(businessId: string, range: ReportRange) {
  const supabase = await createServerClient();
  const [sales, returns, stock] = await Promise.all([
    supabase.from('OnSaleProduct').select('*, transaction:Transaction!inner(billNumber,completedAt,businessId,isComplete)')
      .eq('transaction.businessId', businessId).eq('transaction.isComplete', true)
      .gte('transaction.completedAt', range.start.toISOString()).lte('transaction.completedAt', range.end.toISOString()),
    supabase.from('ReturnItem').select('*, saleReturn:SaleReturn!inner(businessId,createdAt)')
      .eq('saleReturn.businessId', businessId)
      .gte('saleReturn.createdAt', range.start.toISOString()).lte('saleReturn.createdAt', range.end.toISOString()),
    supabase.from('ProductStock').select('*, Product(*)').eq('businessId', businessId).order('name'),
  ]);
  const returned = new Map<string, number>();
  for (const item of returns.data ?? []) returned.set(item.productName, (returned.get(item.productName) ?? 0) + item.quantity);
  const byProduct = new Map<string, { productName: string; quantitySold: number; revenue: number; returnedQuantity: number }>();
  for (const line of sales.data ?? []) {
    const key = line.productName || line.productId || line.id;
    const entry = byProduct.get(key) ?? { productName: line.productName || 'Unknown product', quantitySold: 0, revenue: 0, returnedQuantity: 0 };
    entry.quantitySold += line.quantity;
    entry.revenue += money(line.lineTotal);
    byProduct.set(key, entry);
  }
  const productValues = Array.from(byProduct.values());
  for (const entry of productValues) entry.returnedQuantity = returned.get(entry.productName) ?? 0;
  const products = productValues.sort((a, b) => b.quantitySold - a.quantitySold);
  const stockRows = stock.data ?? [];
  const lowStock = stockRows.filter((item) => item.stock <= 10).map((item) => ({ id: item.id, name: item.name, stock: item.stock, category: item.cat }));
  const stockValue = stockRows.reduce((sum, item) => sum + item.price * item.stock, 0);
  const slowMoving = stockRows
    .filter((item) => !products.some((sold) => sold.productName === item.name))
    .slice(0, 10)
    .map((item) => ({ id: item.id, name: item.name, stock: item.stock }));
  return { products, topProduct: products[0] ?? null, lowStock, slowMoving, stockValue };
}

export async function getCustomerReport(businessId: string, range: ReportRange) {
  const supabase = await createServerClient();
  const { data: customerRows } = await supabase.from('Customer')
    .select('*, transactions:Transaction(*)')
    .eq('businessId', businessId).eq('isActive', true);
  const customers = (customerRows ?? []) as any[];
  return customers
    .map((customer) => {
      const transactions = (customer.transactions ?? []).filter((sale: any) => sale.isComplete && sale.completedAt && new Date(sale.completedAt) >= range.start && new Date(sale.completedAt) <= range.end)
        .sort((a: any, b: any) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));
      const totalSpent = transactions.reduce((sum: number, sale: any) => sum + money(sale.totalAmount) - money(sale.refundedAmount), 0);
      const pendingCredit = transactions.reduce((sum: number, sale: any) => ['PENDING', 'PARTIAL'].includes(sale.paymentStatus) ? sum + money(sale.totalAmount) - money(sale.amountReceived) : sum, 0);
      return {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        billCount: transactions.length,
        totalSpent,
        pendingCredit,
        lastPurchaseDate: transactions[0]?.completedAt ?? null,
      };
    })
    .sort((a, b) => b.totalSpent - a.totalSpent);
}

export async function getInventoryReport(businessId: string, range: ReportRange) {
  const supabase = await createServerClient();
  const [movements, products] = await Promise.all([
    supabase.from('InventoryMovement').select('*').eq('businessId', businessId)
      .gte('createdAt', range.start.toISOString()).lte('createdAt', range.end.toISOString())
      .order('createdAt', { ascending: false }).limit(500),
    supabase.from('ProductStock').select('*, Product!inner(id)').eq('businessId', businessId).order('name'),
  ]);
  const movementRows = movements.data ?? [];
  const productRows = products.data ?? [];
  const summary = movementRows.reduce<Record<string, number>>((acc, movement) => {
    acc[movement.movementType] = (acc[movement.movementType] ?? 0) + Math.abs(movement.quantityChange);
    return acc;
  }, {});
  return {
    movements: movementRows,
    summary,
    currentStock: productRows.map((item) => ({ id: item.id, name: item.name, stock: item.stock, category: item.cat })),
    lowStock: productRows.filter((item) => item.stock <= 10).map((item) => ({ id: item.id, name: item.name, stock: item.stock })),
  };
}

export async function getReturnsReport(businessId: string, range: ReportRange) {
  const supabase = await createServerClient();
  const { data: returnRows } = await supabase.from('SaleReturn').select('*, items:ReturnItem(*)')
    .eq('businessId', businessId)
    .gte('createdAt', range.start.toISOString()).lte('createdAt', range.end.toISOString())
    .order('createdAt', { ascending: false });
  const returns = (returnRows ?? []) as any[];
  return {
    returns: returns.map((saleReturn) => ({
      id: saleReturn.id,
      originalBillNumber: saleReturn.originalBillNumber,
      refundAmount: money(saleReturn.refundAmount),
      refundMethod: saleReturn.refundMethod,
      status: saleReturn.status,
      reason: saleReturn.reason,
      itemCount: saleReturn.items.reduce((sum: number, item: any) => sum + item.quantity, 0),
      createdAt: saleReturn.createdAt,
    })),
    totalRefund: returns.reduce((sum, item) => sum + money(item.refundAmount), 0),
  };
}

export async function getStaffReport(businessId: string, range: ReportRange) {
  const supabase = await createServerClient();
  const { data: logRows } = await supabase.from('AuditLog').select('*').eq('businessId', businessId)
    .gte('createdAt', range.start.toISOString()).lte('createdAt', range.end.toISOString())
    .order('createdAt', { ascending: false });
  const logs = logRows ?? [];
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
