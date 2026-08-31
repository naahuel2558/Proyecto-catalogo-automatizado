import Link from 'next/link';
import AdminShell from '@/components/admin/AdminShell';
import CategoryForm from '@/components/admin/CategoryForm';
import { requireAdminPage } from '@/lib/admin/page-auth';

export default async function NewCategoryPage() {
  await requireAdminPage();
  return (
    <AdminShell
      eyebrow="Catálogo / Nueva categoría"
      title="Dale un lugar a lo próximo."
      description="Definí una categoría activa para organizar productos actuales y futuros."
      actions={<Link href="/admin/categorias" className="inline-flex items-center gap-2 rounded-xl border border-[#2f271f]/15 bg-white px-5 py-3 text-sm font-black transition hover:border-primary hover:text-primary"><span className="material-symbols-outlined text-lg">arrow_back</span>Volver</Link>}
    >
      <CategoryForm />
    </AdminShell>
  );
}
