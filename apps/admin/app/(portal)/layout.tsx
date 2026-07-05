import { requireSuperAdmin } from '@/lib/auth.server';
import { listAuditLogs, getTrials } from '@/services/admin-data.server';
import { AdminShell } from '@/components/admin-shell';

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireSuperAdmin();
  let notifications: Array<{ title: string; description: string; href: string; tone: 'warning' | 'info' }> = [];
  try {
    const [trials, audit] = await Promise.all([getTrials(), listAuditLogs()]);
    notifications = [
      ...trials
        .filter((item) => item.subscriptionStatus === 'TRIAL' && item.daysRemaining <= 7)
        .slice(0, 4)
        .map((item) => ({
          title: 'Trial expiring soon',
          description: `${item.name} has ${item.daysRemaining} day${item.daysRemaining === 1 ? '' : 's'} remaining.`,
          href: '/trials',
          tone: 'warning' as const,
        })),
      ...audit.slice(0, 3).map((item) => ({
        title: item.action.replaceAll('_', ' '),
        description: `${item.businessName}: ${item.description}`,
        href: '/audit-logs',
        tone: 'info' as const,
      })),
    ];
  } catch {}
  return <AdminShell adminEmail={admin.email} notifications={notifications}>{children}</AdminShell>;
}

