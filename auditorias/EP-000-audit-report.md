# Auditoría Técnica - IA ENTRE PANES (EP-000)

## 1. Estado actual
- **Catálogo, Carrito y Checkout**: Funcionan completamente en el frontend (`src/app/page.tsx`).
- **Autenticación**: Funciona usando NextAuth con Google y Email/Contraseña.
- **Cocina**: La vista en `/cocina` funciona, pero depende de `localStorage` para obtener los pedidos, no de una base de datos real o websockets.
- **Bot de WhatsApp**: Existe un archivo `bot.ts` que puede ejecutarse manualmente (`npm run whatsapp`).
- **Registro de pedidos en DB**: Se guardan en Prisma, pero la redirección a WhatsApp se genera completamente desde el cliente antes o en paralelo.
- **Rutas de administración**: Existe `/admin/clientes` con listado de clientes que lee desde la BD real.

## 2. Arquitectura encontrada
El proyecto es una aplicación **Next.js 14+ (App Router)** usando TypeScript y TailwindCSS.
Se organiza en:
- `src/app/`: Rutas del frontend (catálogo, admin, cocina, login, registro, perfil).
- `src/app/api/`: Rutas de API para NextAuth (`auth/[...nextauth]`) y un endpoint `send-receipt`.
- `src/app/actions/`: Server Actions para manejo de órdenes (`order.ts`), admin (`admin.ts`) y auth.
- `src/components/`: Componentes reutilizables.
- `src/lib/`: Configuración y utilidades (Prisma en `db.ts`, NextAuth en `auth.ts`, data de prueba en `menu.ts`, bot de whatsapp en `whatsapp/bot.ts`).

## 3. Modelo de datos actual
- **User, Account, Session, VerificationToken**: Modelos estándar de NextAuth. El `User` tiene un campo `role` por defecto en `"USER"`.
- **Order**: Contiene `id` (cuid), `userId` (opcional), `total`, `status` (por defecto "PENDING") y `createdAt`.
- **OrderItem**: Contiene `id`, `orderId`, `title`, `price`, `quantity`.
*Nota: Actualmente **NO EXISTE** un modelo `Product` ni `Category` en la base de datos.*

## 4. Catálogo
- **Ubicación actual**: Los productos están 100% **hardcodeados** en un archivo TypeScript: `src/lib/data/menu.ts`.
- **Carga**: Se importan de forma síncrona como un arreglo estático en `src/app/page.tsx` (`INITIAL_PRODUCTS`).
- **Base de datos**: Los productos no provienen de la DB; la DB solo registra los `OrderItem` con el título y precio al momento de la venta.

## 5. Flujo actual del pedido
El flujo actual es: **Catálogo → Carrito → Checkout → Cliente (Browser) → DB + WhatsApp**.
1. **Catálogo y Carrito**: El usuario selecciona ítems en la UI. Todo el cálculo de precios y stock se maneja en React states.
2. **Checkout**: Al presionar "Comprar", `src/app/page.tsx` ensambla un mensaje de texto.
3. **Database**: Se llama al Server Action `createOrder` enviándole el `total` y los `items` desde el navegador. El servidor **no valida** los precios; confía ciegamente en lo que envía el cliente.
4. **Almacenamiento Local**: Se guarda en `localStorage('entrepanes_orders')` para que la vista `/cocina` pueda verlo (solo funciona en la misma máquina si es local, o en el browser de quien despacha si de alguna manera lo comparte, lo cual en la realidad significa que `/cocina` de un administrador **no** verá los pedidos de los clientes debido a que `localStorage` es aislado por navegador del cliente).
5. **WhatsApp (API interna)**: Se llama a `/api/send-receipt` enviando la orden completa para enviarla por bot.
6. **WhatsApp (Redirección)**: Se redirige al cliente vía un enlace `wa.me` manual de respaldo.

## 6. Autenticación y permisos
- **Login**: Configurado correctamente usando NextAuth (GoogleProvider y CredentialsProvider en `src/lib/auth.ts`). Las contraseñas se guardan y verifican encriptadas con `bcrypt`.
- **Sesiones**: Usa la estrategia de JWT (JSON Web Tokens). En el token se inyecta el `role` y el `id` del usuario.
- **USER/ADMIN**: El modelo de base de datos define `role String @default("USER")`.
- **Rutas Protegidas**: `/admin/clientes/page.tsx` verifica si el rol es `"ADMIN"`, redirigiendo a `"/"` si no lo es.

## 7. Administración existente
El administrador actualmente solo puede:
- Ver la lista de usuarios y cantidad de pedidos en `/admin/clientes`.
- Ver el historial de pedidos de un usuario específico en `/admin/clientes/[id]`.

## 8. Problemas encontrados

### Críticos
1. **Manipulación de precios**: El frontend envía el monto total y los precios individuales al Server Action `createOrder`. Un usuario malicioso podría alterar el JSON enviado e ingresar pedidos gratuitos a la DB.
2. **Vista `/cocina` en `localStorage`**: La cocina está leyendo las comandas desde `localStorage`. Esto significa que cada cliente guarda su propio pedido en su propio navegador. El cocinero jamás verá los pedidos de otros clientes.

### Importantes
1. **Falta del dominio Product**: Los productos están hardcodeados en el frontend (`menu.ts`), haciendo imposible para un administrador gestionarlos (agregar, quitar, cambiar precios) sin tocar el código fuente y redesplegar.
2. **Flujo de pedidos desconectado**: Se llama al bot y a la BD desde el cliente con múltiples requests, lo cual puede generar fallas parciales (se guarda en BD pero no se envía al bot, etc.).
3. **Typescript build erróneo**: El comando `npm run build` falla por `prisma.config.ts` (`Cannot find module 'prisma/config'`). Además, hay un error TS de tipo `any` en `src/lib/whatsapp/bot.ts`.

### Menores
1. **Advertencias de ESLint**: Múltiples warnings sobre el uso de etiquetas `<img>` y variables no usadas.
2. **Estado de órdenes**: El esquema de DB tiene un string libre `"PENDING"` para status en vez de Enums robustos, y carece de campos importantes (envío/retiro, info de WhatsApp).

## 9. Riesgos de seguridad
- **Confianza excesiva en el cliente**: Como se mencionó en *Críticos*, el Server Action de la compra (`createOrder`) recibe `total` e `items` explícitamente desde el navegador. Un atacante puede interceptar la request y poner `total: 0`.
- **Falta de Server-Side Checks en Checkout**: No se verifica la disponibilidad del producto en stock/DB, porque directamente la DB no tiene productos.

## 10. Deuda técnica
- Refactorizar `/cocina` para que lea de la base de datos (polling, SSE o WebSockets), eliminando la dependencia absurda del `localStorage`.
- Solucionar errores de TypeScript (borrar o arreglar `prisma.config.ts` y limpiar los tipados `any` en el bot de WhatsApp).
- Implementar validación sólida con Zod para todos los Server Actions.

## 11. Diferencias con `README.md`
- El `README.md` menciona que `Web->>Cocina: Registra la comanda en la vista del personal del local`. En realidad, `/cocina` lee de `localStorage`, lo cual está fundamentalmente roto para producción.
- No hay menciones de validaciones de seguridad en el `README.md`, lo cual es urgente dada la actual manipulación posible.

## 12. EP-001 (Archivos a modificar)
Para ejecutar `EP-001 — Product + Category Domain` habrá que modificar:
1. `prisma/schema.prisma` (Agregar modelos `Category` y `Product`).
2. Generar una migración Prisma.
3. Crear un script de `seed.ts` para cargar los datos hardcodeados de `src/lib/data/menu.ts` a la BD inicial.
4. (Opcionalmente) borrar o despreciar `src/lib/data/menu.ts`.

## 13. Recomendación técnica
1. **Corregir inmediatamente** el error de Typescript (`prisma.config.ts`) para que el proyecto pueda al menos compilar.
2. **Avanzar con la Tarea EP-001**: Tal cual indica el plan, se debe modelar la base de datos de productos primero. Esto es la fundación para arreglar el gran agujero de seguridad de los precios en las compras.
