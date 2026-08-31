import { prisma } from '@/lib/db';

/**
 * Obtiene todos los productos disponibles y no archivados.
 */
export async function getActiveProducts() {
  return prisma.product.findMany({
    where: {
      isAvailable: true,
      isArchived: false,
    },
    include: {
      category: true,
    },
    orderBy: {
      name: 'asc',
    },
  });
}

/**
 * Obtiene todas las categorías no archivadas.
 */
export async function getCategories() {
  return prisma.category.findMany({
    where: {
      isArchived: false,
    },
    orderBy: {
      name: 'asc',
    },
  });
}
