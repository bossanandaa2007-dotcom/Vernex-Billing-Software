import type { ReactNode } from 'react';

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center ${className}`}
      role="status"
    >
      <div className="grid h-14 w-14 place-items-center rounded-full bg-vernex-gold/10 text-vernex-gold">
        {icon}
      </div>
      <h2 className="mt-4 text-lg font-semibold text-vernex-navy dark:text-white">{title}</h2>
      <p className="mt-1 max-w-md text-sm leading-6 text-vernex-muted dark:text-slate-300">
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
