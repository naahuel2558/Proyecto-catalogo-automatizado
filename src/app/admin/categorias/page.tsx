import Link from 'next/link';
import AdminShell from '@/components/admin/AdminShell';
import { requireAdminPage } from '@/lib/admin/page-auth';
import {
  getAdminCategoryList,
  type CategoryAdminFilters,
} from '@/lib/admin/categories';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminCategoriesPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdminPage();
  const query = await searchParams;
  const archiveValue = first(query.estado);
  const filters: CategoryAdminFilters = {
    search: first(query.buscar),
    archive: archiveValue === 'archived' || archiveValue === 'all' ? archiveValue : 'active',
  };
  const categories = await getAdminCategoryList(filters);
  const productCount = categories.reduce((total, category) => total + category._count.products, 0);
  const archivedCount = categories.filter((category) => category.isArchived).length;

  return (
    <AdminShell
      eyebrow="Catálogo / Categorías"
      title="Orden para un menú que crece."
      description="Creá y organizá las familias del catálogo sin romper productos ni el historial comercial."
      actions={<Link href="/admin/categorias/nueva" className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-black text-white shadow-[0_10px_26px_rgba(255,107,0,0.24)] transition hover:-translate-y-0.5 hover:bg-[#e66000]"><span className="material-symbols-outlined text-lg">add</span>Nueva categoría</Link>}
    >
      <section className="mb-6 grid gap-3 sm:grid-cols-3">
        {[
          ['Resultados', categories.length, 'category'],
          ['Productos vinculados', productCount, 'inventory_2'],
          ['Archivadas', archivedCount, 'archive'],
        ].map(([label, value, icon]) => (
          <div key={String(label)} className="rounded-2xl border border-[#2f271f]/10 bg-white p-4 shadow-[0_8px_30px_rgba(72,54,36,0.05)] md:p-5">
            <span className="material-symbols-outlined text-xl text-primary">{icon}</span>
            <p className="mt-3 font-[Montserrat] text-2xl font-black">{value}</p>
            <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-[#81756a]">{label}</p>
          </div>
        ))}
      </section>

      <form method="get" className="mb-6 grid gap-3 rounded-2xl border border-[#2f271f]/10 bg-white p-4 shadow-[0_8px_30px_rgba(72,54,36,0.05)] md:grid-cols-[1.5fr_1fr_auto]">
        <label>
          <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.12em] text-[#81756a]">Buscar</span>
          <input name="buscar" defaultValue={filters.search ?? ''} placeholder="Nombre de la categoría" className="w-full rounded-xl border border-[#2f271f]/15 bg-[#fbf8f4] px-3.5 py-3 text-sm outline-none focus:border-primary" />
        </label>
        <label>
          <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.12em] text-[#81756a]">Estado</span>
          <select name="estado" defaultValue={filters.archive} className="w-full rounded-xl border border-[#2f271f]/15 bg-[#fbf8f4] px-3.5 py-3 text-sm outline-none focus:border-primary">
            <option value="active">Activas</option>
            <option value="archived">Archivadas</option>
            <option value="all">Todas</option>
          </select>
        </label>
        <div className="flex items-end gap-2">
          <button className="h-[46px] flex-1 rounded-xl bg-[#211c17] px-5 text-sm font-black text-white transition hover:bg-[#3a3129]">Filtrar</button>
          <Link href="/admin/categorias" title="Limpiar filtros" className="flex h-[46px] w-[46px] items-center justify-center rounded-xl border border-[#2f271f]/15 bg-[#fbf8f4] text-[#6f6256] transition hover:border-primary hover:text-primary"><span className="material-symbols-outlined text-lg">filter_alt_off</span></Link>
        </div>
      </form>

      <section className="overflow-hidden rounded-[24px] border border-[#2f271f]/10 bg-white shadow-[0_18px_60px_rgba(72,54,36,0.08)]">
        <div className="hidden grid-cols-[1.5fr_0.7fr_0.8fr_1fr_0.7fr] gap-4 border-b border-[#2f271f]/10 bg-[#211c17] px-5 py-3.5 text-[11px] font-black uppercase tracking-[0.12em] text-white/60 md:grid">
          <span>Categoría</span><span>Productos</span><span>Estado</span><span>Actualización</span><span className="text-right">Acción</span>
        </div>
        {categories.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <span className="material-symbols-outlined text-5xl text-[#b5aa9f]">search_off</span>
            <h2 className="mt-4 font-[Montserrat] text-xl font-black">No encontramos categorías</h2>
            <p className="mt-2 text-sm text-[#81756a]">Probá con otros filtros o creá una categoría nueva.</p>
          </div>
        ) : categories.map((category) => (
          <article key={category.id} className="grid gap-4 border-b border-[#2f271f]/10 px-5 py-5 last:border-b-0 md:grid-cols-[1.5fr_0.7fr_0.8fr_1fr_0.7fr] md:items-center">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f4efe8] text-primary"><span className="material-symbols-outlined">category</span></div>
              <h2 className="font-[Montserrat] text-sm font-black">{category.name}</h2>
            </div>
            <p className="text-sm font-bold text-[#5f5348]"><span className="mr-2 text-[10px] uppercase text-[#9a8e82] md:hidden">Productos</span>{category._count.products}</p>
            <div><span className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${category.isArchived ? 'border-stone-200 bg-stone-100 text-stone-600' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{category.isArchived ? 'Archivada' : 'Activa'}</span></div>
            <p className="text-xs text-[#81756a]">{new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium' }).format(category.updatedAt)}</p>
            <div className="md:text-right"><Link href={`/admin/categorias/${category.id}`} className="inline-flex items-center gap-1.5 rounded-xl border border-[#2f271f]/15 px-4 py-2.5 text-xs font-black transition hover:border-primary hover:bg-primary hover:text-white">Editar <span className="material-symbols-outlined text-base">arrow_forward</span></Link></div>
          </article>
        ))}
      </section>
    </AdminShell>
  );
}
