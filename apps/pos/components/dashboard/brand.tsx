import Image from 'next/image';
import Link from 'next/link';

export function VernexBrand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/home" className="flex items-center gap-3" aria-label="Vernex dashboard">
      <span className="flex h-12 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1 shadow-sm">
        <Image
          src="/assets/vernex-logo.png"
          alt="Vernex logo"
          width={56}
          height={48}
          className="h-full w-full object-contain"
          priority
          unoptimized
        />
      </span>
      {!compact && (
        <span className="leading-tight">
          <span className="block text-sm font-bold tracking-wide text-white">
            VERNEX
          </span>
          <span className="block text-[10px] font-medium uppercase tracking-[0.18em] text-vernex-gold-soft">
            Business Suite
          </span>
        </span>
      )}
    </Link>
  );
}
