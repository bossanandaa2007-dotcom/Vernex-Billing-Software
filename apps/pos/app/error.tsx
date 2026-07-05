'use client';

import { useEffect } from 'react';
import { toast } from 'react-toastify';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

const ErrorPage = ({ reset }: { error: Error; reset: () => void }) => {
  useEffect(() => {
    toast.error('Something went wrong. Please try again later.');
  }, []);

  return (
    <main className="grid min-h-screen place-items-center bg-vernex-surface px-4 dark:bg-vernex-dark">
      <section className="w-full max-w-md text-center">
        <Image src="/assets/vernex-logo.png" alt="Vernex" width={88} height={88} className="mx-auto mb-5 h-20 w-20 object-contain" />
        <h1 className="text-2xl font-bold text-vernex-navy dark:text-white">Vernex is temporarily unavailable</h1>
        <p className="mt-2 text-sm text-vernex-muted dark:text-slate-300">Something went wrong. Please try again later.</p>
        <Button className="mt-6" onClick={reset}>Try again</Button>
      </section>
    </main>
  );
};

export default ErrorPage;
