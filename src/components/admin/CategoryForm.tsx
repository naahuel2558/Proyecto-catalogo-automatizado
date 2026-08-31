'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  createCategoryAction,
  updateCategoryAction,
} from '@/app/actions/category-admin';

interface EditableCategory {
  id: string;
  name: string;
}

export default function CategoryForm({ category }: { category?: EditableCategory }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSaved(false);
    const input = { name: new FormData(event.currentTarget).get('name') };

    startTransition(async () => {
      const result = category
        ? await updateCategoryAction(category.id, input)
        : await createCategoryAction(input);

      if (!result.success) {
        setError(result.error.message);
        return;
      }
      if (!category) {
        router.push(`/admin/categorias/${result.categoryId}?created=1`);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="overflow-hidden rounded-[28px] border border-[#2f271f]/10 bg-white shadow-[0_18px_60px_rgba(72,54,36,0.08)]">
      <div className="grid gap-px bg-[#2f271f]/10 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="space-y-6 bg-white p-5 md:p-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Identidad del menú</p>
            <h2 className="mt-2 font-[Montserrat] text-2xl font-black">Información de la categoría</h2>
          </div>
          <label className="block">
            <span className="mb-2 block text-sm font-bold">Nombre</span>
            <input
              name="name"
              required
              maxLength={120}
              defaultValue={category?.name ?? ''}
              placeholder="Ej. Hamburguesas especiales"
              autoComplete="off"
              className="w-full rounded-xl border border-[#2f271f]/15 bg-[#fbf8f4] px-4 py-3.5 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
            />
            <span className="mt-2 block text-xs leading-5 text-[#81756a]">El identificador técnico se genera automáticamente a partir del nombre.</span>
          </label>
        </div>

        <aside className="space-y-5 bg-[#fffaf4] p-5 md:p-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Comportamiento</p>
            <h2 className="mt-2 font-[Montserrat] text-xl font-black">Sin efectos sorpresa</h2>
            <p className="mt-2 text-sm leading-6 text-[#75685d]">Una categoría nueva comienza activa. Archivar o renombrar después no cambia productos ni pedidos.</p>
          </div>
          {error ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div> : null}
          {saved ? <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">Cambios guardados correctamente.</div> : null}
          <button
            type="submit"
            disabled={isPending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-black text-white shadow-[0_10px_26px_rgba(255,107,0,0.24)] transition hover:bg-[#e66000] disabled:cursor-not-allowed disabled:opacity-55"
          >
            <span className={`material-symbols-outlined text-lg ${isPending ? 'animate-spin' : ''}`}>{isPending ? 'progress_activity' : 'save'}</span>
            {isPending ? 'Guardando…' : category ? 'Guardar cambios' : 'Crear categoría'}
          </button>
        </aside>
      </div>
    </form>
  );
}
