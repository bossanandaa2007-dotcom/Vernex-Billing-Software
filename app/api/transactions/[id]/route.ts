import { db } from '@/lib/db';
import { checkoutSchema } from '@/schema';
import { PaymentStatus, Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { formatBillNumber } from '@/lib/bill-number';
import { authErrorResponse, requireAuth } from '@/lib/auth';
import { requirePaidFeature } from '@/lib/guards';
import { writeAuditLog } from '@/lib/audit';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  let ctx;
  try { ctx = await requireAuth(request); } catch (error) { const response = authErrorResponse(error); if (response) return response; throw error; }
  const transaction = await db.transaction.findFirst({
    where: { id: params.id, businessId: ctx.businessId },
    include: {
      products: {
        include: { product: { include: { productstock: true } } },
        orderBy: { productName: 'asc' },
      },
      returns: { include: { items: true }, orderBy: { createdAt: 'desc' } },
    },
  });

  if (!transaction) return NextResponse.json({ error: 'Bill not found.' }, { status: 404 });
  return NextResponse.json({ transaction, items: transaction.products });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  let ctx;
  try { ctx = await requirePaidFeature(request, 'POS_BILLING'); } catch (error) { const response = authErrorResponse(error); if (response) return response; throw error; }
  const parsed = checkoutSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await db.$transaction(
      async (tx) => {
        const transaction = await tx.transaction.findFirst({
          where: { id: params.id, businessId: ctx.businessId },
          include: {
            products: { include: { product: { include: { productstock: true } } } },
          },
        });

        if (!transaction) throw new Error('Bill not found.');
        if (transaction.isComplete) throw new Error('Bill has already been checked out.');
        if (!transaction.products.length) throw new Error('Add at least one product before checkout.');

        const shop = await tx.shopData.findFirst({ where: { businessId: ctx.businessId } });
        const linkedCustomer = parsed.data.customerId
          ? await tx.customer.findFirst({ where: { id: parsed.data.customerId, businessId: ctx.businessId, isActive: true } })
          : null;
        if (parsed.data.customerId && !linkedCustomer) throw new Error('Selected customer is unavailable.');
        const taxRate = shop?.taxMode === 'NONE' ? 0 : shop?.tax ?? 0;
        const allowedMethods = shop?.country === 'India'
          ? ['CASH', 'UPI', 'CARD', 'CREDIT']
          : ['CASH', 'CARD', 'ONLINE', 'CREDIT'];
        if (!allowedMethods.includes(parsed.data.paymentMethod)) {
          throw new Error('Payment method is not available for this country.');
        }

        let subtotal = 0;
        let taxAmount = 0;

        for (const line of transaction.products) {
          if (!line.productId || !line.product) throw new Error('A product in this bill no longer exists.');
          if (line.quantity > line.product.productstock.stock) {
            throw new Error(`Insufficient stock for ${line.product.productstock.name}.`);
          }

          const lineSubtotal = line.product.sellprice * line.quantity;
          const lineTax = lineSubtotal * (taxRate / 100);
          subtotal += lineSubtotal;
          taxAmount += lineTax;

          const stockUpdate = await tx.productStock.updateMany({
            where: { id: line.productId, stock: { gte: line.quantity } },
            data: { stock: { decrement: line.quantity } },
          });
          if (stockUpdate.count !== 1) throw new Error(`Insufficient stock for ${line.product.productstock.name}.`);

          await tx.inventoryMovement.create({
            data: {
              productId: line.productId,
              businessId: ctx.businessId,
              productNameSnapshot: line.product.productstock.name,
              movementType: 'SALE',
              quantityChange: -line.quantity,
              previousStock: line.product.productstock.stock,
              newStock: line.product.productstock.stock - line.quantity,
              referenceType: 'SALE',
              referenceId: params.id,
              reason: 'Completed sale',
            },
          });

          await tx.onSaleProduct.update({
            where: { id: line.id },
            data: {
              productName: line.product.productstock.name,
              unitPrice: line.product.sellprice,
              costPrice: line.product.productstock.price,
              taxRate,
              lineSubtotal,
              taxAmount: lineTax,
              lineTotal: lineSubtotal + lineTax,
            },
          });
        }

        const discount = Math.min(parsed.data.discount, subtotal + taxAmount);
        const grandTotal = Math.max(0, subtotal + taxAmount - discount);
        const amountReceived = parsed.data.amountReceived;

        if (parsed.data.paymentMethod !== 'CREDIT' && amountReceived < grandTotal) {
          throw new Error('Amount received must cover the grand total.');
        }

        let paymentStatus: PaymentStatus = PaymentStatus.PAID;
        if (parsed.data.paymentMethod === 'CREDIT') {
          paymentStatus = amountReceived >= grandTotal
            ? PaymentStatus.PAID
            : amountReceived > 0
              ? PaymentStatus.PARTIAL
              : PaymentStatus.PENDING;
        }

        const changeAmount = Math.max(0, amountReceived - grandTotal);
        const sequence = await tx.billSequence.upsert({
          where: { id: 'main' },
          create: { id: 'main', businessId: ctx.businessId, nextNumber: 2 },
          update: { nextNumber: { increment: 1 } },
        });
        const billNumber = formatBillNumber(sequence.nextNumber - 1, shop?.billPrefix, shop?.billPadding);
        const completed = await tx.transaction.update({
          where: { id: params.id },
          data: {
            subtotal,
            businessId: ctx.businessId,
            discount,
            taxAmount,
            totalAmount: grandTotal,
            amountReceived,
            changeAmount,
            billNumber,
            customerId: linkedCustomer?.id ?? null,
            customerName: linkedCustomer?.name ?? (parsed.data.customerName?.trim() || null),
            customerPhone: linkedCustomer?.phone ?? (parsed.data.customerPhone?.trim() || null),
            customerEmail: linkedCustomer?.email ?? (parsed.data.customerEmail?.trim() || null),
            customerAddress: linkedCustomer?.address ?? (parsed.data.customerAddress?.trim() || null),
            customerTaxId: linkedCustomer?.taxId ?? (parsed.data.customerTaxId?.trim() || null),
            paymentMethod: parsed.data.paymentMethod,
            paymentStatus,
            completedAt: new Date(),
            isComplete: true,
          },
          include: { products: true },
        });

        await tx.inventoryMovement.updateMany({
          where: { referenceId: params.id, movementType: 'SALE' },
          data: { referenceBillNumber: billNumber },
        });

        return completed;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 10000,
        timeout: 30000,
      }
    );

    await writeAuditLog(ctx, { action: 'SALE_COMPLETED', entityType: 'Transaction', entityId: result.id, referenceNumber: result.billNumber, description: `Completed sale ${result.billNumber ?? result.id}`, metadata: { totalAmount: Number(result.totalAmount ?? 0), paymentMethod: result.paymentMethod } });
    return NextResponse.json(result);
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : 'Checkout failed.';
    const message = rawMessage.includes('Transaction already closed')
      ? 'Checkout took too long. Please try Complete Payment again.'
      : rawMessage;
    const status = message.includes('already') ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  let ctx;
  try { ctx = await requirePaidFeature(request, 'POS_BILLING'); } catch (error) { const response = authErrorResponse(error); if (response) return response; throw error; }
  const transaction = await db.transaction.findFirst({ where: { id: params.id, businessId: ctx.businessId } });
  if (!transaction) return NextResponse.json({ error: 'Bill not found.' }, { status: 404 });
  if (transaction.isComplete) {
    return NextResponse.json({ error: 'Completed sales cannot be deleted.' }, { status: 409 });
  }
  await db.transaction.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
