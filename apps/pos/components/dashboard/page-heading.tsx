export function PageHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-5">
      <h1 className="text-2xl font-bold tracking-tight text-vernex-navy dark:text-white lg:text-3xl">
        {title}
      </h1>
      <p className="mt-1 text-sm text-vernex-muted dark:text-slate-400">
        {description}
      </p>
    </div>
  );
}
