'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  createProductAction,
  updateProductAction,
} from '@/app/actions/product-admin';

interface CategoryOption {
  id: string;
  name: string;
}

interface EditableProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string | null;
  categoryId: string;
  isAvailable: boolean;
  isFeatured: boolean;
}

interface ProductFormProps {
  categories: CategoryOption[];
  product?: EditableProduct;
}

export default function ProductForm({ categories, product }: ProductFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const isEditing = Boolean(product);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSaved(false);
    const formData = new FormData(event.currentTarget);
    const input = {
      name: formData.get('name'),
      description: formData.get('description'),
      price: formData.get('price'),
      image: formData.get('image'),
      categoryId: formData.get('categoryId'),
      isAvailable: formData.has('isAvailable'),
      isFeatured: formData.has('isFeatured'),
    };

    startTransition(async () => {
      const result = product
        ? await updateProductAction(product.id, input)
        : await createProductAction(input);

      if (!result.success) {
        setError(result.error.message);
        return;
      }

      if (!isEditing) {
        router.push(`/admin/productos/${result.productId}?created=1`);
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
            <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Ficha comercial</p>
            <h2 className="mt-2 font-[Montserrat] text-2xl font-black">Información del producto</h2>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="md:col-span-2">
              <span className="mb-2 block text-sm font-bold">Nombre</span>
              <input
                name="name"
                required
                maxLength={120}
                defaultValue={product?.name ?? ''}
                placeholder="Ej. Lomo clásico completo"
                className="w-full rounded-xl border border-[#2f271f]/15 bg-[#fbf8f4] px-4 py-3.5 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </label>

            <label className="md:col-span-2">
              <span className="mb-2 block text-sm font-bold">Descripción</span>
              <textarea
                name="description"
                rows={5}
                maxLength={1000}
                defaultValue={product?.description ?? ''}
                placeholder="Ingredientes, tamaño y detalles que verá el cliente."
                className="w-full resize-y rounded-xl border border-[#2f271f]/15 bg-[#fbf8f4] px-4 py-3.5 text-sm leading-6 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-bold">Precio en pesos</span>
              <div className="flex rounded-xl border border-[#2f271f]/15 bg-[#fbf8f4] focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
                <span className="flex items-center border-r border-[#2f271f]/10 px-4 font-black text-[#6f6256]">$</span>
                <input
                  name="price"
                  type="number"
                  min={1}
                  max={100000000}
                  step={1}
                  required
                  defaultValue={product?.price ?? ''}
                  placeholder="12500"
                  className="min-w-0 flex-1 bg-transparent px-4 py-3.5 text-sm font-bold outline-none"
                />
              </div>
              <span className="mt-2 block text-xs text-[#81756a]">Sólo números enteros, sin centavos.</span>
            </label>

            <label>
              <span className="mb-2 block text-sm font-bold">Categoría</span>
              <select
                name="categoryId"
                required
                defaultValue={product?.categoryId ?? ''}
                className="w-full rounded-xl border border-[#2f271f]/15 bg-[#fbf8f4] px-4 py-3.5 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
              >
                <option value="" disabled>Seleccionar categoría</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </label>

            <label className="md:col-span-2">
              <span className="mb-2 block text-sm font-bold">Imagen</span>
              <input
                name="image"
                maxLength={500}
                defaultValue={product?.image ?? ''}
                placeholder="/imgs/mi-producto.jpeg o https://..."
                className="w-full rounded-xl border border-[#2f271f]/15 bg-[#fbf8f4] px-4 py-3.5 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
              <span className="mt-2 block text-xs leading-5 text-[#81756a]">EP-004 mantiene el mecanismo actual: ruta pública local o URL http/https. La carga de archivos queda para una mejora futura.</span>
            </label>
          </div>
        </div>

        <aside className="space-y-6 bg-[#fffaf4] p-5 md:p-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Publicación</p>
            <h2 className="mt-2 font-[Montserrat] text-xl font-black">Visibilidad inicial</h2>
            <p className="mt-2 text-sm leading-6 text-[#75685d]">Estos estados pueden cambiarse luego sin borrar el producto.</p>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#2f271f]/10 bg-white p-4 transition hover:border-primary/40">
            <input name="isAvailable" type="checkbox" defaultChecked={product?.isAvailable ?? true} className="mt-1 h-4 w-4 accent-[#ff6b00]" />
            <span>
              <span className="block text-sm font-black">Disponible</span>
              <span className="mt-1 block text-xs leading-5 text-[#81756a]">Aparece en el menú y puede incluirse en pedidos.</span>
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#2f271f]/10 bg-white p-4 transition hover:border-primary/40">
            <input name="isFeatured" type="checkbox" defaultChecked={product?.isFeatured ?? false} className="mt-1 h-4 w-4 accent-[#ff6b00]" />
            <span>
              <span className="block text-sm font-black">Destacado</span>
              <span className="mt-1 block text-xs leading-5 text-[#81756a]">Queda preparado para futuras ubicaciones promocionales.</span>
            </span>
          </label>

          {error ? (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>
          ) : null}
          {saved ? (
            <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">Cambios guardados correctamente.</div>
          ) : null}

          <button
            type="submit"
            disabled={isPending || categories.length === 0}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-black text-white shadow-[0_10px_26px_rgba(255,107,0,0.24)] transition hover:bg-[#e66000] disabled:cursor-not-allowed disabled:opacity-55"
          >
            <span className={`material-symbols-outlined text-lg ${isPending ? 'animate-spin' : ''}`}>{isPending ? 'progress_activity' : 'save'}</span>
            {isPending ? 'Guardando…' : isEditing ? 'Guardar cambios' : 'Crear producto'}
          </button>
        </aside>
      </div>
    </form>
  );
}
