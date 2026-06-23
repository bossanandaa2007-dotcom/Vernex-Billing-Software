import { db } from '@/lib/db';
import { PaymentMethod, Prisma, ReturnStatus } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authErrorResponse } from '@/lib/auth';
import { requirePaidFeature } from '@/lib/guards';
import { writeAuditLog } from '@/lib/audit';

const schema = z.object({
  transactionId: z.string().min(1),
  refundMethod: z.nativeEnum(PaymentMethod),
  reason: z.string().trim().min(3).max(250),
  items: z.array(z.object({ saleLineId: z.string().min(1), quantity: z.number().int().positive() })).min(1),
});

export async function POST(request: Request) {
  let ctx;
  try { ctx = await requirePaidFeature(request, 'RETURNS_MANAGE'); } catch (error) { const response = authErrorResponse(error); if (response) return response; throw error; }
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  try {
    const result = await db.$transaction(async (tx) => {
      const sale = await tx.transaction.findFirst({ where: { id: parsed.data.transactionId, businessId: ctx.businessId }, include: { products: true } });
      if (!sale?.isComplete || !sale.billNumber) throw new Error('Completed sale not found.');
      const prior = await tx.returnItem.groupBy({ by: ['onSaleProductId'], where: { saleReturn: { originalTransactionId: sale.id } }, _sum: { quantity: true } });
      const saleSnapshotTotal = sale.products.reduce((sum, line) => sum + line.lineTotal, 0);
      const paidTotal = Number(sale.totalAmount ?? 0);
      const returned = new Map(prior.map((entry) => [entry.onSaleProductId, entry._sum.quantity ?? 0]));
      let refundAmount = 0;
      const items: { line: typeof sale.products[number]; quantity: number; unitRefund: number }[] = [];
      for (const requested of parsed.data.items) {
        const line = sale.products.find((item) => item.id === requested.saleLineId);
        if (!line) throw new Error('A selected sale item was not found.');
        if (requested.quantity > line.quantity - (returned.get(line.id) ?? 0)) throw new Error(`Return quantity exceeds available quantity for ${line.productName}.`);
        const allocatedLineTotal = saleSnapshotTotal > 0 ? (line.lineTotal / saleSnapshotTotal) * paidTotal : 0;
        const unitRefund = allocatedLineTotal / line.quantity;
        refundAmount += unitRefund * requested.quantity;
        items.push({ line, quantity: requested.quantity, unitRefund });
      }
      const totalSold = sale.products.reduce((sum, line) => sum + line.quantity, 0);
      const alreadyReturned = prior.reduce((sum, entry) => sum + (entry._sum.quantity ?? 0), 0);
      const nowReturned = items.reduce((sum, item) => sum + item.quantity, 0);
      const status = alreadyReturned + nowReturned === totalSold ? ReturnStatus.RETURNED : ReturnStatus.PARTIAL;
      const saleReturn = await tx.saleReturn.create({ data: {
        originalTransactionId: sale.id, originalBillNumber: sale.billNumber, refundAmount,
        refundMethod: parsed.data.refundMethod, reason: parsed.data.reason, status, businessId: ctx.businessId,
      }});
      for (const item of items) {
        if (!item.line.productId) throw new Error(`${item.line.productName} can no longer be returned to stock.`);
        const previous = await tx.productStock.findFirst({ where: { id: item.line.productId, businessId: ctx.businessId } });
        if (!previous) throw new Error(`${item.line.productName} no longer exists.`);
        const updated = await tx.productStock.update({ where: { id: previous.id }, data: { stock: { increment: item.quantity } } });
        await tx.returnItem.create({ data: { saleReturnId: saleReturn.id, onSaleProductId: item.line.id, productId: item.line.productId, productName: item.line.productName, quantity: item.quantity, unitRefund: item.unitRefund, refundAmount: item.unitRefund * item.quantity } });
        await tx.inventoryMovement.create({ data: { businessId: ctx.businessId, productId: previous.id, productNameSnapshot: item.line.productName, movementType: 'RETURN', quantityChange: item.quantity, previousStock: previous.stock, newStock: updated.stock, referenceType: 'RETURN', referenceId: saleReturn.id, referenceBillNumber: sale.billNumber, reason: parsed.data.reason } });
      }
      await tx.transaction.update({ where: { id: sale.id }, data: { returnStatus: status, refundedAmount: { increment: new Prisma.Decimal(refundAmount) } } });
      return tx.saleReturn.findUnique({ where: { id: saleReturn.id }, include: { items: true } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if (result) await writeAuditLog(ctx, { action: 'RETURN_CREATED', entityType: 'SaleReturn', entityId: result.id, referenceNumber: result.originalBillNumber, description: `Created return for ${result.originalBillNumber}`, metadata: { refundAmount: Number(result.refundAmount) } });
    return NextResponse.json(result, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Return failed.' }, { status: 400 }); }
}

