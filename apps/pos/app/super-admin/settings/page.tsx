import { requireSuperAdmin } from '@/lib/super-admin/auth.server';
import { PageHeader } from '@/components/super-admin/page-header';
import { SettingsPanel } from '@/components/super-admin/settings-panel';

export default async function SettingsPage() {
  const admin = await requireSuperAdmin();
  return <div className="space-y-6"><PageHeader title="Settings" description="Manage the Super Admin profile, password, branding, theme, and portal preferences." /><SettingsPanel email={admin.email} /></div>;
}

