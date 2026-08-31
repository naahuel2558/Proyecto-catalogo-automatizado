'use client';

import { useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';

const REFRESH_INTERVAL_MS = 15_000;

export default function KitchenRefresh() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function refresh() {
    startTransition(() => router.refresh());
  }

  useEffect(() => {
    const interval = window.setInterval(() => {
      startTransition(() => router.refresh());
    }, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [router]);

  return (
    <div className="flex items-center gap-3">
      <span className="hidden items-center gap-2 text-xs font-bold text-white/50 sm:flex">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
        </span>
        Actualiza cada 15 s
      </span>
      <button type="button" onClick={refresh} disabled={isPending} className="flex min-h-12 items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 text-sm font-black text-white transition hover:bg-white/15 disabled:opacity-50">
        <span className={`material-symbols-outlined text-lg ${isPending ? 'animate-spin' : ''}`}>refresh</span>
        {isPending ? 'Actualizando…' : 'Actualizar'}
      </button>
    </div>
  );
}
