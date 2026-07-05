import { cn } from "@/lib/utils";

export const BentoGrid = ({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) => {
  return (
    <div
      className={cn(
        "grid md:auto-rows-[18rem] grid-cols-1 md:grid-cols-3 gap-5 max-w-7xl mx-auto",
        className
      )}
    >
      {children}
    </div>
  );
};

export const BentoGridItem = ({
  className,
  title,
  description,
  header,
  icon,
}: {
  className?: string;
  title?: string | React.ReactNode;
  description?: string | React.ReactNode;
  header?: React.ReactNode;
  icon?: React.ReactNode;
}) => {
  return (
    <div
      className={cn(
        "row-span-1 rounded-xl group/bento hover:shadow-md transition duration-200 shadow-[0_1px_3px_rgba(16,24,40,0.06)] p-5 dark:bg-vernex-navy dark:border-[#1E335F] bg-white border border-vernex-border justify-between flex flex-col space-y-4",
        className
      )}
    >
      {header}
      <div className="transition duration-200">
        {icon}
        <div className="font-sans font-bold text-vernex-navy dark:text-white mb-2 mt-2">
          {title}
        </div>
        <div className="font-sans font-normal text-vernex-muted text-xs dark:text-slate-400">
          {description}
        </div>
      </div>
    </div>
  );
};
