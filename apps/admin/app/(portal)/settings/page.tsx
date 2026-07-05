import { requireSuperAdmin } from '@/lib/auth.server';
import { PageHeader } from '@/components/page-header';
import { SettingsPanel } from '@/components/settings-panel';

export default async function SettingsPage() {
  const admin = await requireSuperAdmin();
  return <div className="space-y-6"><PageHeader title="Settings" description="Manage the Super Admin profile, password, branding, theme, and portal preferences." /><SettingsPanel email={admin.email} /></div>;
}

