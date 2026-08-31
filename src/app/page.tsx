import React from 'react';
import { getActiveProducts, getCategories } from '@/lib/data/products';
import MenuClient from '@/components/MenuClient';
import { Product } from '@/types';

export const revalidate = 0; // Para que recargue siempre los productos de la DB y no quede cacheado en la home si cambian (Opcional, pero útil en Next.js App Router para rotisería)

export default async function MenuPage() {
  const dbProducts = await getActiveProducts();
  const dbCategories = await getCategories();
  
  // Mapeamos los datos de la base de datos a la estructura exacta que espera el cliente,
  // para no romper ninguna funcionalidad existente.
  const mappedProducts: Product[] = dbProducts.map(p => ({
    id: p.id,
    name: p.name,
    description: p.description,
    price: p.price,
    category: p.category.slug, // El tipo frontend ya no está restringido a literales
    image: p.image || undefined,
    badge: p.badge || undefined,
    available: p.isAvailable,
  }));

  const mappedCategories = dbCategories.map(c => ({
    id: c.id,
    name: c.name,
    slug: c.slug
  }));

  return <MenuClient initialProducts={mappedProducts} categories={mappedCategories} />;
}
