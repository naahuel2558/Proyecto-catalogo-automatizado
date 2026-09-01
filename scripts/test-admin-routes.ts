// INFRA-001: debe ser el PRIMER import — aisla la base de tests de Production.
import './_guard-test-db';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/db';

const baseUrl = process.env.EP_TEST_BASE_URL ?? 'http://localhost:3000';
const suffix = crypto.randomBytes(6).toString('hex');
const email = `ep005-admin-${suffix}@example.test`;
const password = crypto.randomBytes(18).toString('base64url');
const regularEmail = `ep005-user-${suffix}@example.test`;
const regularPassword = crypto.randomBytes(18).toString('base64url');
const userIds: string[] = [];
let kitchenOrderId: string | undefined;

function mergeCookies(store: Map<string, string>, response: Response) {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] };
  const values = headers.getSetCookie?.() ?? [response.headers.get('set-cookie') ?? ''];
  for (const value of values) {
    const pair = value.split(';', 1)[0];
    const separator = pair.indexOf('=');
    if (separator > 0) store.set(pair.slice(0, separator), pair.slice(separator + 1));
  }
}

function cookieHeader(store: Map<string, string>) {
  return Array.from(store, ([name, value]) => `${name}=${value}`).join('; ');
}

async function expectPage(path: string, marker: string, cookies: Map<string, string>) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { cookie: cookieHeader(cookies) },
    redirect: 'manual',
  });
  const html = await response.text();
  assert.equal(response.status, 200, `${path} debería responder HTTP 200`);
  assert.match(html, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

async function expectRedirect(path: string, destination: string, cookies = new Map<string, string>()) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { cookie: cookieHeader(cookies) },
    redirect: 'manual',
  });
  assert.ok([302, 303, 307, 308].includes(response.status), `${path} debería redirigir`);
  assert.equal(new URL(response.headers.get('location') ?? '', baseUrl).pathname, destination);
}

async function login(loginEmail: string, loginPassword: string) {
  const cookies = new Map<string, string>();
  const csrfResponse = await fetch(`${baseUrl}/api/auth/csrf`);
  assert.equal(csrfResponse.status, 200);
  mergeCookies(cookies, csrfResponse);
  const { csrfToken } = await csrfResponse.json() as { csrfToken: string };

  const loginResponse = await fetch(`${baseUrl}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      cookie: cookieHeader(cookies),
    },
    body: new URLSearchParams({
      csrfToken,
      email: loginEmail,
      password: loginPassword,
      callbackUrl: `${baseUrl}/admin/productos`,
      json: 'true',
    }),
    redirect: 'manual',
  });
  assert.ok([200, 302, 303].includes(loginResponse.status), 'El login temporal debe completarse');
  mergeCookies(cookies, loginResponse);
  assert.ok(
    Array.from(cookies.keys()).some((name) => name.includes('session-token')),
    'NextAuth debe emitir una cookie de sesión',
  );
  return cookies;
}

async function main() {
  try {
    const user = await prisma.user.create({
      data: {
        name: 'Admin temporal EP-005',
        email,
        password: await bcrypt.hash(password, 10),
        role: 'ADMIN',
      },
    });
    userIds.push(user.id);
    const regularUser = await prisma.user.create({
      data: {
        name: 'Usuario temporal EP-005',
        email: regularEmail,
        password: await bcrypt.hash(regularPassword, 10),
        role: 'USER',
      },
    });
    userIds.push(regularUser.id);

    await expectRedirect('/admin/categorias', '/login');
    await expectRedirect('/cocina', '/login');
    const regularCookies = await login(regularEmail, regularPassword);
    await expectRedirect('/admin/categorias', '/', regularCookies);
    await expectRedirect('/cocina', '/', regularCookies);
    const cookies = await login(email, password);

    const product = await prisma.product.findFirstOrThrow({ orderBy: { name: 'asc' } });
    const category = await prisma.category.findFirstOrThrow({ orderBy: { name: 'asc' } });
    const kitchenSnapshotName = `Snapshot Cocina EP-006 ${suffix}`;
    const kitchenOrder = await prisma.order.create({
      data: {
        orderCode: `EP-ROUTE-${suffix.toUpperCase()}`,
        total: 4321,
        status: 'CONFIRMED',
        fulfillmentType: 'PICKUP',
        paymentMethod: 'Efectivo',
        notes: 'Fixture HTTP temporal',
        items: {
          create: {
            productId: product.id,
            productName: kitchenSnapshotName,
            unitPrice: 4321,
            quantity: 1,
          },
        },
      },
    });
    kitchenOrderId = kitchenOrder.id;
    await expectPage('/', product.name, cookies);
    await expectPage('/login', 'Iniciar Sesión', cookies);
    await expectPage('/registro', 'Crear Cuenta', cookies);
    await expectPage('/perfil', 'Historial de Pedidos', cookies);
    await expectPage('/admin/clientes', 'Cargando panel', cookies);
    await expectPage(`/admin/clientes/${user.id}`, 'Admin temporal EP-005', cookies);
    await expectPage('/admin/productos', 'El menú, bajo control.', cookies);
    await expectPage('/admin/productos/nuevo', 'Sumá una nueva propuesta.', cookies);
    await expectPage(`/admin/productos/${product.id}`, product.name, cookies);
    await expectPage('/admin/categorias', 'Orden para un menú que crece.', cookies);
    await expectPage('/admin/categorias/nueva', 'Dale un lugar a lo próximo.', cookies);
    await expectPage(`/admin/categorias/${category.id}`, category.name, cookies);
    await expectPage('/cocina', 'Cocina en marcha.', cookies);
    await expectPage('/cocina', kitchenSnapshotName, cookies);

    console.log('EP-006 rutas: catálogo, auth, perfil, clientes, productos, categorías y Cocina protegida aprobadas.');
  } finally {
    if (kitchenOrderId) await prisma.order.deleteMany({ where: { id: kitchenOrderId } });
    if (userIds.length > 0) await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
