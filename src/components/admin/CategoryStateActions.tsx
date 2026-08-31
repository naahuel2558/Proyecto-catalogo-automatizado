'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  archiveCategoryAction,
  restoreCategoryAction,
} from '@/app/actions/category-admin';

export default function CategoryStateActions({
  categoryId,
  isArchived,
}: {
  categoryId: string;
  isArchived: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  function run(action: () => ReturnType<typeof archiveCategoryAction>) {
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
    if (!window.confirm('¿Archivar esta categoría? Sus productos y pedidos no se modificarán.')) return;
    run(() => archiveCategoryAction(categoryId));
  }

  return (
    <section className="mt-6 rounded-[28px] border border-[#2f271f]/10 bg-[#211c17] p-5 text-white md:p-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Archivo lógico</p>
          <h2 className="mt-2 font-[Montserrat] text-xl font-black">Estado de la categoría</h2>
          <p className="mt-2 text-sm text-white/55">Los productos permanecen visibles según su propio estado y las órdenes conservan su historial.</p>
        </div>
        {isArchived ? (
          <button type="button" disabled={isPending} onClick={() => run(() => restoreCategoryAction(categoryId))} className="rounded-xl bg-emerald-500 px-5 py-3 text-xs font-black text-[#102318] transition hover:bg-emerald-400 disabled:opacity-50">
            Restaurar categoría
          </button>
        ) : (
          <button type="button" disabled={isPending} onClick={confirmArchive} className="rounded-xl border border-red-300/20 bg-red-500/15 px-5 py-3 text-xs font-black text-red-100 transition hover:bg-red-500/25 disabled:opacity-50">
            Archivar categoría
          </button>
        )}
      </div>
      {error ? <p role="alert" className="mt-4 rounded-xl bg-red-500/15 px-4 py-3 text-sm text-red-100">{error}</p> : null}
    </section>
  );
}
