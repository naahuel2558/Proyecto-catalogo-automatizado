import Link from 'next/link';
import AdminShell from '@/components/admin/AdminShell';
import ProductForm from '@/components/admin/ProductForm';
import { requireAdminPage } from '@/lib/admin/page-auth';
import { getAdminCategories } from '@/lib/admin/products';

export default async function NewProductPage() {
  await requireAdminPage();
  const categories = await getAdminCategories();

  return (
    <AdminShell
      eyebrow="Catálogo / Nuevo"
      title="Sumá una nueva propuesta."
      description="Creá el producto una vez en la base de datos y quedará disponible para el menú, el checkout seguro y la administración."
      actions={<Link href="/admin/productos" className="inline-flex items-center gap-2 rounded-xl border border-[#2f271f]/15 bg-white px-5 py-3 text-sm font-black transition hover:border-primary hover:text-primary"><span className="material-symbols-outlined text-lg">arrow_back</span>Volver</Link>}
    >
      {categories.length === 0 ? (
        <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">No hay categorías activas. EP-004 no crea categorías; necesitás una categoría existente para continuar.</div>
      ) : null}
      <ProductForm categories={categories} />
    </AdminShell>
  );
}
