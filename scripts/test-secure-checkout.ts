import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { prisma } from '../src/lib/db';
import {
  CheckoutError,
  createSecureOrder,
  parseCheckoutInput,
  parseReceiptRequest,
  type CheckoutErrorCode,
} from '../src/lib/orders/secure-checkout';
import { ORDER_STATUS } from '../src/types';

const suffix = crypto.randomBytes(6).toString('hex');
const categoryId = `ep003-category-${suffix}`;
const categorySlug = `ep003-test-${suffix}`;
const activeProductId = `ep003-active-${suffix}`;
const unavailableProductId = `ep003-unavailable-${suffix}`;
const archivedProductId = `ep003-archived-${suffix}`;
const productIds = [activeProductId, unavailableProductId, archivedProductId];
let createdOrderCode: string | undefined;

const baseContact = {
  customerName: 'Prueba EP-003',
  customerPhone: '+54 9 358 1234567',
  fulfillmentType: 'PICKUP' as const,
};

function expectValidationError(run: () => unknown, code: CheckoutErrorCode) {
  assert.throws(run, (error: unknown) => error instanceof CheckoutError && error.code === code);
}

async function expectCheckoutError(input: unknown, code: CheckoutErrorCode) {
  const before = await prisma.order.count();
  await assert.rejects(
    () => createSecureOrder(input, null),
    (error: unknown) => error instanceof CheckoutError && error.code === code,
  );
  assert.equal(await prisma.order.count(), before, 'Un pedido inválido no debe crear una Order');
}

async function main() {
  try {
    await prisma.category.create({
    data: { id: categoryId, name: `EP-003 Test ${suffix}`, slug: categorySlug },
  });
  await prisma.product.createMany({
    data: [
      {
        id: activeProductId,
        name: 'Producto activo EP-003',
        description: 'Fixture temporal',
        price: 1250,
        categoryId,
      },
      {
        id: unavailableProductId,
        name: 'Producto no disponible EP-003',
        description: 'Fixture temporal',
        price: 900,
        categoryId,
        isAvailable: false,
      },
      {
        id: archivedProductId,
        name: 'Producto archivado EP-003',
        description: 'Fixture temporal',
        price: 800,
        categoryId,
        isArchived: true,
      },
    ],
  });

  // A: el nuevo contrato rechaza precios enviados por el navegador.
  expectValidationError(
    () => parseCheckoutInput({
      ...baseContact,
      items: [{ productId: activeProductId, quantity: 1, price: 1 }],
    }),
    'INVALID_INPUT',
  );

  // El endpoint de recibos tampoco acepta un texto comercial armado por el cliente.
  expectValidationError(
    () => parseReceiptRequest({
      orderCode: 'EP-A1B2C3D4E5',
      customerName: baseContact.customerName,
      customerPhone: baseContact.customerPhone,
      receiptText: '_Total:_ $0',
    }),
    'INVALID_INPUT',
  );

  // B: el nuevo contrato rechaza un total propuesto por el navegador.
  expectValidationError(
    () => parseCheckoutInput({
      ...baseContact,
      items: [{ productId: activeProductId, quantity: 1 }],
      total: 0,
    }),
    'INVALID_INPUT',
  );

  // C-E: producto inexistente, no disponible o archivado nunca crea una Order.
  await expectCheckoutError(
    { ...baseContact, items: [{ productId: `missing-${suffix}`, quantity: 1 }] },
    'PRODUCT_NOT_FOUND',
  );
  await expectCheckoutError(
    { ...baseContact, items: [{ productId: unavailableProductId, quantity: 1 }] },
    'PRODUCT_UNAVAILABLE',
  );
  await expectCheckoutError(
    { ...baseContact, items: [{ productId: archivedProductId, quantity: 1 }] },
    'PRODUCT_ARCHIVED',
  );

  // F-H: cero, negativo y decimal se rechazan en runtime.
  for (const quantity of [0, -1, 1.5]) {
    expectValidationError(
      () => parseCheckoutInput({
        ...baseContact,
        items: [{ productId: activeProductId, quantity }],
      }),
      'INVALID_QUANTITY',
    );
  }

  // I: duplicados se normalizan y Order + OrderItems se crean atómicamente.
  const result = await createSecureOrder({
    ...baseContact,
    items: [
      { productId: activeProductId, quantity: 1 },
      { productId: activeProductId, quantity: 2 },
    ],
  }, null);
  createdOrderCode = result.order.orderCode;

  const storedOrder = await prisma.order.findUniqueOrThrow({
    where: { orderCode: createdOrderCode },
    include: { items: true },
  });
  assert.match(storedOrder.orderCode, /^EP-[A-F0-9]{10}$/);
  assert.equal(storedOrder.total, 3750);
  assert.equal(storedOrder.status, ORDER_STATUS.WAITING_WHATSAPP);
  assert.equal(storedOrder.userId, null);
  assert.equal(storedOrder.whatsappConfirmedAt, null);
  assert.equal(storedOrder.items.length, 1);
  assert.equal(storedOrder.items[0].productId, activeProductId);
  assert.equal(storedOrder.items[0].productName, 'Producto activo EP-003');
  assert.equal(storedOrder.items[0].unitPrice, 1250);
  assert.equal(storedOrder.items[0].quantity, 3);
  assert.equal(
    storedOrder.total,
    storedOrder.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
  );

  // J: el snapshot no cambia si Product.price cambia después del checkout.
  await prisma.product.update({ where: { id: activeProductId }, data: { price: 9999 } });
  const snapshot = await prisma.orderItem.findFirstOrThrow({
    where: { orderId: storedOrder.id, productId: activeProductId },
  });
  assert.equal(snapshot.unitPrice, 1250);

    console.log('EP-003 secure checkout: casos A-J aprobados.');
  } finally {
    if (createdOrderCode) {
      await prisma.order.deleteMany({ where: { orderCode: createdOrderCode } });
    }
    await prisma.product.deleteMany({ where: { id: { in: productIds } } });
    await prisma.category.deleteMany({ where: { id: categoryId } });
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
