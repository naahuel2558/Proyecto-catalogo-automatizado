import Link from 'next/link';
import { notFound } from 'next/navigation';
import AdminShell from '@/components/admin/AdminShell';
import CategoryForm from '@/components/admin/CategoryForm';
import CategoryStateActions from '@/components/admin/CategoryStateActions';
import { requireAdminPage } from '@/lib/admin/page-auth';
import { getAdminCategory } from '@/lib/admin/categories';

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  const category = await getAdminCategory(id);
  if (!category) notFound();

  return (
    <AdminShell
      eyebrow="Catálogo / Categoría"
      title={category.name}
      description={`Esta categoría agrupa ${category._count.products} ${category._count.products === 1 ? 'producto' : 'productos'}. Renombrarla o archivarla no altera esas fichas ni sus pedidos.`}
      actions={<Link href="/admin/categorias" className="inline-flex items-center gap-2 rounded-xl border border-[#2f271f]/15 bg-white px-5 py-3 text-sm font-black transition hover:border-primary hover:text-primary"><span className="material-symbols-outlined text-lg">arrow_back</span>Volver al listado</Link>}
    >
      {category.isArchived ? <div className="mb-5 flex items-center gap-3 rounded-2xl border border-stone-300 bg-stone-100 p-4 text-sm font-semibold text-stone-700"><span className="material-symbols-outlined">archive</span>Esta categoría está archivada y no puede asignarse a productos nuevos.</div> : null}
      <CategoryForm category={{ id: category.id, name: category.name }} />
      <CategoryStateActions categoryId={category.id} isArchived={category.isArchived} />
    </AdminShell>
  );
}
