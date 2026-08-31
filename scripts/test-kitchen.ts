import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { prisma } from '../src/lib/db';
import { AdminAuthorizationError, type AdminActor } from '../src/lib/admin/authorization';
import {
  canTransitionOrderStatus,
  getKitchenOrder,
  getKitchenOrders,
  getRecentKitchenOrders,
  KitchenOrderError,
  transitionOrderStatusForKitchen,
} from '../src/lib/kitchen/orders';
import { createSecureOrder } from '../src/lib/orders/secure-checkout';
import { ORDER_STATUS } from '../src/types';

const suffix = crypto.randomBytes(6).toString('hex');
const categoryId = `ep006-category-${suffix}`;
const productId = `ep006-product-${suffix}`;
const originalName = `Hamburguesa EP-006 ${suffix}`;
const originalPrice = 8_500;
const admin: AdminActor = { id: `admin-${suffix}`, role: 'ADMIN' };
const user: AdminActor = { id: `user-${suffix}`, role: 'USER' };
const orderIds: string[] = [];

async function expectError(
  operation: () => Promise<unknown>,
  errorType: typeof AdminAuthorizationError | typeof KitchenOrderError,
  code: string,
) {
  await assert.rejects(
    operation,
    (error: unknown) => error instanceof errorType && error.code === code,
  );
}

async function checkout(quantity: number) {
  return createSecureOrder({
    items: [{ productId, quantity }],
    customerName: 'Prueba Cocina EP-006',
    customerPhone: '+54 9 358 1234567',
    fulfillmentType: 'PICKUP',
    notes: 'Sin aderezos',
  }, null);
}

async function main() {
  try {
    await prisma.category.create({
      data: { id: categoryId, name: `Cocina EP-006 ${suffix}`, slug: `cocina-ep006-${suffix}` },
    });
    await prisma.product.create({
      data: {
        id: productId,
        name: originalName,
        description: 'Fixture aislada para Kitchen',
        price: originalPrice,
        categoryId,
      },
    });

    // A: USER no puede mutar pedidos; autorización precede a la consulta.
    await expectError(
      () => transitionOrderStatusForKitchen(`missing-${suffix}`, ORDER_STATUS.WAITING_WHATSAPP, ORDER_STATUS.CONFIRMED, user),
      AdminAuthorizationError,
      'FORBIDDEN',
    );

    // B: una mutación sin sesión se rechaza antes de consultar DB.
    await expectError(
      () => transitionOrderStatusForKitchen(`missing-${suffix}`, ORDER_STATUS.WAITING_WHATSAPP, ORDER_STATUS.CONFIRMED, null),
      AdminAuthorizationError,
      'UNAUTHORIZED',
    );

    // C: ADMIN recibe un error controlado para un pedido inexistente.
    await expectError(
      () => transitionOrderStatusForKitchen(`missing-${suffix}`, ORDER_STATUS.WAITING_WHATSAPP, ORDER_STATUS.CONFIRMED, admin),
      KitchenOrderError,
      'ORDER_NOT_FOUND',
    );

    // F: Secure Checkout crea Order + OrderItem y Cocina la lee desde DB.
    const checkoutResult = await checkout(2);
    const storedOrder = await prisma.order.findUniqueOrThrow({
      where: { orderCode: checkoutResult.order.orderCode },
      include: { items: true },
    });
    orderIds.push(storedOrder.id);
    const boardOrder = (await getKitchenOrders()).find((order) => order.id === storedOrder.id);
    assert.ok(boardOrder, 'El pedido de Secure Checkout debe aparecer en Cocina');

    // G-H: cantidades y snapshots provienen de OrderItem.
    assert.equal(boardOrder.items.length, 1);
    assert.equal(boardOrder.items[0].quantity, 2);
    assert.equal(boardOrder.items[0].productName, originalName);
    assert.equal(boardOrder.items[0].unitPrice, originalPrice);
    const itemSnapshotBefore = await prisma.orderItem.findMany({
      where: { orderId: storedOrder.id },
      orderBy: { id: 'asc' },
    });

    // D: transición válida WAITING_WHATSAPP -> CONFIRMED.
    await transitionOrderStatusForKitchen(
      storedOrder.id,
      ORDER_STATUS.WAITING_WHATSAPP,
      ORDER_STATUS.CONFIRMED,
      admin,
    );
    assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: storedOrder.id } })).status, ORDER_STATUS.CONFIRMED);

    // E: no se pueden saltar etapas y DB conserva su estado.
    await expectError(
      () => transitionOrderStatusForKitchen(storedOrder.id, ORDER_STATUS.CONFIRMED, ORDER_STATUS.READY, admin),
      KitchenOrderError,
      'INVALID_STATUS_TRANSITION',
    );
    assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: storedOrder.id } })).status, ORDER_STATUS.CONFIRMED);

    // I-J: cambios posteriores de Product no cambian nombre ni precio históricos.
    await prisma.product.update({
      where: { id: productId },
      data: { name: `Hamburguesa Premium EP-006 ${suffix}`, price: 10_000 },
    });
    let kitchenOrder = await getKitchenOrder(storedOrder.id);
    assert.ok(kitchenOrder);
    assert.equal(kitchenOrder.items[0].productName, originalName);
    assert.equal(kitchenOrder.items[0].unitPrice, originalPrice);

    // K: archivar Product no rompe el pedido existente.
    await prisma.product.update({ where: { id: productId }, data: { isArchived: true } });
    kitchenOrder = await getKitchenOrder(storedOrder.id);
    assert.ok(kitchenOrder);
    assert.equal(kitchenOrder.items[0].productName, originalName);

    // L: marcar Product no disponible tampoco altera la lectura histórica.
    await prisma.product.update({ where: { id: productId }, data: { isAvailable: false } });
    kitchenOrder = await getKitchenOrder(storedOrder.id);
    assert.ok(kitchenOrder);
    assert.equal(kitchenOrder.items[0].quantity, 2);

    // M: total persistido se conserva; Cocina no usa el precio actual.
    assert.equal(kitchenOrder.total, originalPrice * 2);

    // P: una operación con estado esperado viejo no pisa al operador anterior.
    await transitionOrderStatusForKitchen(storedOrder.id, ORDER_STATUS.CONFIRMED, ORDER_STATUS.PREPARING, admin);
    await expectError(
      () => transitionOrderStatusForKitchen(storedOrder.id, ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED, admin),
      KitchenOrderError,
      'INVALID_STATUS_TRANSITION',
    );
    assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: storedOrder.id } })).status, ORDER_STATUS.PREPARING);

    await transitionOrderStatusForKitchen(storedOrder.id, ORDER_STATUS.PREPARING, ORDER_STATUS.READY, admin);
    await transitionOrderStatusForKitchen(storedOrder.id, ORDER_STATUS.READY, ORDER_STATUS.DELIVERED, admin);
    assert.equal((await getRecentKitchenOrders()).some((order) => order.id === storedOrder.id), true);

    // N: ninguna transición modifica snapshots de OrderItem.
    const itemSnapshotAfter = await prisma.orderItem.findMany({
      where: { orderId: storedOrder.id },
      orderBy: { id: 'asc' },
    });
    assert.deepEqual(itemSnapshotAfter, itemSnapshotBefore);

    // Cancelación controlada desde un estado permitido y terminal.
    await prisma.product.update({ where: { id: productId }, data: { isArchived: false, isAvailable: true } });
    const cancellableCheckout = await checkout(1);
    const cancellableOrder = await prisma.order.findUniqueOrThrow({
      where: { orderCode: cancellableCheckout.order.orderCode },
    });
    orderIds.push(cancellableOrder.id);
    await transitionOrderStatusForKitchen(
      cancellableOrder.id,
      ORDER_STATUS.WAITING_WHATSAPP,
      ORDER_STATUS.CANCELLED,
      admin,
    );
    assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: cancellableOrder.id } })).status, ORDER_STATUS.CANCELLED);
    assert.equal(canTransitionOrderStatus(ORDER_STATUS.CANCELLED, ORDER_STATUS.CONFIRMED), false);

    // O: una selección de estados vacía produce una colección vacía, no un error.
    assert.deepEqual(await getKitchenOrders([]), []);

    console.log('EP-006 Kitchen: casos A-P aprobados.');
  } finally {
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    await prisma.order.deleteMany({ where: { items: { some: { productId } } } });
    await prisma.product.deleteMany({ where: { id: productId } });
    await prisma.category.deleteMany({ where: { id: categoryId } });
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
