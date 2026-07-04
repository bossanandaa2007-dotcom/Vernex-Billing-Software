import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-vernex-surface px-4 dark:bg-vernex-dark">
      <section className="text-center">
        <Image src="/assets/vernex-logo.png" alt="Vernex" width={88} height={88} className="mx-auto mb-5 h-20 w-20 object-contain" />
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-vernex-gold">404</p>
        <h1 className="mt-2 text-2xl font-bold text-vernex-navy dark:text-white">Page not found</h1>
        <p className="mt-2 text-sm text-vernex-muted dark:text-slate-300">The requested Vernex page does not exist.</p>
        <Button asChild className="mt-6"><Link href="/home">Return to dashboard</Link></Button>
      </section>
    </main>
  );
}
