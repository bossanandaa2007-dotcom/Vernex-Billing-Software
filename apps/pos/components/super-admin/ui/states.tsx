import { AlertTriangle, Inbox, Loader2 } from 'lucide-react';
import { Button } from '@/components/super-admin/ui/button';

export function EmptyState({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return <div className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center"><div className="grid h-12 w-12 place-items-center rounded-full bg-amber-50 text-amber-600 dark:bg-amber-950/30"><Inbox className="h-6 w-6" /></div><h3 className="mt-4 font-semibold">{title}</h3><p className="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">{description}</p>{action && <div className="mt-5">{action}</div>}</div>;
}

export function ErrorState({ message = 'Unable to load this information. Please try again.' }: { message?: string }) {
  return <div className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center"><AlertTriangle className="h-8 w-8 text-red-500" /><h3 className="mt-3 font-semibold">Something went wrong</h3><p className="mt-1 text-sm text-slate-500">{message}</p><Button className="mt-5" asChild><a href="">Try Again</a></Button></div>;
}

export function LoadingState() {
  return <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /> Loading...</div>;
}

export function TableSkeleton() {
  return <div className="space-y-3 p-5">{Array.from({ length: 6 }, (_, index) => <div key={index} className="h-12 animate-pulse rounded-md bg-slate-100 dark:bg-slate-800" />)}</div>;
}

