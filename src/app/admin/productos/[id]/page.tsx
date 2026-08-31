import Link from 'next/link';
import { notFound } from 'next/navigation';
import AdminShell from '@/components/admin/AdminShell';
import ProductForm from '@/components/admin/ProductForm';
import ProductStateActions from '@/components/admin/ProductStateActions';
import { requireAdminPage } from '@/lib/admin/page-auth';
import { getAdminCategories, getAdminProduct } from '@/lib/admin/products';

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  const [product, categories] = await Promise.all([
    getAdminProduct(id),
    getAdminCategories(),
  ]);
  if (!product) notFound();

  return (
    <AdminShell
      eyebrow={`Catálogo / ${product.category.name}`}
      title={product.name}
      description="Editá la ficha comercial o cambiá su estado. Las órdenes existentes conservan el nombre y precio históricos."
      actions={<Link href="/admin/productos" className="inline-flex items-center gap-2 rounded-xl border border-[#2f271f]/15 bg-white px-5 py-3 text-sm font-black transition hover:border-primary hover:text-primary"><span className="material-symbols-outlined text-lg">arrow_back</span>Volver al listado</Link>}
    >
      {product.isArchived ? (
        <div className="mb-5 flex items-center gap-3 rounded-2xl border border-stone-300 bg-stone-100 p-4 text-sm font-semibold text-stone-700">
          <span className="material-symbols-outlined">archive</span>
          Este producto está archivado y no aparece en el catálogo público.
        </div>
      ) : null}
      <ProductForm
        categories={categories}
        product={{
          id: product.id,
          name: product.name,
          description: product.description,
          price: product.price,
          image: product.image,
          categoryId: product.categoryId,
          isAvailable: product.isAvailable,
          isFeatured: product.isFeatured,
        }}
      />
      <ProductStateActions
        productId={product.id}
        isAvailable={product.isAvailable}
        isFeatured={product.isFeatured}
        isArchived={product.isArchived}
      />
    </AdminShell>
  );
}
