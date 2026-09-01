import { PrismaClient } from '@prisma/client';
import { INITIAL_PRODUCTS } from '../src/lib/data/menu';

/**
 * INFRA-001 — Proteccion del seed frente a bases no locales.
 *
 * Este seed es bootstrap de DESARROLLO, no una migracion de datos productivos.
 * No borra filas, pero el `update` de cada producto reescribe name, description,
 * price, image, categoryId e isAvailable con los valores hardcodeados de
 * `src/lib/data/menu.ts`. Ejecutarlo contra produccion revertiria cualquier precio
 * o disponibilidad que el administrador haya cambiado desde /admin/productos.
 *
 * Por eso solo corre sin friccion contra una base local. Contra cualquier otra hay
 * que confirmar explicitamente con SEED_ALLOW_NON_LOCAL=1.
 */
const databaseUrl = process.env.DATABASE_URL ?? '';
const isLocalDatabase = databaseUrl.startsWith('file:');

if (!isLocalDatabase && process.env.SEED_ALLOW_NON_LOCAL !== '1') {
  console.error('\n[INFRA-001] Seed ABORTADO.\n');
  console.error('DATABASE_URL no apunta a una base local y el seed sobrescribe');
  console.error('precios, nombres y disponibilidad del catalogo con los valores de');
  console.error('src/lib/data/menu.ts. En produccion eso revierte los cambios hechos');
  console.error('desde /admin/productos.\n');
  console.error('Si realmente es un bootstrap inicial de una base vacia:');
  console.error('  SEED_ALLOW_NON_LOCAL=1 npx prisma db seed\n');
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando el seed del catálogo...');

  // 1. Extraer categorías únicas del menú actual
  const categoryNames = Array.from(new Set(INITIAL_PRODUCTS.map(p => p.category)));
  
  const categoriesMap = new Map<string, string>(); // slug -> id

  // 2. Upsert de cada categoría
  for (const slug of categoryNames) {
    // Generar un nombre legible básico desde el slug (ej. "lomos" -> "Lomos")
    const name = slug.charAt(0).toUpperCase() + slug.slice(1);
    
    const category = await prisma.category.upsert({
      where: { slug },
      update: {},
      create: {
        name,
        slug,
      },
    });
    categoriesMap.set(slug, category.id);
    console.log(`✅ Categoría asegurada: ${name}`);
  }

  // 3. Upsert de cada producto
  for (const product of INITIAL_PRODUCTS) {
    const categoryId = categoriesMap.get(product.category);
    
    if (!categoryId) {
      console.warn(`⚠️ No se encontró la categoría ${product.category} para el producto ${product.id}`);
      continue;
    }

    await prisma.product.upsert({
      where: { id: product.id },
      update: {
        name: product.name,
        description: product.description,
        price: product.price,
        image: product.image || null,
        badge: product.badge || null,
        categoryId: categoryId,
        isAvailable: product.available,
      },
      create: {
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        image: product.image || null,
        badge: product.badge || null,
        categoryId: categoryId,
        isAvailable: product.available,
      },
    });
    console.log(`✅ Producto asegurado: ${product.name}`);
  }

  console.log('🎉 Seed del catálogo completado exitosamente.');
}

main()
  .catch((e) => {
    console.error('Error durante el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
