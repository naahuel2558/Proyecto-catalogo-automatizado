# EP-006 — Kitchen / Cocina basada en Base de Datos

Fecha de cierre: 31/08/2026  
Estado: completada y validada

## 1. Estado previo

`/cocina` era un Client Component sin protección. Leía `entrepanes_orders` desde `localStorage` cada tres segundos, creaba una comanda demo cuando no había datos y “Despachar Pedido” eliminaba el elemento del navegador. No consultaba ni modificaba `Order` en Prisma.

`MenuClient` mantenía un puente temporal que copiaba la respuesta de Secure Checkout a ese mismo `localStorage`. EP-003 ya había documentado que debía retirarse en EP-006.

## 2. Auditoría de Cocina existente

- Fuente previa: `localStorage`, no DB.
- Pedidos demo: sí, insertados en runtime.
- Autorización previa: ninguna.
- Mutación previa: borrado del array local.
- Polling previo: lectura local cada 3 segundos.
- Máquina de estados previa: inexistente.
- Dependencia de snapshots Prisma: inexistente.

Todo ese flujo fue reemplazado. No quedan referencias runtime en `src` a `entrepanes_orders`, `localStorage` para Cocina ni `menu.ts`.

## 3. Modelo Order / OrderItem encontrado

`Order` ya contenía `orderCode`, `total`, `status`, logística, pago, notas, timestamps y relación opcional con `User`. `OrderItem` ya contenía los snapshots obligatorios `productName`, `unitPrice` y `quantity`, además de una relación opcional con `Product`.

El estado es `String` porque SQLite no soporta el enum Prisma requerido. La fuente TypeScript centralizada es `ORDER_STATUS`:

- `DRAFT`
- `WAITING_WHATSAPP`
- `CONFIRMED`
- `PREPARING`
- `READY`
- `DELIVERED`
- `CANCELLED`

El schema existente fue suficiente.

## 4. Fuente de datos

Prisma es la única fuente de verdad de Cocina. `src/lib/kitchen/orders.ts` consulta `Order` y selecciona directamente los campos históricos de `OrderItem`. No incluye `Product` y no reconstruye nombre, precio ni cantidad desde el catálogo actual.

Los pedidos activos se agrupan por estado y los más antiguos aparecen primero dentro de cada etapa. `DELIVERED` y `CANCELLED` se muestran separados y limitados a los 12 más recientes.

## 5. Autorización

El proyecto sólo tiene los roles `USER` y `ADMIN`. EP-006 reutiliza el contrato privilegiado existente:

- sin sesión: `/login` y `UNAUTHORIZED` en mutaciones;
- `USER`: `/` y `FORBIDDEN` en mutaciones;
- `ADMIN`: lectura y operación autorizadas.

No se agregó un rol `KITCHEN`, no se tocó NextAuth ni se introdujo una migración de usuarios.

## 6. Estados y transiciones

La máquina de estados centralizada permite:

```text
WAITING_WHATSAPP → CONFIRMED → PREPARING → READY → DELIVERED
         │              │           │
         └──────────────┴───────────┴──→ CANCELLED
```

La cancelación se permite desde `WAITING_WHATSAPP`, `CONFIRMED` y `PREPARING`. `READY`, `DELIVERED` y `CANCELLED` no admiten retrocesos arbitrarios.

La confirmación manual `WAITING_WHATSAPP → CONFIRMED` permite operar pedidos reales antes de EP-007. No escribe `whatsappConfirmedAt`, porque ese timestamp queda reservado para la confirmación real de WhatsApp que implementará el webhook.

## 7. Lectura de pedidos

La página es un Server Component dinámico. Presenta cuatro columnas operativas:

- por confirmar;
- confirmados;
- preparando;
- listos.

Cada tarjeta muestra código, hora, estado, entrega, usuario cuando existe, items, cantidades, subtotales snapshot, total persistido y notas. Para checkout invitado muestra “Pedido invitado”, porque nombre y teléfono no están persistidos en el modelo actual.

## 8. Mutaciones

`transitionKitchenOrderAction`:

1. obtiene sesión server-side;
2. autoriza mediante `assertAdminActor`;
3. valida ID y estados;
4. consulta el pedido;
5. valida existencia y transición;
6. ejecuta una actualización condicional;
7. modifica únicamente `Order.status`;
8. revalida `/cocina` y `/perfil`;
9. retorna sólo ID y estado.

Los errores comerciales son `UNAUTHORIZED`, `FORBIDDEN`, `INVALID_INPUT`, `ORDER_NOT_FOUND` e `INVALID_STATUS_TRANSITION`. Fallos inesperados se registran en servidor y retornan `DATABASE_ERROR` sin stack trace.

## 9. Snapshots históricos

Cocina usa exclusivamente:

- `OrderItem.productName`;
- `OrderItem.unitPrice`;
- `OrderItem.quantity`;
- `Order.total`.

Las pruebas modificaron nombre, precio, archivo y disponibilidad del producto después del checkout. La lectura de Cocina conservó los valores originales. Ninguna transición modificó filas de `OrderItem`.

## 10. Concurrencia

Cada botón envía el estado que la pantalla esperaba. El servidor vuelve a leer el estado real y utiliza `updateMany` con condición simultánea por `id` y `status`. Si otro operador avanzó el pedido, el update afecta cero filas y retorna `INVALID_STATUS_TRANSITION`; no sobrescribe el estado nuevo.

El caso P reproduce esta situación de forma determinista y pasó.

## 11. Cache y refresh

- Las mutaciones usan `revalidatePath('/cocina')`.
- Secure Checkout también invalida `/cocina` tras crear una orden.
- Un control cliente ejecuta `router.refresh()` manualmente o cada 15 segundos.
- React no conserva ni duplica pedidos; sólo controla refresh, pending y errores de botones.

## 12. Integración Secure Checkout → Cocina

La suite creó un producto válido, ejecutó `createSecureOrder`, verificó `Order` y `OrderItem`, consultó la capa de Cocina y encontró el pedido en `WAITING_WHATSAPP` con cantidad, nombre, precio y total correctos.

El smoke HTTP creó además una `Order CONFIRMED` con un `productName` snapshot distinto al nombre actual de `Product` y confirmó que `/cocina` renderizó ese snapshot bajo sesión ADMIN.

## 13. Archivos modificados

- `src/lib/kitchen/orders.ts`
- `src/app/actions/kitchen.ts`
- `src/app/cocina/page.tsx`
- `src/components/kitchen/KitchenOrderActions.tsx`
- `src/components/kitchen/KitchenRefresh.tsx`
- `src/components/MenuClient.tsx`
- `src/app/actions/order.ts`
- `scripts/test-kitchen.ts`
- `scripts/test-admin-routes.ts`
- `package.json`
- `PLAN.md`
- `auditorias/EP-006-kitchen-db-report.md`

## 14. Tests

`npm run test:kitchen` cubre A–P:

- autorización `USER` y ausencia de sesión;
- pedido inexistente;
- transición válida e inválida;
- integración Secure Checkout;
- cantidades y snapshots;
- cambios posteriores de nombre y precio;
- producto archivado/no disponible;
- total histórico;
- inmutabilidad de `OrderItem`;
- lectura vacía;
- estado stale/concurrencia;
- cancelación controlada y terminal.

Todas las fixtures se eliminan en `finally`.

## 15. Validaciones

| Comando | Resultado |
|---|---|
| `npx prisma format` | PASS |
| `npx prisma validate` | PASS |
| `npx prisma migrate status` | PASS, 3 migraciones aplicadas |
| `npx tsc --noEmit` | PASS |
| `npm run lint` | PASS, 0 errores |
| `npm run build` | PASS, `/cocina` dinámica |
| `npm run test:secure-checkout` | PASS, A–J |
| `npm run test:product-admin` | PASS, A–K |
| `npm run test:category-admin` | PASS, A–L |
| `npm run test:kitchen` | PASS, A–P |
| `npm run test:admin-routes` | PASS |

## 16. Regresión

Secure Checkout, Product Admin, Category Admin y todas las rutas anteriores continúan pasando. El smoke comprueba visitante, `USER` y `ADMIN` para `/cocina`, además del resto de catálogo, auth, perfil, administración y cocina.

## 17. Migraciones

No hubo cambios funcionales en `schema.prisma` y no se creó ninguna migración. No se usó `prisma db push` ni se modificó una migración aplicada.

## 18. Lint y riesgos pendientes

- Línea base: 28 warnings.
- Resultado final: 28 warnings.
- Errores: 0.
- Warnings nuevos atribuibles a EP-006: 0.

Riesgos/deudas fuera de alcance:

- EP-007 debe automatizar `WAITING_WHATSAPP → CONFIRMED` y escribir `whatsappConfirmedAt` desde el webhook real.
- El contacto de invitados no se persiste. Cocina sólo puede identificar al usuario autenticado; persistir contacto requiere una decisión de dominio y migración append-only futura, ya señalada por SEC-001/EP-003.
- SQLite es adecuado para el estado actual, pero la operación multiinstancia de producción sigue dependiendo de EP-012/PostgreSQL.

## 19. Estado final

¿Está `/cocina` operando completamente sobre pedidos reales de la base de datos, con transiciones autorizadas y sin alterar snapshots históricos? **SÍ.**

**PLAN.md actualizado: SÍ.**
