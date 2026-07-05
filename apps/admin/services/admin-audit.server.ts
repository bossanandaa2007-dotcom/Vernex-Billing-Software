import 'server-only';
import { cookies } from 'next/headers';
import { adminCookieName, requireSuperAdmin } from '@/lib/auth.server';
import { createServerSupabase } from '@/lib/supabase.server';

export async function writeSuperAdminAudit({
  businessId,
  action,
  entityType,
  entityId,
  description,
}: {
  businessId: string;
  action: string;
  entityType: string;
  entityId?: string;
  description: string;
}) {
  await requireSuperAdmin();
  const token = (await cookies()).get(adminCookieName)?.value;
  if (!token) return;
  await createServerSupabase(token).from('AuditLog').insert({
    businessId,
    userNameSnapshot: 'Vernex Super Admin',
    roleSnapshot: 'OWNER',
    action: `SUPER_ADMIN_${action}`,
    entityType,
    entityId: entityId ?? null,
    description,
  });
}
