import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return <main className="grid min-h-screen place-items-center bg-slate-50 p-6 dark:bg-slate-950"><div className="text-center"><p className="text-sm font-semibold text-amber-600">VERNEX CONTROL</p><h1 className="mt-3 text-4xl font-bold">Page not found</h1><p className="mt-2 text-slate-500">The requested portal page is unavailable.</p><Button className="mt-6" asChild><Link href="/">Return to Dashboard</Link></Button></div></main>;
}

