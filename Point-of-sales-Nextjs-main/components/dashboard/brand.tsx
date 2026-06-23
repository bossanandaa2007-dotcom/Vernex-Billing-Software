import Image from 'next/image';
import Link from 'next/link';

export function VernexBrand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/home" className="flex items-center gap-3" aria-label="Vernex Billing dashboard">
      <span className="flex h-10 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white p-1 shadow-sm">
        <Image
          src="/assets/vernex-logo.png"
          alt="Vernex logo"
          width={48}
          height={34}
          className="h-full w-full object-contain"
          priority
        />
      </span>
      {!compact && (
        <span className="leading-tight">
          <span className="block text-sm font-bold tracking-wide text-white">
            VERNEX BILLING
          </span>
          <span className="block text-[10px] font-medium uppercase tracking-[0.18em] text-vernex-gold-soft">
            Billing Software
          </span>
        </span>
      )}
    </Link>
  );
}
