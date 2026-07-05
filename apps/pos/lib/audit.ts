import { Prisma } from '@prisma/client';
import { CurrentUserContext } from '@/lib/auth';
import { db } from '@/lib/db';

export async function writeAuditLog(
  ctx: CurrentUserContext,
  input: {
    action: string;
    entityType: string;
    entityId?: string | null;
    referenceNumber?: string | null;
    description: string;
    metadata?: Prisma.InputJsonValue;
  },
) {
  try {
    await db.auditLog.create({
      data: {
        businessId: ctx.businessId,
        userId: ctx.staffId,
        userNameSnapshot: ctx.name,
        roleSnapshot: ctx.role,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        referenceNumber: input.referenceNumber ?? null,
        description: input.description,
        metadata: input.metadata ?? undefined,
      },
    });
  } catch (error) {
    console.error('Audit log failed:', error);
  }
}

