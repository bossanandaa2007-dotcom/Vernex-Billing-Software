import 'server-only';
import { requireSuperAdmin } from '@/lib/super-admin/auth.server';
import { createPrivilegedSupabase } from '@/lib/super-admin/supabase.server';

export async function writeSuperAdminAudit({
  businessId,
  action,
  entityType,
  entityId,
  description,
  metadata,
}: {
  businessId: string;
  action: string;
  entityType: string;
  entityId?: string;
  description: string;
  metadata?: Record<string, unknown>;
}) {
  await requireSuperAdmin();
  // Audit rows are written across tenants (for whichever business the admin acted
  // on), which tenant RLS would reject. The service-role client bypasses it.
  await createPrivilegedSupabase().from('AuditLog').insert({
    businessId,
    userNameSnapshot: 'Vernex Super Admin',
    roleSnapshot: 'OWNER',
    action: `SUPER_ADMIN_${action}`,
    entityType,
    entityId: entityId ?? null,
    description,
    metadata: metadata ?? null,
  });
}
