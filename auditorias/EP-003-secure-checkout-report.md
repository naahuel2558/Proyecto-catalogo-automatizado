# EP-003 — Secure Checkout Report

## 1. Vulnerabilidad anterior

El checkout se iniciaba en `src/components/MenuClient.tsx`. El navegador calculaba el total y enviaba a `createOrder(total, items)` un payload con `title`, `price`, `quantity` y `total`. La Server Action usaba esos valores directamente, aplicando solamente `Math.round`, por lo que un cliente podía alterar precios, nombres o total antes de crear la `Order`.

El cliente también generaba un identificador numérico, construía el texto completo del recibo, guardaba otra representación de la orden en `localStorage('entrepanes_orders')` y enviaba el recibo a `/api/send-receipt`. Ese endpoint aceptaba `receiptText` sin reconstruirlo desde la base de datos, creando un segundo camino para interpretar información comercial manipulada.

La vista `/cocina` continúa leyendo `localStorage`; esa arquitectura no se amplió en EP-003 y será reemplazada en EP-006.

## 2. Nuevo contrato cliente-servidor

La Server Action recibe un único objeto. Los ítems admiten exclusivamente:

```ts
{
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  customerName: string;
  customerPhone: string;
  fulfillmentType: "DELIVERY" | "PICKUP";
  address?: string;
  notes?: string;
}
```

`customerName` y `customerPhone` corresponden a campos ya presentes en el formulario. No se añadió ningún input comercial nuevo. El contrato rechaza campos desconocidos, por lo que no acepta `price`, `total`, `productName`, `title`, `status`, `userId` ni `orderCode`.

Los productos duplicados se normalizan sumando sus cantidades antes de consultar y persistir. Si la cantidad combinada supera el máximo permitido, el payload se rechaza.

## 3. Validaciones

Zod no estaba instalado y no se agregó una dependencia para esta tarea. Se implementó validación runtime estricta en `src/lib/orders/secure-checkout.ts`:

- el payload y cada ítem deben ser objetos;
- `items` debe existir, ser un array no vacío y contener como máximo 50 entradas;
- `productId` debe ser texto no vacío;
- `quantity` debe ser entero, mayor que cero y no superar 99 por producto normalizado;
- nombre, celular, dirección y notas se validan por tipo, contenido y longitud;
- el celular acepta únicamente caracteres propios de un número telefónico;
- `fulfillmentType` admite sólo `DELIVERY` o `PICKUP`;
- delivery requiere dirección;
- cualquier campo fuera de la lista permitida provoca `INVALID_INPUT`.

Los errores comerciales se devuelven como DTO controlado. Los errores inesperados se registran sólo en servidor y el cliente recibe un mensaje genérico, sin stack trace.

## 4. Cálculo monetario

Dentro de una transacción Prisma, el servidor consulta cada `Product` por ID. `Product.price` es la única fuente del precio. Para cada ítem calcula:

```text
subtotal = Product.price × quantity
total = suma de subtotales
```

Todo se mantiene como enteros y se valida con `Number.isSafeInteger`. No se usa `Math.round`, `parseFloat`, precios del navegador ni un total propuesto por el navegador.

## 5. Sesión

`src/app/actions/order.ts` obtiene la sesión mediante `getServerSession(authOptions)`. El `userId` se toma exclusivamente de `session.user.id`. Si no hay sesión, se conserva el checkout invitado con `userId = null`. El contrato no admite `userId` del cliente.

## 6. Transacción

La consulta de productos, las verificaciones, el cálculo y la creación de `Order` con sus `OrderItems` se realizan dentro de una única transacción interactiva de Prisma. La creación anidada garantiza que el pedido completo se confirma o todo se revierte. Los casos de producto inexistente, archivado o no disponible no dejan órdenes parciales.

## 7. Snapshot

Cada `OrderItem` persiste desde el producto consultado en DB:

- `productId` ← `Product.id`;
- `productName` ← `Product.name`;
- `unitPrice` ← `Product.price`;
- `quantity` ← cantidad validada y normalizada.

La prueba de regresión cambia `Product.price` después de crear el pedido y confirma que `OrderItem.unitPrice` conserva el valor original.

## 8. orderCode

El servidor genera códigos con el formato `EP-` seguido por 10 caracteres hexadecimales aleatorios, por ejemplo `EP-A1B2C3D4E5`. La restricción `@unique` existente sigue siendo la garantía definitiva. Ante un error Prisma `P2002`, la operación genera otro código y reintenta hasta cinco veces. El cliente nunca propone el código y el CUID interno no se devuelve.

## 9. Estado

Todo checkout exitoso se crea explícitamente con `WAITING_WHATSAPP`. No depende del default `DRAFT`. `whatsappConfirmedAt` se escribe explícitamente como `null` y abrir o intentar enviar WhatsApp no cambia el pedido a `CONFIRMED`.

La definición de estados quedó centralizada en `ORDER_STATUS` dentro de `src/types/index.ts`; `OrderStatus` deriva de esa única fuente TypeScript.

## 10. WhatsApp

El enlace manual se genera en servidor a partir del DTO validado de la orden. Usa `orderCode`, snapshot de ítems y total calculado en DB.

`/api/send-receipt` ahora admite únicamente `orderCode`, `customerName` y `customerPhone`. Busca la `Order` y reconstruye el recibo desde sus datos persistidos. Rechaza `receiptText`, `price`, `total` y cualquier campo desconocido. Por lo tanto, ya no puede usarse como una ruta alternativa para introducir información monetaria del cliente.

## 11. Tests de manipulación

Se agregó `npm run test:secure-checkout`, que usa fixtures aisladas en SQLite y las elimina en `finally`.

| Caso | Prueba | Resultado |
|---|---|---|
| A | Ítem con `price` manipulado | Rechazado por campo no permitido; no se usa el precio |
| B | Payload con `total = 0` | Rechazado por campo no permitido |
| C | Producto inexistente | `PRODUCT_NOT_FOUND`; no se crea Order |
| D | `isAvailable = false` | `PRODUCT_UNAVAILABLE`; no se crea Order |
| E | `isArchived = true` | `PRODUCT_ARCHIVED`; no se crea Order |
| F | Cantidad 0 | `INVALID_QUANTITY` |
| G | Cantidad negativa | `INVALID_QUANTITY` |
| H | Cantidad decimal | `INVALID_QUANTITY` |
| I | Pedido válido con producto duplicado | Cantidades normalizadas; Order + OrderItem creados; total correcto |
| J | Cambio posterior de `Product.price` | El snapshot conserva el `unitPrice` original |

La verificación del caso válido confirmó:

- `orderCode` con formato esperado;
- `total == Σ(unitPrice × quantity)`;
- estado `WAITING_WHATSAPP`;
- `userId = null` para invitado;
- `whatsappConfirmedAt = null`;
- `productId`, `productName`, `unitPrice` y `quantity` correctos.

También se comprobó que `/api/send-receipt` responde HTTP 400 a un payload que intenta enviar `receiptText` y `total = 0`.

## 12. Archivos modificados

- `.gitignore` — normalización de una regla UTF-16 corrupta que Git interpretaba como `*`; se conservan las exclusiones locales previstas.
- `PLAN.md`
- `package.json`
- `scripts/test-secure-checkout.ts` (nuevo)
- `src/app/actions/order.ts`
- `src/app/api/send-receipt/route.ts`
- `src/components/CheckoutModal.tsx`
- `src/components/MenuClient.tsx`
- `src/lib/orders/secure-checkout.ts` (nuevo)
- `src/types/index.ts`
- `auditorias/EP-003-secure-checkout-report.md` (nuevo)

Además se eliminaron `audit_db.js` y `fix_schema.js`, scripts temporales no versionados utilizados exclusivamente durante EP-002. No se eliminó ningún script operativo.

## 13. Validaciones

- `npm run test:secure-checkout`: PASS, casos A-J.
- `npx prisma validate`: PASS.
- `npx prisma migrate status`: PASS, 3 migraciones y base sincronizada.
- `npx tsc --noEmit`: PASS, 0 errores.
- `npm run lint`: PASS, 0 errores y 29 warnings preexistentes.
- `npm run build`: PASS con Next.js 16.3.1.

Smoke test local:

- `/`: HTTP 200 y catálogo/categorías provenientes de Prisma visibles.
- `/login`: HTTP 200.
- `/registro`: HTTP 200.
- `/perfil`: HTTP 307 esperado sin sesión.
- `/admin/clientes`: HTTP 200.
- `/cocina`: HTTP 200.
- `/api/send-receipt` con payload comercial inseguro: HTTP 400.
- Tras los tests, la base volvió a 0 órdenes; no quedaron fixtures.

No se modificó `schema.prisma` ni ninguna migración aplicada.

## 14. Riesgos pendientes

Quedan expresamente fuera de EP-003:

- `/cocina` todavía depende de `localStorage`; se reemplazará por DB en EP-006.
- La confirmación real y `whatsappConfirmedAt` requieren el webhook de EP-007.
- OrderAgent corresponde a EP-008.
- El envío automático por Baileys puede no estar disponible; el enlace manual continúa como respaldo.
- Los datos de contacto del invitado no forman parte del schema actual de `Order`; se validan para el recibo, pero una eventual persistencia requiere una decisión de dominio y una migración append-only futura.

## 15. Estado final

**¿Es posible alterar el precio o total de un pedido modificando el payload desde el navegador?**

**NO.**

Los campos son rechazados y, aun si se manipula el estado visual del carrito, el precio y el total persistidos se obtienen y calculan exclusivamente en el servidor desde `Product.price`.
