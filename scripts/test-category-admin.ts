// INFRA-001: debe ser el PRIMER import — aisla la base de tests de Production.
import './_guard-test-db';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { prisma } from '../src/lib/db';
import { AdminAuthorizationError, type AdminActor } from '../src/lib/admin/authorization';
import {
  archiveCategoryForAdmin,
  CategoryAdminError,
  categorySlug,
  createCategoryForAdmin,
  getAdminCategoryList,
  restoreCategoryForAdmin,
  updateCategoryForAdmin,
} from '../src/lib/admin/categories';
import { getAdminCategories, getAdminCategoryFilters } from '../src/lib/admin/products';
import { getActiveProducts } from '../src/lib/data/products';
import { createSecureOrder } from '../src/lib/orders/secure-checkout';

const suffix = crypto.randomBytes(6).toString('hex');
const originalName = `Categoría EP-005 ${suffix}`;
const editedName = `Categoría Renovada EP-005 ${suffix}`;
const productId = `ep005-product-${suffix}`;
const admin: AdminActor = { id: `admin-${suffix}`, role: 'ADMIN' };
const user: AdminActor = { id: `user-${suffix}`, role: 'USER' };
const categoryIds: string[] = [];

async function expectError(
  operation: () => Promise<unknown>,
  errorType: typeof AdminAuthorizationError | typeof CategoryAdminError,
  code: string,
) {
  await assert.rejects(
    operation,
    (error: unknown) => error instanceof errorType && error.code === code,
  );
}

async function main() {
  try {
    const countBeforeUnauthorizedCreate = await prisma.category.count();

    // A: USER no puede crear; la autorización ocurre antes de escribir.
    await expectError(
      () => createCategoryForAdmin({ name: originalName }, user),
      AdminAuthorizationError,
      'FORBIDDEN',
    );
    assert.equal(await prisma.category.count(), countBeforeUnauthorizedCreate);

    // B: sin sesión no se puede editar, incluso si el id no existe.
    await expectError(
      () => updateCategoryForAdmin(`missing-${suffix}`, { name: originalName }, null),
      AdminAuthorizationError,
      'UNAUTHORIZED',
    );

    // C: ADMIN crea una categoría activa con slug derivado.
    const created = await createCategoryForAdmin({ name: `  ${originalName}  ` }, admin);
    categoryIds.push(created.id);
    let category = await prisma.category.findUniqueOrThrow({ where: { id: created.id } });
    assert.equal(category.name, originalName);
    assert.equal(category.slug, categorySlug(originalName));
    assert.equal(category.isArchived, false);

    // D: el nombre vacío se rechaza.
    await expectError(
      () => createCategoryForAdmin({ name: '   ' }, admin),
      CategoryAdminError,
      'INVALID_INPUT',
    );

    // E: nombres equivalentes no crean slugs duplicados.
    await expectError(
      () => createCategoryForAdmin({ name: originalName.toUpperCase() }, admin),
      CategoryAdminError,
      'CATEGORY_ALREADY_EXISTS',
    );

    await prisma.product.create({
      data: {
        id: productId,
        name: `Producto EP-005 ${suffix}`,
        description: 'Fixture aislada para Category Admin',
        price: 1750,
        categoryId: created.id,
        isAvailable: true,
      },
    });
    const historicalOrder = await prisma.order.create({
      data: {
        orderCode: `EP-CAT-${suffix.toUpperCase()}`,
        total: 1750,
        status: 'DELIVERED',
        items: {
          create: {
            productId,
            productName: `Producto histórico EP-005 ${suffix}`,
            unitPrice: 1750,
            quantity: 1,
          },
        },
      },
      include: { items: true },
    });
    const productBefore = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
    const orderBefore = await prisma.order.findUniqueOrThrow({
      where: { id: historicalOrder.id },
      include: { items: true },
    });

    // F: editar actualiza nombre/slug y conserva la relación del producto.
    await updateCategoryForAdmin(created.id, { name: editedName }, admin);
    category = await prisma.category.findUniqueOrThrow({ where: { id: created.id } });
    assert.equal(category.name, editedName);
    assert.equal(category.slug, categorySlug(editedName));
    assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: productId } })).categoryId, created.id);

    // G: archivar es lógico.
    await archiveCategoryForAdmin(created.id, admin);
    category = await prisma.category.findUniqueOrThrow({ where: { id: created.id } });
    assert.equal(category.isArchived, true);

    // H: una categoría archivada deja de estar disponible para nuevas asociaciones.
    assert.equal((await getAdminCategories()).some((item) => item.id === created.id), false);

    // I: sigue disponible en filtros e históricos administrativos.
    assert.equal((await getAdminCategoryFilters()).some((item) => item.id === created.id && item.isArchived), true);
    assert.equal((await getAdminCategoryList({ archive: 'archived' })).some((item) => item.id === created.id), true);

    // La decisión explícita de EP-005: el producto continúa visible y comprable.
    assert.equal((await getActiveProducts()).some((item) => item.id === productId), true);
    const checkout = await createSecureOrder({
      items: [{ productId, quantity: 1 }],
      customerName: 'Prueba EP-005',
      customerPhone: '+54 9 358 1234567',
      fulfillmentType: 'PICKUP',
    }, null);
    assert.equal(checkout.order.total, 1750);

    // J: restaurar vuelve a habilitar la categoría para asociaciones.
    await restoreCategoryForAdmin(created.id, admin);
    category = await prisma.category.findUniqueOrThrow({ where: { id: created.id } });
    assert.equal(category.isArchived, false);
    assert.equal((await getAdminCategories()).some((item) => item.id === created.id), true);

    // K: editar/archivar/restaurar una categoría no modifica el producto.
    const productAfter = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
    assert.deepEqual(productAfter, productBefore);

    // L: las órdenes y sus snapshots históricos permanecen intactos.
    const orderAfter = await prisma.order.findUniqueOrThrow({
      where: { id: historicalOrder.id },
      include: { items: true },
    });
    assert.deepEqual(orderAfter, orderBefore);

    console.log('EP-005 Category Admin: casos A-L aprobados.');
  } finally {
    await prisma.order.deleteMany({ where: { items: { some: { productId } } } });
    await prisma.product.deleteMany({ where: { id: productId } });
    if (categoryIds.length > 0) {
      await prisma.category.deleteMany({ where: { id: { in: categoryIds } } });
    }
    await prisma.category.deleteMany({ where: { slug: { contains: suffix } } });
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
