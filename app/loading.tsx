import Image from 'next/image';

export default function Loading() {
  return (
    <main className="grid min-h-screen place-items-center bg-vernex-surface dark:bg-vernex-dark">
      <div className="text-center">
        <Image src="/assets/vernex-logo.png" alt="Vernex" width={72} height={72} className="mx-auto h-16 w-16 animate-pulse object-contain" priority />
        <p className="mt-3 text-sm font-medium text-vernex-muted dark:text-slate-300">Loading Vernex...</p>
      </div>
    </main>
  );
}
