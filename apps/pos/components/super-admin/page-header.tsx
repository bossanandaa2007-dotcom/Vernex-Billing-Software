export function PageHeader({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-2xl font-bold text-slate-950 dark:text-white">{title}</h1><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p></div>{action}</div>;
}

