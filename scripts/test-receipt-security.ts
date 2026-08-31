import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { readFileSync } from 'node:fs';
import { prisma } from '../src/lib/db';
import { createSecureOrder } from '../src/lib/orders/secure-checkout';
import { ORDER_STATUS } from '../src/types';
import { GET, POST } from '../src/app/api/send-receipt/route';

/**
 * P0-001 - Tests de contencion del endpoint de recibo.
 *
 * Demuestran que ningun payload dirigido a `/api/send-receipt` puede provocar un
 * envio de WhatsApp, y que el checkout seguro de EP-003 sigue intacto.
 */

const suffix = crypto.randomBytes(6).toString('hex');
const categoryId = `p0001-category-${suffix}`;
const categorySlug = `p0001-test-${suffix}`;
const productId = `p0001-product-${suffix}`;
const UNIT_PRICE = 7350;
const ROTISERIA_NUMBER = '5493585762463';

const ROUTE_PATH = 'src/app/api/send-receipt/route.ts';
const MENU_CLIENT_PATH = 'src/components/MenuClient.tsx';

let createdOrderCode: string | undefined;

/** Codigo de la ruta sin comentarios, para aserciones estructurales. */
function strippedRouteSource(): string {
  return readFileSync(ROUTE_PATH, 'utf8')
    .split('\n')
    .filter((line) => {
      const trimmed = line.trimStart();
      return !trimmed.startsWith('*') && !trimmed.startsWith('//') && !trimmed.startsWith('/*');
    })
    .join('\n');
}

/** Un envio solo es posible si la ruta alcanza el bot. Se verifica que no lo haga. */
function assertRouteCannotSend() {
  const code = strippedRouteSource();
  assert.ok(!code.includes('whatsapp/bot'), 'La ruta no debe importar el bot de WhatsApp');
  assert.ok(!code.includes('sendWhatsAppMessage'), 'La ruta no debe invocar sendWhatsAppMessage');
  assert.ok(!code.includes('localhost:3001'), 'La ruta no debe delegar en el bot standalone');
}

/** Todo payload es inerte porque la ruta nunca lee el body ni recibe la Request. */
function assertRouteIgnoresBody() {
  const code = strippedRouteSource();
  assert.ok(!code.includes('req.json'), 'La ruta no debe leer el body');
  assert.ok(!code.includes('request.json'), 'La ruta no debe leer el body');
  assert.ok(!code.includes('formData'), 'La ruta no debe leer el body');
  assert.ok(!code.includes('POST(request'), 'La ruta no debe recibir la Request');
  assert.ok(!code.includes('POST(req'), 'La ruta no debe recibir la Request');
}

/**
 * `hostilePayload` documenta la forma exacta del ataque. El handler no lo lee:
 * esa es precisamente la propiedad que se esta verificando.
 */
async function expectNoSend(label: string, hostilePayload: Record<string, unknown>) {
  assert.ok(Object.keys(hostilePayload).length > 0, `${label}: el vector debe estar descrito`);

  const ordersBefore = await prisma.order.count();
  const response = await POST();
  const payload = await response.json();

  assert.equal(response.status, 410, `${label}: el endpoint debe responder 410 Gone`);
  assert.equal(payload.error, 'RECEIPT_AUTOSEND_DISABLED', `${label}: codigo de error esperado`);

  const serialized = JSON.stringify(payload);
  assert.ok(!serialized.includes('0000'), `${label}: la respuesta no debe reflejar el telefono enviado`);
  assert.ok(!serialized.includes('Valor Total'), `${label}: la respuesta no debe contener un recibo`);
  assert.equal(await prisma.order.count(), ordersBefore, `${label}: no debe alterar pedidos`);
}

async function main() {
  try {
    await prisma.category.create({
      data: { id: categoryId, name: `P0-001 Test ${suffix}`, slug: categorySlug },
    });
    await prisma.product.create({
      data: {
        id: productId,
        name: 'Producto contencion P0-001',
        description: 'Fixture temporal',
        price: UNIT_PRICE,
        categoryId,
      },
    });

    assertRouteCannotSend();
    console.log('PRE1 - La ruta no importa ni invoca el bot de WhatsApp: OK');
    assertRouteIgnoresBody();
    console.log('PRE2 - La ruta no lee el body ni recibe la Request: OK');

    // Caso A - telefono arbitrario como destino
    await expectNoSend('A', {
      orderCode: 'EP-A1B2C3D4E5',
      customerName: 'Tercero',
      customerPhone: '+54 9 11 0000 0000',
    });
    console.log('A    - Telefono arbitrario: no provoca envio (410)');

    // Caso B - receiptText manipulado
    await expectNoSend('B', {
      orderCode: 'EP-A1B2C3D4E5',
      customerName: 'Tercero',
      customerPhone: '+54 9 11 0000 0000',
      receiptText: 'Recibo falsificado con contenido arbitrario',
    });
    console.log('B    - receiptText manipulado: no provoca envio (410)');

    // Caso C - total / precio inyectados
    await expectNoSend('C', {
      orderCode: 'EP-A1B2C3D4E5',
      customerName: 'Tercero',
      customerPhone: '+54 9 11 0000 0000',
      total: 0,
      price: 0,
      items: [{ productId, quantity: 1, price: 0 }],
    });
    console.log('C    - total/price inyectados: no provoca envio (410)');

    const getResponse = await GET();
    assert.equal(getResponse.status, 410, 'GET tambien debe estar deshabilitado');
    console.log('C.1  - GET deshabilitado: OK');

    const menuClient = readFileSync(MENU_CLIENT_PATH, 'utf8');
    assert.ok(!menuClient.includes('/api/send-receipt'), 'MenuClient no debe invocar el endpoint');
    console.log('C.2  - MenuClient no invoca el endpoint: OK');

    // Caso D - checkout valido intacto (regresion EP-003)
    const quantity = 2;
    const result = await createSecureOrder(
      {
        items: [{ productId, quantity }],
        customerName: 'Cliente P0-001',
        customerPhone: '+54 9 358 1234567',
        fulfillmentType: 'PICKUP',
      },
      null,
    );
    createdOrderCode = result.order.orderCode;

    assert.match(result.order.orderCode, /^EP-[A-F0-9]{10}$/, 'D: orderCode generado en servidor');
    assert.equal(result.order.total, UNIT_PRICE * quantity, 'D: total calculado en servidor');
    assert.equal(result.order.status, ORDER_STATUS.WAITING_WHATSAPP, 'D: estado inicial correcto');
    assert.ok(
      result.whatsappUrl.startsWith(`https://wa.me/${ROTISERIA_NUMBER}?text=`),
      'D: el enlace manual apunta al numero oficial de la rotiseria',
    );
    assert.ok(
      decodeURIComponent(result.whatsappUrl).includes(result.order.orderCode),
      'D: el enlace manual contiene el codigo de pedido',
    );

    const persisted = await prisma.order.findUnique({
      where: { orderCode: result.order.orderCode },
      include: { items: true },
    });
    assert.ok(persisted, 'D: la Order debe persistir');
    assert.equal(persisted.total, UNIT_PRICE * quantity, 'D: total persistido correcto');
    assert.equal(persisted.items.length, 1, 'D: OrderItem creado');
    assert.equal(persisted.items[0].unitPrice, UNIT_PRICE, 'D: snapshot de precio preservado');
    console.log('D    - Checkout valido: Order creada y enlace manual disponible');

    console.log('\nP0-001 receipt security: PASS (A, B, C, D)');
  } finally {
    if (createdOrderCode) {
      await prisma.order.deleteMany({ where: { orderCode: createdOrderCode } });
    }
    await prisma.product.deleteMany({ where: { id: productId } });
    await prisma.category.deleteMany({ where: { id: categoryId } });
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('\nP0-001 receipt security: FAIL');
  console.error(error);
  process.exit(1);
});
