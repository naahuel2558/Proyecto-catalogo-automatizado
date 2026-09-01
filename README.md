# 🥪 IA ENTRE PANES

Catálogo web y sistema de pedidos para la rotisería **Entre Panes**.

> Este README describe la arquitectura **real** del repositorio. Las funcionalidades
> pendientes están marcadas como tales; no se documentan como terminadas.

---

## 1. Qué hace hoy

| Área | Estado | Ruta |
|---|---|---|
| Catálogo público desde base de datos | ✅ Operativo | `/` |
| Autenticación (Google + email/contraseña) | ✅ Operativo | `/login`, `/registro` |
| Secure Checkout (precios calculados en servidor) | ✅ Operativo | `/` |
| Administración de productos | ✅ Operativo | `/admin/productos` |
| Administración de categorías | ✅ Operativo | `/admin/categorias` |
| Cocina sobre pedidos persistidos | ✅ Operativo | `/cocina` |
| CRM de clientes | ✅ Operativo | `/admin/clientes` |
| Perfil e historial | ✅ Operativo | `/perfil` |
| Confirmación automática por WhatsApp | ⛔ Pendiente | EP-007 |
| Envío automático de recibos | ⛔ Deshabilitado | P0-001 |
| PostgreSQL de producción | ⚠️ Preparado, sin aprovisionar | INFRA-001 |

---

## 2. Stack

- **Next.js 16.3.1** (App Router, Server Components y Server Actions)
- **React 19.2.8**
- **TypeScript 5**
- **Prisma 5.22** como ORM
- **SQLite** en desarrollo local — *no apto para producción, ver §5*
- **NextAuth 4** con estrategia JWT
- **Tailwind CSS 4**
- Gestor de paquetes: **npm** (`package-lock.json` es el único lockfile)

---

## 3. Arquitectura

### Catálogo

Los productos y categorías viven en la base de datos, **no** en código.
`src/app/page.tsx` es un Server Component que consulta Prisma a través de
`src/lib/data/products.ts` y pasa los datos a `<MenuClient />`.

`src/lib/data/menu.ts` conserva el catálogo original **únicamente** como fixture
de `prisma/seed.ts`. No participa del runtime.

### Secure Checkout

El navegador envía exclusivamente `productId` y `quantity`. Cualquier campo extra
(`price`, `total`, `orderCode`, `userId`…) es rechazado.

El servidor consulta cada `Product`, verifica disponibilidad, **recalcula los
precios desde la base**, calcula el total, genera un `orderCode` (`EP-` + 10 hex)
y crea la `Order` en estado `WAITING_WHATSAPP` dentro de una transacción.

Cada `OrderItem` guarda un **snapshot inmutable** de `productName` y `unitPrice`:
cambiar el precio de un producto no altera los pedidos históricos.

Manipular el precio desde el navegador no modifica el pedido real.

### Cocina

`/cocina` lee `Order`/`OrderItem` desde Prisma, protegida con rol `ADMIN`.
Máquina de estados server-side:

```
WAITING_WHATSAPP → CONFIRMED → PREPARING → READY → DELIVERED
         │              │           │
         └──────────────┴───────────┴──→ CANCELLED
```

Las transiciones son condicionales (`updateMany` por `id` + `status`), de modo que
dos operadores concurrentes no pueden pisarse el estado.

### Autorización

- Páginas: `requireAdminPage()` — redirige a `/login` sin sesión, a `/` sin rol.
- Server Actions: `assertAdminActor()` sobre la sesión del servidor.

El rol **nunca** se acepta desde el navegador.

> ⚠️ No existe `middleware.ts`. La protección depende de que cada página nueva
> invoque el guard. Unificarlo es la tarea `SEC-002`.

---

## 4. WhatsApp

**El envío automático de recibos está deshabilitado** (P0-001).

`/api/send-receipt` respondía enviando un mensaje, desde el número del negocio,
al teléfono recibido en el body. Como `Order` no persiste `customerPhone`, el
servidor no podía demostrar que ese número perteneciera al pedido. La ruta ahora
responde `410` y no importa el bot.

**Lo que sí funciona:** el checkout devuelve `whatsappUrl`, un enlace `wa.me`
construido en servidor desde la Order ya validada, que el cliente abre a mano.

`src/lib/whatsapp/bot.ts` (Baileys) es una **herramienta de desarrollo local**,
atada a `127.0.0.1`. No es infraestructura de producción. La integración real
usará WhatsApp Cloud API en EP-007.

---

## 5. Base de datos y entornos

La conexión se resuelve por `DATABASE_URL`. **No hay URLs hardcodeadas.**

| Entorno | Base | Estado |
|---|---|---|
| Local | SQLite (`file:./dev.db`) | ✅ En uso |
| Preview | PostgreSQL separada de producción | ⚠️ Sin aprovisionar |
| Production | PostgreSQL persistente | ⚠️ Sin aprovisionar |

> ⚠️ **SQLite no es viable en producción.** El despliegue corre sobre un
> filesystem efímero: los pedidos escritos allí no persisten. Aprovisionar
> PostgreSQL es el bloqueo abierto de `INFRA-001`.

Migraciones en producción: **siempre** `prisma migrate deploy`.
Nunca `migrate dev`, `db push` ni `migrate reset`.

---

## 6. Puesta en marcha

```bash
npm install
cp .env.example .env    # completar valores
npx prisma migrate deploy
npx prisma db seed      # opcional: catálogo inicial
npm run dev
```

`.env.example` documenta cada variable. Nunca se versionan valores reales.

---

## 7. Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | `prisma generate` + build de producción |
| `npm run lint` | ESLint |
| `npm run whatsapp` | Bot Baileys local (vinculación por QR) |
| `npm run test:secure-checkout` | Checkout seguro, casos A–J |
| `npm run test:product-admin` | Admin de productos, A–K |
| `npm run test:category-admin` | Admin de categorías, A–L |
| `npm run test:kitchen` | Cocina, A–P |
| `npm run test:receipt-security` | Contención del endpoint, A–D |
| `npm run test:admin-routes` | Regresión HTTP por rol |

### Los tests escriben en la base

Todas las suites **crean y eliminan** registros. `scripts/_guard-test-db.ts` corre
como primer import y **aborta** si `DATABASE_URL` no es SQLite local, salvo que se
declare explícitamente `TEST_DATABASE_URL`.

Nunca apuntar las suites a producción.

---

## 8. Documentación del proyecto

- `PLAN.md` — roadmap y estado real de cada tarea.
- `auditorias/` — un informe por tarea completada, con validaciones y riesgos.
- `cambios-31-8-26/PROMPTS.md` — prompts de trabajo.

---

## 9. Deuda técnica conocida

| Id | Tema |
|---|---|
| `INFRA-001` | Aprovisionar PostgreSQL para Preview y Production |
| `EP-002.1` | Persistir `customerName`/`customerPhone` en `Order` |
| `SEC-002` | Unificar la protección de rutas en un middleware |
| `TEST-001` | Runner real (Vitest) y base de test efímera |
| `DOMAIN-001` | Convertir `Order.status` y `User.role` a enums de PostgreSQL |
| `EP-007` | WhatsApp Cloud API |
| — | El blob de `prisma/dev.db` sigue en el historial de Git (commit `15c400d`) |
