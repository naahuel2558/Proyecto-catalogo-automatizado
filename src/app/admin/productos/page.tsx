import Link from 'next/link';
import AdminShell from '@/components/admin/AdminShell';
import { requireAdminPage } from '@/lib/admin/page-auth';
import {
  getAdminCategoryFilters,
  getAdminProducts,
  type ProductAdminFilters,
} from '@/lib/admin/products';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function statusBadge(label: string, tone: 'green' | 'amber' | 'orange' | 'gray') {
  const tones = {
    green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    orange: 'border-orange-200 bg-orange-50 text-orange-700',
    gray: 'border-stone-200 bg-stone-100 text-stone-600',
  };
  return <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${tones[tone]}`}>{label}</span>;
}

export default async function AdminProductsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdminPage();
  const query = await searchParams;
  const availabilityValue = first(query.disponibilidad);
  const archiveValue = first(query.estado);
  const filters: ProductAdminFilters = {
    search: first(query.buscar),
    categoryId: first(query.categoria),
    availability: availabilityValue === 'available' || availabilityValue === 'unavailable'
      ? availabilityValue
      : undefined,
    archive: archiveValue === 'archived' || archiveValue === 'all' ? archiveValue : 'active',
  };
  const [products, categories] = await Promise.all([
    getAdminProducts(filters),
    getAdminCategoryFilters(),
  ]);
  const availableCount = products.filter((product) => product.isAvailable && !product.isArchived).length;
  const featuredCount = products.filter((product) => product.isFeatured).length;
  const archivedCount = products.filter((product) => product.isArchived).length;

  return (
    <AdminShell
      eyebrow="Catálogo / Productos"
      title="El menú, bajo control."
      description="Gestioná precios, disponibilidad y publicación desde una única fuente de verdad. Los cambios impactan en el catálogo sin tocar código."
      actions={(
        <Link href="/admin/productos/nuevo" className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-black text-white shadow-[0_10px_26px_rgba(255,107,0,0.24)] transition hover:-translate-y-0.5 hover:bg-[#e66000]">
          <span className="material-symbols-outlined text-lg">add</span>
          Nuevo producto
        </Link>
      )}
    >
      <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ['Resultados', products.length, 'inventory_2'],
          ['Disponibles', availableCount, 'check_circle'],
          ['Destacados', featuredCount, 'star'],
          ['Archivados', archivedCount, 'archive'],
        ].map(([label, value, icon]) => (
          <div key={String(label)} className="rounded-2xl border border-[#2f271f]/10 bg-white p-4 shadow-[0_8px_30px_rgba(72,54,36,0.05)] md:p-5">
            <span className="material-symbols-outlined text-xl text-primary">{icon}</span>
            <p className="mt-3 font-[Montserrat] text-2xl font-black">{value}</p>
            <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-[#81756a]">{label}</p>
          </div>
        ))}
      </section>

      <form method="get" className="mb-6 grid gap-3 rounded-2xl border border-[#2f271f]/10 bg-white p-4 shadow-[0_8px_30px_rgba(72,54,36,0.05)] md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_auto]">
        <label>
          <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.12em] text-[#81756a]">Buscar</span>
          <input name="buscar" defaultValue={filters.search ?? ''} placeholder="Nombre del producto" className="w-full rounded-xl border border-[#2f271f]/15 bg-[#fbf8f4] px-3.5 py-3 text-sm outline-none focus:border-primary" />
        </label>
        <label>
          <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.12em] text-[#81756a]">Categoría</span>
          <select name="categoria" defaultValue={filters.categoryId ?? ''} className="w-full rounded-xl border border-[#2f271f]/15 bg-[#fbf8f4] px-3.5 py-3 text-sm outline-none focus:border-primary">
            <option value="">Todas</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}{category.isArchived ? ' (archivada)' : ''}</option>)}
          </select>
        </label>
        <label>
          <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.12em] text-[#81756a]">Disponibilidad</span>
          <select name="disponibilidad" defaultValue={filters.availability ?? ''} className="w-full rounded-xl border border-[#2f271f]/15 bg-[#fbf8f4] px-3.5 py-3 text-sm outline-none focus:border-primary">
            <option value="">Todas</option>
            <option value="available">Disponible</option>
            <option value="unavailable">No disponible</option>
          </select>
        </label>
        <label>
          <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.12em] text-[#81756a]">Archivo</span>
          <select name="estado" defaultValue={filters.archive ?? 'active'} className="w-full rounded-xl border border-[#2f271f]/15 bg-[#fbf8f4] px-3.5 py-3 text-sm outline-none focus:border-primary">
            <option value="active">Activos</option>
            <option value="archived">Archivados</option>
            <option value="all">Todos</option>
          </select>
        </label>
        <div className="flex items-end gap-2">
          <button className="h-[46px] flex-1 rounded-xl bg-[#211c17] px-5 text-sm font-black text-white transition hover:bg-[#3a3129]">Filtrar</button>
          <Link href="/admin/productos" title="Limpiar filtros" className="flex h-[46px] w-[46px] items-center justify-center rounded-xl border border-[#2f271f]/15 bg-[#fbf8f4] text-[#6f6256] transition hover:border-primary hover:text-primary">
            <span className="material-symbols-outlined text-lg">filter_alt_off</span>
          </Link>
        </div>
      </form>

      <section className="overflow-hidden rounded-[24px] border border-[#2f271f]/10 bg-white shadow-[0_18px_60px_rgba(72,54,36,0.08)]">
        <div className="hidden grid-cols-[minmax(220px,1.5fr)_1fr_0.7fr_1.3fr_0.8fr] gap-4 border-b border-[#2f271f]/10 bg-[#211c17] px-5 py-3.5 text-[11px] font-black uppercase tracking-[0.12em] text-white/60 lg:grid">
          <span>Producto</span><span>Categoría</span><span>Precio</span><span>Estado</span><span className="text-right">Acción</span>
        </div>
        {products.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <span className="material-symbols-outlined text-5xl text-[#b5aa9f]">search_off</span>
            <h2 className="mt-4 font-[Montserrat] text-xl font-black">No encontramos productos</h2>
            <p className="mt-2 text-sm text-[#81756a]">Probá con otros filtros o creá un producto nuevo.</p>
          </div>
        ) : products.map((product) => (
          <article key={product.id} className="grid gap-4 border-b border-[#2f271f]/10 px-5 py-5 last:border-b-0 lg:grid-cols-[minmax(220px,1.5fr)_1fr_0.7fr_1.3fr_0.8fr] lg:items-center">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#f4efe8] font-[Montserrat] text-sm font-black text-primary">{product.name.slice(0, 2).toUpperCase()}</div>
              <div className="min-w-0">
                <h2 className="truncate font-[Montserrat] text-sm font-black">{product.name}</h2>
                <p className="mt-1 text-xs text-[#81756a]">Actualizado {new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium' }).format(product.updatedAt)}</p>
              </div>
            </div>
            <p className="text-sm font-semibold text-[#5f5348]"><span className="mr-2 text-[10px] font-black uppercase text-[#9a8e82] lg:hidden">Categoría</span>{product.category.name}</p>
            <p className="font-[Montserrat] text-lg font-black"><span className="mr-2 text-[10px] font-black uppercase text-[#9a8e82] lg:hidden">Precio</span>${product.price.toLocaleString('es-AR')}</p>
            <div className="flex flex-wrap gap-1.5">
              {product.isArchived
                ? statusBadge('Archivado', 'gray')
                : product.isAvailable
                  ? statusBadge('Disponible', 'green')
                  : statusBadge('No disponible', 'amber')}
              {product.isFeatured ? statusBadge('Destacado', 'orange') : null}
            </div>
            <div className="lg:text-right">
              <Link href={`/admin/productos/${product.id}`} className="inline-flex items-center gap-1.5 rounded-xl border border-[#2f271f]/15 px-4 py-2.5 text-xs font-black transition hover:border-primary hover:bg-primary hover:text-white">
                Editar <span className="material-symbols-outlined text-base">arrow_forward</span>
              </Link>
            </div>
          </article>
        ))}
      </section>
    </AdminShell>
  );
}
