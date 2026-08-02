import { requireSuperAdmin } from '@/lib/super-admin/auth.server';
import { listAuditLogs, getTrials, listSubscriptionPayments } from '@/services/super-admin/admin-data.server';
import { AdminShell } from '@/components/super-admin/admin-shell';

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireSuperAdmin();
  let notifications: Array<{ title: string; description: string; href: string; tone: 'warning' | 'info' }> = [];
  try {
    // Failed payments come first: the customer tried to pay and could not, so
    // they are still locked out and probably about to contact support.
    const [trials, audit, failedPayments] = await Promise.all([
      getTrials(),
      listAuditLogs(),
      listSubscriptionPayments({ status: 'FAILED' }).catch(() => []),
    ]);
    notifications = [
      ...failedPayments.slice(0, 5).map((payment) => ({
        title: 'Payment failed',
        description: `${payment.businessName} could not pay for the ${payment.planName || payment.plan}.${payment.failureReason ? ` ${payment.failureReason}` : ''}`,
        href: '/super-admin/payments?status=FAILED',
        tone: 'warning' as const,
      })),
      ...trials
        .filter((item) => item.subscriptionStatus === 'TRIAL' && item.daysRemaining <= 7)
        .slice(0, 4)
        .map((item) => ({
          title: 'Trial expiring soon',
          description: `${item.name} has ${item.daysRemaining} day${item.daysRemaining === 1 ? '' : 's'} remaining.`,
          href: '/super-admin/trials',
          tone: 'warning' as const,
        })),
      ...audit.slice(0, 3).map((item) => ({
        title: item.action.replaceAll('_', ' '),
        description: `${item.businessName}: ${item.description}`,
        href: '/super-admin/audit-logs',
        tone: 'info' as const,
      })),
    ];
  } catch {}
  return <AdminShell adminEmail={admin.email} notifications={notifications}>{children}</AdminShell>;
}

