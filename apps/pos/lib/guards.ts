import { Permission } from '@/lib/permissions';
import { requirePermission } from '@/lib/auth';
import { requireActiveSubscription } from '@/lib/subscription';

export async function requirePaidFeature(request: Request | undefined, permission: Permission) {
  const ctx = await requirePermission(request, permission);
  await requireActiveSubscription(ctx);
  return ctx;
}

