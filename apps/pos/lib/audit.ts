import type { CurrentUserContext } from '@/lib/auth';
import { createServerClient } from '@/src/lib/supabase/server';
import type { Json } from '@/src/types/domain';

export async function writeAuditLog(
  ctx: CurrentUserContext,
  input: {
    action: string;
    entityType: string;
    entityId?: string | null;
    referenceNumber?: string | null;
    description: string;
    metadata?: Json;
  },
) {
  const supabase = await createServerClient();
  await supabase.from('AuditLog').insert({
    businessId: ctx.businessId,
    userId: ctx.staffId,
    userNameSnapshot: ctx.name,
    roleSnapshot: ctx.role,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    referenceNumber: input.referenceNumber ?? null,
    description: input.description,
    metadata: input.metadata ?? null,
  });
}
