import { Button } from '@/components/ui/button';
import { TypewriterEffect } from '@/components/ui/type-writer';
import Link from 'next/link';
export default function Home() {
  const words = [
    {
      text: 'Billing',
    },
    {
      text: 'software',
    },
    {
      text: 'built',
    },
    {
      text: 'for',
    },
    {
      text: 'growing',
    },
    {
      text: 'businesses.',
      className: 'text-vernex-gold dark:text-vernex-gold-soft',
    },
  ];
  return (
    <main>
      <div className="relative flex h-screen w-full items-center justify-center bg-vernex-surface dark:bg-vernex-dark">
        {/* Radial gradient for the container to give a faded look */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(201,151,43,0.16),transparent_35%)]"></div>
        <div className="flex flex-col items-center justify-center h-[40rem] ">
          <p className="text-neutral-800 dark:text-neutral-200 text-xl  mb-10">
            Welcome to Vernex Billing Software
          </p>
          <TypewriterEffect words={words} />
          <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 space-x-0 md:space-x-4 mt-10">
            <Button
              className="w-40 h-10 rounded-xl text-sm"
              variant="secondary"
              asChild
            >
              <Link href={'/home'}>Open Dashboard</Link>
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
