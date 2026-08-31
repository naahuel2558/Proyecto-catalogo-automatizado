import { PrismaClient } from '@prisma/client';
import { INITIAL_PRODUCTS } from '../src/lib/data/menu';

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
