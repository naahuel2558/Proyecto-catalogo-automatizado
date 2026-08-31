# EP-004 — Product Admin CRUD Report

## 1. Estado previo

Los modelos `Product` y `Category` ya existían en Prisma y el catálogo público leía productos activos desde DB. Sin embargo, no había una interfaz para administrarlos: cambiar un nombre, precio, imagen o disponibilidad exigía modificar datos manualmente. `menu.ts` permanecía como fixture del seed y no participaba del runtime.

La administración previa incluía `/admin/clientes` y `/admin/clientes/[id]`. Sus Server Actions ya comprobaban `session.user.role === "ADMIN"`, aunque el listado de clientes sumaba un guard cliente. EP-004 reutiliza NextAuth y mantiene el rol de la sesión del servidor como única fuente de autorización.

## 2. Seguridad

Las páginas nuevas llaman a `requireAdminPage()` antes de consultar datos:

- sin sesión: redirección a `/login`;
- sesión con rol distinto de `ADMIN`: redirección a `/`.

La protección visual no sustituye la autorización. Cada operación de escritura obtiene nuevamente la sesión mediante `getServerSession(authOptions)` dentro de la Server Action y entrega ese actor al dominio administrativo. Todas las mutaciones ejecutan `assertAdminActor()` antes de validar IDs o consultar Prisma.

Nunca se aceptan `role`, `userId` ni `isAdmin` desde el navegador. Los errores controlados distinguen `UNAUTHORIZED`, `FORBIDDEN`, `INVALID_INPUT`, `CATEGORY_NOT_FOUND`, `CATEGORY_ARCHIVED` y `PRODUCT_NOT_FOUND`. Los errores inesperados se registran en servidor y retornan `DATABASE_ERROR` sin stack trace.

## 3. Rutas

Se crearon tres rutas App Router:

- `/admin/productos`: listado, búsqueda y filtros;
- `/admin/productos/nuevo`: creación;
- `/admin/productos/[id]`: edición y acciones de estado.

El listado muestra nombre, categoría, precio, disponibilidad, destacado, archivado, última actualización y acción de edición. Los filtros se resuelven server-side mediante query parameters y permiten nombre, categoría dinámica, disponibilidad y activos/archivados/todos.

La UI es responsive, reutiliza la paleta naranja y tipografía del proyecto, y adopta una composición de panel operativo cálido/industrial. Se agregaron accesos al panel desde el header para sesiones ADMIN.

## 4. Creación

El formulario recibe las categorías activas desde Prisma y permite configurar:

- nombre;
- descripción;
- precio;
- imagen;
- categoría;
- disponible;
- destacado.

El servidor crea siempre `isArchived = false`. No existe un campo cliente capaz de sobrescribirlo. La respuesta contiene únicamente éxito e ID, no un objeto Prisma completo.

## 5. Edición

La ruta dinámica carga el producto y categorías activas en paralelo. Permite editar `name`, `description`, `price`, `image`, `categoryId`, `isAvailable` e `isFeatured`.

También ofrece acciones separadas para disponibilidad, destacado, archivado y restauración. Archivar requiere una confirmación explícita en la interfaz. No se implementó eliminación física.

## 6. Precio

`Product.price` continúa siendo `Int`. La UI usa un input numérico con `step=1`, pero el servidor vuelve a validar el valor en runtime:

- acepta número o string compuesto exclusivamente por dígitos;
- exige `Number.isSafeInteger`;
- exige valor mayor que cero;
- establece un máximo operativo de `$100.000.000`;
- rechaza decimales como `9500.5` y negativos;
- no usa `Float`, `Math.round` ni corrección silenciosa.

## 7. Categorías

Los selectores provienen de consultas Prisma; no contienen categorías hardcodeadas. Crear o actualizar comprueba nuevamente que `categoryId` exista y que `Category.isArchived === false`.

El filtro del listado incluye todas las categorías, identificando las archivadas para poder localizar productos históricos. EP-004 no crea ni modifica categorías.

## 8. Disponibilidad

`setProductAvailabilityAction` permite alternar `isAvailable` con un booleano real validado. Un producto no disponible:

- permanece en DB y en administración;
- deja de ser retornado por `getActiveProducts()`;
- es rechazado por Secure Checkout con `PRODUCT_UNAVAILABLE`.

La prueba de integración comprobó los tres puntos.

## 9. Archivado

Archivar establece exclusivamente `isArchived = true`. El producto conserva ID, relaciones y resto de estados. Desaparece del catálogo público y Secure Checkout lo rechaza con `PRODUCT_ARCHIVED`.

Restaurar establece exclusivamente `isArchived = false`. No cambia `isAvailable`; la prueba K restauró un producto previamente no disponible y confirmó que permaneció no disponible.

## 10. Históricos

Ninguna acción administrativa escribe sobre `Order` ni `OrderItem`. La prueba H creó un snapshot con:

```text
OrderItem.productName = nombre original
OrderItem.unitPrice = 1250
```

Después cambió `Product.name` y `Product.price` a `2500`. El producto reflejó los valores nuevos y un checkout posterior usó `2500`, mientras el `OrderItem` histórico conservó nombre original y `unitPrice = 1250`.

## 11. Cache

Después de cada creación, edición o cambio de estado, la Server Action ejecuta:

- `revalidatePath('/')`;
- `revalidatePath('/admin/productos', 'layout')`;
- `revalidatePath('/admin/productos/[id concreto]')` cuando corresponde.

Así el catálogo y toda la sección administrativa obtienen datos actuales sin hacks cliente. La home además conserva su lectura dinámica existente.

## 12. Archivos modificados

- `PLAN.md`
- `package.json`
- `src/components/Header.tsx`
- `src/app/actions/product-admin.ts` — nuevo.
- `src/app/admin/productos/page.tsx` — nuevo.
- `src/app/admin/productos/nuevo/page.tsx` — nuevo.
- `src/app/admin/productos/[id]/page.tsx` — nuevo.
- `src/components/admin/AdminShell.tsx` — nuevo.
- `src/components/admin/ProductForm.tsx` — nuevo.
- `src/components/admin/ProductStateActions.tsx` — nuevo.
- `src/lib/admin/authorization.ts` — nuevo.
- `src/lib/admin/page-auth.ts` — nuevo.
- `src/lib/admin/products.ts` — nuevo.
- `scripts/test-product-admin.ts` — nuevo.
- `scripts/test-admin-routes.ts` — nuevo.
- `auditorias/EP-004-product-admin-report.md` — nuevo.

No se cambió funcionalmente `schema.prisma`, no se creó ninguna migración y no se editó una migración aplicada.

## 13. Tests

`npm run test:product-admin` usa categorías, productos y órdenes aisladas y elimina todas las fixtures en `finally`.

| Caso | Resultado |
|---|---|
| A — USER crea producto | `FORBIDDEN`; rechazado antes de DB |
| B — Sin sesión modifica producto | `UNAUTHORIZED`; rechazado antes de DB |
| C — ADMIN crea válido | Producto creado, precio entero e `isArchived = false` |
| D — Precio decimal | `INVALID_INPUT` |
| E — Precio negativo | `INVALID_INPUT` |
| F — Categoría inexistente | `CATEGORY_NOT_FOUND` |
| G — Categoría archivada | `CATEGORY_ARCHIVED` |
| H — ADMIN cambia precio | Product cambia; snapshot histórico no cambia; checkout usa precio nuevo |
| I — No disponible | Fuera del catálogo; checkout devuelve `PRODUCT_UNAVAILABLE` |
| J — Archivado | Fuera del catálogo; checkout devuelve `PRODUCT_ARCHIVED` |
| K — Restaurado | `isArchived = false`; disponibilidad e histórico preservados |

También se probó el cambio de `isFeatured` y se verificó persistencia `true`.

## 14. Validaciones

Resultados finales:

- `npx prisma format`: PASS.
- `npx prisma validate`: PASS.
- `npx prisma migrate status`: PASS; 3 migraciones, DB sincronizada.
- `npx tsc --noEmit`: PASS; 0 errores.
- `npm run lint`: PASS; 0 errores y 28 warnings preexistentes.
- `npm run build`: PASS con Next.js 16.3.1 y las 3 rutas nuevas.
- `npm run test:secure-checkout`: PASS, casos A-J.
- `npm run test:product-admin`: PASS, casos A-K.
- `npm run test:admin-routes`: PASS.

La limpieza final confirmó 0 usuarios, categorías y productos temporales de EP-004.

## 15. Regresión

El smoke test usa una sesión ADMIN temporal y comprueba HTTP 200 más contenido esperado en:

- `/`;
- `/login`;
- `/registro`;
- `/perfil`;
- `/admin/clientes`;
- `/admin/clientes/[id]`;
- `/admin/productos`;
- `/admin/productos/nuevo`;
- `/admin/productos/[id]`;
- `/cocina`.

En navegador, `/admin/productos` sin sesión redirigió correctamente a `/login`. El build confirma render server/client y bundles de las rutas nuevas. El test Product Admin cubre crear, editar y acciones de estado; el test Secure Checkout confirma que carrito/checkout conservan su contrato seguro.

`menu.ts` no tiene imports en `src/`; permanece únicamente como fixture usada por `prisma/seed.ts`.

## 16. Riesgos pendientes

Fuera del alcance y sin implementar:

- EP-005 — Category Admin CRUD;
- Cocina basada en DB;
- webhook real de WhatsApp;
- OrderAgent;
- SEC-001 — endurecimiento de `/api/send-receipt` contra reenvíos arbitrarios y decisión sobre persistencia de contacto invitado;
- sistema de uploads/cloud storage. EP-004 mantiene rutas locales y URLs http/https;
- eliminación física de productos.

## 17. Estado final

**¿Puede un ADMIN gestionar el catálogo de productos sin modificar código ni afectar pedidos históricos?**

**SÍ.**

La base de datos es la fuente de verdad; las acciones administrativas modifican sólo `Product`, el catálogo público recibe los cambios y los snapshots de `OrderItem` permanecen inmutables.
