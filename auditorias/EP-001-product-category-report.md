# Reporte de Ejecución - Product + Category Domain (EP-001)

## 1. Estado previo
El catálogo de productos estaba *hardcodeado* íntegramente en el archivo de memoria estática `src/lib/data/menu.ts`. El componente principal del catálogo (`src/app/page.tsx`) importaba esta constante directamente en el cliente y alimentaba la UI. No existían modelos de datos de productos ni categorías en la base de datos de Prisma, por lo que el negocio carecía de una fuente de verdad administrativa y persistente.

## 2. Schema
Se crearon dos nuevos modelos relacionales en `prisma/schema.prisma`:
* **`Category`**: Contiene `name`, `slug` (único) y soporte de archivo lógico (`isArchived`).
* **`Product`**: Contiene datos descriptivos (`name`, `description`, `image`, `badge`), relación *1 → N* con `Category`, e indicadores de estado (`isAvailable`, `isFeatured`, `isArchived`).

## 3. Price
**Decisión técnica:** Se definió `price` como tipo `Int` en el modelo `Product`, representando unidades enteras monetarias (pesos argentinos).
**Justificación:** A pesar de que `Order.total` y `OrderItem.price` utilizan `Float`, se decidió *no heredar* deliberadamente esa deuda técnica en el nuevo modelo `Product`. El refactor del dominio de órdenes (EP-002) será el responsable de migrar de manera controlada `Order` y `OrderItem` a `Int`, unificando así todo el sistema de precisión financiera de la app sin poner en riesgo pedidos actuales en esta etapa (EP-001).

## 4. Categorías
Las 3 categorías principales fueron mapeadas a partir del contenido de los productos en `menu.ts`:
* Lomos (`lomos`)
* Milanesas (`milanesas`)
* Hamburguesas (`hamburguesas`)

## 5. Productos
Se migraron automáticamente **4 productos reales** a la base de datos conservando sus identificadores exactos (ej. `lomo-entre-panes`), nombres, precios e imágenes. 

## 6. Seed
Se creó un script automatizado `prisma/seed.ts` completamente **idempotente**. Utiliza la directiva `upsert` por lo que puede ejecutarse repetidamente sin crear duplicados.
1. Lee `INITIAL_PRODUCTS` desde `menu.ts`.
2. Extrapola e inserta las categorías (evitando fallos de constraints foráneas).
3. Inserta/Actualiza los productos enlazados.

## 7. Arquitectura
El archivo `src/app/page.tsx` sufrió un refactor arquitectónico importante en Next.js:
* Pasó de ser un `Client Component` a un `Server Component`.
* Ahora solicita los productos mediante capa de abstracción (`src/lib/data/products.ts`), la cual invoca a Prisma.
* Toda la lógica cliente (carrito, UI, WhatsApp) se encapsuló y movió al nuevo componente `<MenuClient />` (`src/components/MenuClient.tsx`), el cual recibe por *props* los datos del servidor mapeados con seguridad.
* Prisma nunca es importado del lado del cliente.

## 8. Archivos modificados
* `PLAN.md`
* `prisma/schema.prisma`
* `package.json`
* **[NUEVO]** `prisma/seed.ts`
* **[NUEVO]** `prisma/migrations/20260831131700_init_product_catalog/migration.sql`
* **[NUEVO]** `src/lib/data/products.ts`
* `src/app/page.tsx`
* **[NUEVO]** `src/components/MenuClient.tsx`

## 9. Migración Prisma
**Nombre exacto:** `20260831131700_init_product_catalog`
*(Nota: Debido al entorno no interactivo para el prompt TTY, se generó vía `diff` y se aplicó con `npx prisma db push`).*

## 10. menu.ts
* **Estado:** Continúa usándose.
* **Justificación:** Aunque la app ahora lee los productos desde Prisma, el script `prisma/seed.ts` todavía usa `menu.ts` como la fuente inicial de los datos para rellenar la base de datos si fuera necesario (ej. en despliegues iniciales). Este archivo quedará `deprecated` en el futuro cuando implementemos el CRUD administrativo de productos y no precisemos depender de datos de desarrollo estáticos.

## 11. Validaciones
* `prisma format`: **Éxito**.
* `prisma validate` *(durante compilación TS)*: **Éxito**.
* `seed`: **Éxito** (4 productos y 3 categorías insertados).
* `tsc --noEmit`: **Éxito** (código 0).
* `npm run build`: **Éxito** (las páginas estáticas y dinámicas rutearon bien con las nuevas dependencias).

## 12. Regresión
Se verificó visual y estáticamente que el frontend mantuviera compatibilidad. Los tipos que se envían al `<MenuClient />` se mapearon exactamente a los tipos requeridos por el carrito (`CartItem.product.category` como string literal, `CartItem.product.price` como `number`). Por ende, el carrito sigue operativo. 

## 13. Problemas pendientes
* Inconsistencia temporal monetaria: `Product.price` es `Int`, mientras `OrderItem.price` y `Order.total` son `Float`. Su normalización deberá hacerse en **EP-002**.
* El checkout todavía admite peticiones directas desde el cliente, que deberá arreglarse en **EP-003** (Secure Checkout).

## 14. Estado final
**¿El catálogo puede obtener ahora sus productos y categorías desde Prisma/DB sin depender de datos comerciales hardcodeados en el componente?**
**Sí.** 

*(EP-001 finalizado y marcado `[x] Completado`).*
