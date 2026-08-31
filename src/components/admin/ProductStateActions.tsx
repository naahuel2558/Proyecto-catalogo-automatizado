'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  archiveProductAction,
  restoreProductAction,
  setProductAvailabilityAction,
  setProductFeaturedAction,
} from '@/app/actions/product-admin';

interface ProductStateActionsProps {
  productId: string;
  isAvailable: boolean;
  isFeatured: boolean;
  isArchived: boolean;
}

export default function ProductStateActions({
  productId,
  isAvailable,
  isFeatured,
  isArchived,
}: ProductStateActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  function run(action: () => Promise<{ success: true } | { success: false; error: { message: string } }>) {
    setError('');
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      router.refresh();
    });
  }

  function confirmArchive() {
    if (!window.confirm('¿Archivar este producto? Desaparecerá del menú, pero conservará su historial.')) return;
    run(() => archiveProductAction(productId));
  }

  return (
    <section className="mt-6 rounded-[28px] border border-[#2f271f]/10 bg-[#211c17] p-5 text-white md:p-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Acciones rápidas</p>
          <h2 className="mt-2 font-[Montserrat] text-xl font-black">Estado comercial</h2>
          <p className="mt-2 text-sm text-white/55">Los pedidos históricos nunca se modifican desde estas acciones.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {!isArchived ? (
            <>
              <button
                type="button"
                disabled={isPending}
                onClick={() => run(() => setProductAvailabilityAction(productId, !isAvailable))}
                className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-xs font-black transition hover:bg-white/15 disabled:opacity-50"
              >
                {isAvailable ? 'Marcar no disponible' : 'Marcar disponible'}
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => run(() => setProductFeaturedAction(productId, !isFeatured))}
                className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-xs font-black transition hover:bg-white/15 disabled:opacity-50"
              >
                {isFeatured ? 'Quitar destacado' : 'Marcar destacado'}
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={confirmArchive}
                className="rounded-xl border border-red-300/20 bg-red-500/15 px-4 py-3 text-xs font-black text-red-100 transition hover:bg-red-500/25 disabled:opacity-50"
              >
                Archivar
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={isPending}
              onClick={() => run(() => restoreProductAction(productId))}
              className="rounded-xl bg-emerald-500 px-5 py-3 text-xs font-black text-[#102318] transition hover:bg-emerald-400 disabled:opacity-50"
            >
              Restaurar producto
            </button>
          )}
        </div>
      </div>
      {error ? <p role="alert" className="mt-4 rounded-xl bg-red-500/15 px-4 py-3 text-sm text-red-100">{error}</p> : null}
    </section>
  );
}
