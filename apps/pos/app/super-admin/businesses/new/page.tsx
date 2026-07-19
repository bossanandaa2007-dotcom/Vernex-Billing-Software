import { PageHeader } from '@/components/super-admin/page-header';
import { CreateBusinessForm } from '@/components/super-admin/create-business-form';

export default function NewBusinessPage() {
  return <div className="mx-auto max-w-5xl space-y-6"><PageHeader title="Create Business" description="Provision a new Vernex customer workspace and owner login." /><CreateBusinessForm /></div>;
}

