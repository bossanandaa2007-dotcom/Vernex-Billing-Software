import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getBusiness } from '@/services/super-admin/admin-data.server';
import { PageHeader } from '@/components/super-admin/page-header';
import { BusinessModulesForm } from '@/components/super-admin/business-modules-form';
import { ErrorState } from '@/components/super-admin/ui/states';

export default async function BusinessModulesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { business } = await getBusiness(id);
    return <div className="space-y-6">
      <PageHeader title={`${business.name} Modules`} description="Choose which features are available inside this business workspace." action={<Link href={`/super-admin/businesses/${id}`} className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-semibold dark:border-slate-700"><ArrowLeft className="h-4 w-4" />Business</Link>} />
      <BusinessModulesForm businessId={id} />
    </div>;
  } catch {
    return <ErrorState message="Unable to load module management for this business." />;
  }
}
