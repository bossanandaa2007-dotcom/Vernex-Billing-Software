import { PageHeader } from '@/components/page-header';
import { CreateBusinessForm } from '@/components/create-business-form';

export default function NewBusinessPage() {
  return <div className="mx-auto max-w-5xl space-y-6"><PageHeader title="Create Business" description="Provision a new Vernex customer workspace and owner login." /><CreateBusinessForm /></div>;
}

