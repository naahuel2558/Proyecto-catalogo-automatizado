// INFRA-001: debe ser el PRIMER import — aisla la base de tests de Production.
import './_guard-test-db';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { prisma } from '../src/lib/db';
import { AdminAuthorizationError, type AdminActor } from '../src/lib/admin/authorization';
import {
  archiveProductForAdmin,
  createProductForAdmin,
  ProductAdminError,
  restoreProductForAdmin,
  setProductAvailabilityForAdmin,
  setProductFeaturedForAdmin,
  updateProductForAdmin,
} from '../src/lib/admin/products';
import { getActiveProducts } from '../src/lib/data/products';
import { CheckoutError, createSecureOrder } from '../src/lib/orders/secure-checkout';

const suffix = crypto.randomBytes(6).toString('hex');
const activeCategoryId = `ep004-active-category-${suffix}`;
const archivedCategoryId = `ep004-archived-category-${suffix}`;
const productName = `Producto Admin EP-004 ${suffix}`;
const admin: AdminActor = { id: `admin-${suffix}`, role: 'ADMIN' };
const user: AdminActor = { id: `user-${suffix}`, role: 'USER' };
let productId: string | undefined;

const validInput = {
  name: productName,
  description: 'Fixture aislada para Product Admin',
  price: '1250',
  image: `/imgs/ep004-${suffix}.jpeg`,
  categoryId: activeCategoryId,
  isAvailable: true,
  isFeatured: false,
};

async function expectAdminError(
  operation: () => Promise<unknown>,
  errorType: typeof AdminAuthorizationError | typeof ProductAdminError,
  code: string,
) {
  await assert.rejects(
    operation,
    (error: unknown) => error instanceof errorType && error.code === code,
  );
}

async function checkout(product: string) {
  return createSecureOrder({
    items: [{ productId: product, quantity: 1 }],
    customerName: 'Prueba EP-004',
    customerPhone: '+54 9 358 1234567',
    fulfillmentType: 'PICKUP',
  }, null);
}

async function main() {
  try {
    await prisma.category.createMany({
      data: [
        { id: activeCategoryId, name: `EP-004 activa ${suffix}`, slug: `ep004-active-${suffix}` },
        { id: archivedCategoryId, name: `EP-004 archivada ${suffix}`, slug: `ep004-archived-${suffix}`, isArchived: true },
      ],
    });

    // A: un USER no puede crear productos.
    await expectAdminError(
      () => createProductForAdmin(validInput, user),
      AdminAuthorizationError,
      'FORBIDDEN',
    );

    // B: una mutación sin sesión se rechaza antes de consultar el producto.
    await expectAdminError(
      () => updateProductForAdmin(`missing-${suffix}`, validInput, null),
      AdminAuthorizationError,
      'UNAUTHORIZED',
    );

    // C: ADMIN crea un producto válido y empieza sin archivar.
    const created = await createProductForAdmin(validInput, admin);
    productId = created.id;
    let product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
    assert.equal(product.name, productName);
    assert.equal(product.price, 1250);
    assert.equal(product.isArchived, false);

    // D-E: los precios decimales y negativos se rechazan.
    await expectAdminError(
      () => createProductForAdmin({ ...validInput, name: `${productName} decimal`, price: '9500.5' }, admin),
      ProductAdminError,
      'INVALID_INPUT',
    );
    await expectAdminError(
      () => createProductForAdmin({ ...validInput, name: `${productName} negativo`, price: -100 }, admin),
      ProductAdminError,
      'INVALID_INPUT',
    );

    // F-G: la categoría debe existir y estar activa.
    await expectAdminError(
      () => createProductForAdmin({ ...validInput, name: `${productName} sin categoría`, categoryId: `missing-${suffix}` }, admin),
      ProductAdminError,
      'CATEGORY_NOT_FOUND',
    );
    await expectAdminError(
      () => createProductForAdmin({ ...validInput, name: `${productName} archivada`, categoryId: archivedCategoryId }, admin),
      ProductAdminError,
      'CATEGORY_ARCHIVED',
    );

    // H: editar Product no altera el snapshot histórico; checkout usa el precio nuevo.
    const historicalOrder = await prisma.order.create({
      data: {
        orderCode: `EP-ADMIN-${suffix.toUpperCase()}`,
        total: 1250,
        status: 'DELIVERED',
        items: {
          create: {
            productId,
            productName,
            unitPrice: 1250,
            quantity: 1,
          },
        },
      },
      include: { items: true },
    });
    await updateProductForAdmin(productId, { ...validInput, price: '2500', name: `${productName} editado` }, admin);
    product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
    const historicalItem = await prisma.orderItem.findFirstOrThrow({ where: { orderId: historicalOrder.id } });
    assert.equal(product.price, 2500);
    assert.equal(historicalItem.unitPrice, 1250);
    assert.equal(historicalItem.productName, productName);

    const currentCheckout = await checkout(productId);
    assert.equal(currentCheckout.order.items[0].unitPrice, 2500);
    assert.equal(currentCheckout.order.total, 2500);

    await setProductFeaturedForAdmin(productId, true, admin);
    assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: productId } })).isFeatured, true);

    // I: no disponible desaparece del catálogo y Secure Checkout lo rechaza.
    await setProductAvailabilityForAdmin(productId, false, admin);
    assert.equal((await getActiveProducts()).some((item) => item.id === productId), false);
    await assert.rejects(
      () => checkout(productId as string),
      (error: unknown) => error instanceof CheckoutError && error.code === 'PRODUCT_UNAVAILABLE',
    );

    // J: archivado desaparece del catálogo y Secure Checkout lo rechaza.
    await archiveProductForAdmin(productId, admin);
    assert.equal((await getActiveProducts()).some((item) => item.id === productId), false);
    await assert.rejects(
      () => checkout(productId as string),
      (error: unknown) => error instanceof CheckoutError && error.code === 'PRODUCT_ARCHIVED',
    );

    // K: restaurar sólo quita el archivo; disponibilidad e históricos se preservan.
    await restoreProductForAdmin(productId, admin);
    product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
    assert.equal(product.isArchived, false);
    assert.equal(product.isAvailable, false);
    const preservedItem = await prisma.orderItem.findFirstOrThrow({ where: { orderId: historicalOrder.id } });
    assert.equal(preservedItem.unitPrice, 1250);
    assert.equal(preservedItem.productName, productName);

    console.log('EP-004 Product Admin: casos A-K aprobados.');
  } finally {
    if (productId) {
      await prisma.order.deleteMany({ where: { items: { some: { productId } } } });
      await prisma.product.deleteMany({ where: { id: productId } });
    }
    await prisma.product.deleteMany({ where: { name: { startsWith: productName } } });
    await prisma.category.deleteMany({ where: { id: { in: [activeCategoryId, archivedCategoryId] } } });
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
