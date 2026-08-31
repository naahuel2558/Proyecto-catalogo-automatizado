# Auditoría de Diseño & Migración: EP-002 — Order Domain

## 1. Resumen de la Intervención
El objetivo de **EP-002** fue transformar el modelo de base de datos de órdenes (simplificado inicialmente) en un **Order Domain** robusto, preparándolo para el futuro checkout seguro, notificaciones por WhatsApp y sistemas de gestión, garantizando la persistencia absoluta del historial de datos.

## 2. Acciones Realizadas

### A. Auditoría de Datos
Se ejecutó un script de diagnóstico (`audit_db.js`) sobre `dev.db` que comprobó la inexistencia de datos históricos en `Order` y `OrderItem` (0 filas en ambos), confirmando un riesgo nulo al convertir `Float` a `Int` para `price`/`total`.

### B. Consolidación de Historial Prisma
El esquema base de desarrollo había perdido su alineación con el historial de migraciones tras el uso de `db push` histórico. Para remediarlo de manera no destructiva, se reconstruyó la migración inicial (`0_init`) respetando la estructura antes de `init_product_catalog`, permitiendo la correcta evolución de Prisma Migrate y el correcto funcionamiento del `Shadow Database`.

### C. Modificaciones del Esquema (Prisma)
- **`Order`**:
  - `total` transformado de `Float` a `Int`.
  - Agregado campo `orderCode String @unique` (e.g. `EP-A1B2C3`).
  - Nuevo set de campos logísticos y operativos: `fulfillmentType`, `paymentMethod`, `address`, `notes`, `whatsappConfirmedAt`.
  - El campo `status` ha sido re-establecido como `String @default("DRAFT")`. *(Se implementó de esta manera ya que Prisma no soporta `enum` de manera nativa en SQLite, y fallaba en la validación)*.

- **`OrderItem`**:
  - `price` transformado a `unitPrice Int`.
  - `title` transformado a `productName String` (snapshot inmutable).
  - Creada relación opcional con `Product` mediante `productId String?` (`onDelete: SetNull`), lo cual asegura que las órdenes históricas no sean afectadas en caso de eliminación de un producto.

### D. Refactorización del Código
- Se actualizó el tipado global en `src/types/index.ts` para usar `OrderStatus`.
- Se refactorizó la Server Action de creación en `src/app/actions/order.ts`, integrando la generación estandarizada de un código de orden provisorio (`crypto.randomUUID()`) y el redondeo de los flotantes a enteros preventivamente.
- Se refactorizaron las interfaces de cocina y cliente para utilizar los nuevos estados (e.g. `WAITING_WHATSAPP`).

### E. Verificación
El proceso fue superado con los controles correspondientes:
- ✅ `npx prisma validate`: **PASS**
- ✅ `npx prisma migrate deploy` (Generada la migración segura `20260831112700_order_domain` sin pérdida): **PASS**
- ✅ `npx tsc --noEmit` & `npm run lint`: **PASS**

## 3. Próximos Pasos (Bloqueos Levantados)
La infraestructura actual ahora soporta la iteración hacia **EP-003 — Secure Checkout**. El dominio transaccional es estable.
