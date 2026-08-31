# PLAN — IA ENTRE PANES

Documento de ejecución del proyecto.

Estados:

- `[ ]` Pendiente
- `[~]` En progreso
- `[x]` Completado
- `[!]` Bloqueado

---

# P0 — Production Safety

Sección de contención inmediata. Tiene prioridad sobre cualquier tarea EP pendiente.

## P0-001 — Production Containment

Estado: `[x]` Completado y validado el 31/08/2026.

Informe: `auditorias/P0-001-production-containment-report.md`

Motivo:

Se detectaron dos riesgos de producción que requieren contención antes de continuar con el roadmap funcional:

1. `/api/send-receipt` permitía que un tercero solicitara el envío de un mensaje de WhatsApp, desde el número del negocio, hacia un teléfono arbitrario indicado en el body.
2. Artefactos locales (`prisma/dev.db`, `tsconfig.tsbuildinfo`) estaban trackeados por Git.

Alcance:

- [x] Auditar `/api/send-receipt` y todo consumidor de `sendWhatsAppMessage`.
- [x] Deshabilitar el envío automático mientras `Order` no persista `customerPhone`.
- [x] Conservar el flujo manual `wa.me` generado server-side desde la Order validada.
- [x] Auditar y corregir el tracking de artefactos locales en Git.
- [x] Ampliar `.gitignore` con patrones SQLite y build artifacts.
- [x] Tests de seguridad del endpoint de recibo (casos A–D).
- [x] Informe `auditorias/P0-001-production-containment-report.md`.

Fuera de alcance (explícito):

- Migración a PostgreSQL → `INFRA-001`.
- Persistencia de `customerName` / `customerPhone` en `Order` → `EP-002.1`.
- Reescritura del historial de Git.
- Middleware / guards.
- WhatsApp Cloud API → `EP-007`.

Criterio de aceptación:

No existe ninguna ruta pública capaz de usar el WhatsApp del negocio para enviar mensajes a un teléfono arbitrario, y los artefactos SQLite locales dejan de incorporarse a nuevos commits.

Bloqueo:

P0-001 bloqueó el avance hacia `EP-007` y posteriores hasta su cierre. Bloqueo levantado el 31/08/2026.

EP-004, EP-005 y EP-006 ya estaban completadas cuando se detectó P0; se conserva su estado real y no se retiraron del roadmap.

---

## INFRA-001 — PostgreSQL Production Foundation

Estado: `[ ]` Pendiente. Desbloqueada: P0-001 cerrada. No iniciar sin confirmación.

`prisma/schema.prisma` declara `url = "file:./dev.db"` de forma literal. La aplicación está desplegada en Vercel, cuyo filesystem es efímero, por lo que la persistencia real de producción no está garantizada.

- [ ] Reemplazar la URL literal por `env("DATABASE_URL")`.
- [ ] Cambiar el provider a `postgresql`.
- [ ] Migrar el historial de migraciones.
- [ ] Definir variables de entorno por ambiente.
- [ ] Validar `migrate status` contra la base real.
- [ ] Revalidar Secure Checkout, Product Admin, Category Admin y Cocina.

---

# FASE 0 — Auditoría inicial

## EP-000 — Auditoría técnica

- [x] Revisar estructura actual del proyecto.
- [x] Revisar `package.json`.
- [x] Revisar Prisma schema.
- [x] Revisar autenticación existente.
- [x] Revisar catálogo actual.
- [x] Revisar carrito actual.
- [x] Revisar checkout actual.
- [x] Revisar rutas admin.
- [x] Revisar historial de pedidos.
- [x] Ejecutar build/test disponible.
- [x] Documentar hallazgos antes de modificar.

Objetivo:

Conocer exactamente el estado real antes de tocar arquitectura.

---

## EP-000.1 — Technical Baseline Repair

- [x] Investigar `prisma.config.ts`.
- [x] Corregir tipos `any` en `src/lib/whatsapp/bot.ts` y `src/app/admin/clientes/page.tsx`.
- [x] Ejecutar y validar `npm run build` exitoso.

Objetivo:

Asegurar que el proyecto compila correctamente antes de implementar nuevas funcionales.

---

# FASE 1 — Dominio central

## EP-001 — Product + Category Domain

- [x] Crear/revisar modelo `Category`.
- [x] Crear/revisar modelo `Product`.
- [x] Agregar `isAvailable`.
- [x] Agregar `isFeatured`.
- [x] Agregar `isArchived`.
- [x] Crear relaciones.
- [x] Crear migración Prisma.
- [x] Seed inicial si corresponde.
- [x] Mantener compatibilidad con datos existentes.

Criterio de aceptación:

El catálogo puede provenir completamente de DB.

---

## EP-002 — Order Domain

- [ ] Revisar `Order`.
- [ ] Revisar `OrderItem`.
- [ ] Agregar `orderCode`.
- [ ] Definir enum de estados.
- [ ] Agregar campos de entrega.
- [ ] Agregar campos de pago.
- [ ] Agregar `whatsappConfirmedAt`.
- [ ] Mantener snapshot histórico de producto/precio.
- [ ] Crear migración.

Criterio de aceptación:

Los pedidos tienen un ciclo de vida claro y auditables.

---

# FASE 2 — Checkout seguro

## EP-003 — Secure Checkout

Estado: `[x]` Completado

- [x] El frontend envía solamente `productId` y `quantity` como datos comerciales de los ítems.
- [x] Servidor consulta productos.
- [x] Servidor verifica disponibilidad.
- [x] Servidor recalcula precios.
- [x] Servidor calcula total.
- [x] Servidor genera código `EP-*`.
- [x] Pedido se crea como `WAITING_WHATSAPP`.
- [x] Crear OrderItems.
- [x] Redirección a WhatsApp.
- [x] No considerar venta confirmada hasta confirmación.

Criterio de aceptación:

Manipular precio desde navegador no altera el pedido real.

---

## SEC-001 — Receipt Endpoint Hardening

Estado: `[x]` Contenida por `P0-001` el 31/08/2026.

El envío automático quedó deshabilitado y `/api/send-receipt` ya no puede provocar un envío. La resolución de fondo —persistir el contacto del pedido invitado para poder reactivar el envío de forma segura— queda en `EP-002.1`.

Antes de conectar automatizaciones externas reales de WhatsApp se deberá revisar `/api/send-receipt` para evitar abuso mediante reenvíos a números arbitrarios y definir si los datos de contacto del pedido invitado deben persistirse.

Esta observación no bloquea EP-004 y no se implementa dentro de su alcance.

---

# FASE 3 — Administración de productos

## EP-004 — Product Admin CRUD

Estado: `[x]` Completado

Ruta:

`/admin/productos`

- [x] Tabla/listado de productos.
- [x] Búsqueda.
- [x] Filtro por categoría.
- [x] Filtro por disponibilidad.
- [x] Crear producto.
- [x] Editar producto.
- [x] Cambiar nombre.
- [x] Cambiar descripción.
- [x] Cambiar precio.
- [x] Cambiar imagen.
- [x] Cambiar categoría.
- [x] Disponible/no disponible.
- [x] Destacado/no destacado.
- [x] Archivar.
- [x] Restaurar.
- [x] Protección ADMIN.
- [x] Validaciones de servidor.

Criterio de aceptación:

El dueño puede administrar el menú sin tocar código.

---

## EP-005 — Category Admin CRUD

Estado: completada y validada el 31/08/2026.

Ruta:

`/admin/categorias`

- [x] Listar.
- [x] Crear.
- [x] Editar.
- [x] Archivar.
- [x] Restaurar.
- [x] Validar slug.
- [x] Manejar categorías con productos asociados.
- [x] Protección ADMIN.

---

# FASE 4 — Cocina

## EP-006 — Cocina

Estado: `[x]` Completado y validado el 31/08/2026.

Resumen: Cocina quedó conectada exclusivamente a Prisma, protegida con el rol `ADMIN` existente y operando transiciones server-side condicionales. Se preservaron los snapshots de `OrderItem`, se agregó refresh cada 15 segundos, suite A–P y regresión completa. No hubo cambios de schema ni migraciones. EP-007 mantiene pendiente la confirmación automática por webhook y la persistencia de contacto invitado continúa como decisión futura ya documentada en SEC-001/EP-003.

Ruta:

`/cocina`

- [x] Proteger acceso.
- [x] Mostrar pedidos `CONFIRMED`.
- [x] Mostrar pedidos `PREPARING`.
- [x] Mostrar pedidos `READY`.
- [x] Comenzar preparación.
- [x] Marcar listo.
- [x] Marcar entregado.
- [x] Cancelación controlada.
- [x] Actualización rápida.
- [x] Diseño usable en tablet/escritorio.

Criterio de aceptación:

El personal puede operar pedidos sin entrar al CRM.

---

# FASE 5 — WhatsApp

## EP-007 — WhatsApp Webhook

Estado: `[!]` Bloqueado. Requiere `INFRA-001` y una integración oficial de WhatsApp (Cloud API). Baileys no es infraestructura de producción.

Endpoint:

`/api/webhooks/whatsapp`

- [ ] Configurar webhook.
- [ ] Validar solicitudes.
- [ ] Procesar mensajes.
- [ ] Extraer código de pedido.
- [ ] Buscar Order.
- [ ] Registrar confirmación.
- [ ] Pasar `WAITING_WHATSAPP → CONFIRMED`.
- [ ] Evitar dobles confirmaciones.
- [ ] Manejar pedido inexistente.

---

## EP-008 — OrderAgent

Primera versión determinista.

- [ ] Confirmar pedido.
- [ ] Consultar estado.
- [ ] Responder por código.
- [ ] Avisar pedido listo.
- [ ] Manejar mensajes desconocidos.

Segunda versión futura:

- [ ] Lenguaje natural.
- [ ] Consultar catálogo.
- [ ] Repetir pedido anterior.
- [ ] Interpretar modificaciones simples.
- [ ] IA generativa solamente cuando aporte valor.

---

# FASE 6 — CRM y experiencia de cliente

## EP-009 — Perfil mejorado

- [ ] Historial.
- [ ] Estado actual.
- [ ] Detalle.
- [ ] Repetir pedido.
- [ ] Datos personales.

---

## EP-010 — CRM clientes

- [ ] Cantidad de pedidos.
- [ ] Última compra.
- [ ] Total gastado.
- [ ] Historial.
- [ ] Productos frecuentes.

---

# FASE 7 — Analytics

## EP-011 — Dashboard

- [ ] Ventas del día.
- [ ] Pedidos del día.
- [ ] Ticket promedio.
- [ ] Producto más vendido.
- [ ] Clientes frecuentes.
- [ ] Ventas semanales.
- [ ] Ventas mensuales.
- [ ] Cancelaciones.
- [ ] Horarios pico.

---

# FASE 8 — Producción

## EP-012 — Producción

- [ ] Migrar SQLite → PostgreSQL.
- [ ] Variables de entorno seguras.
- [ ] Configurar OAuth producción.
- [ ] Configurar WhatsApp producción.
- [ ] Revisar seguridad.
- [ ] Revisar logs.
- [ ] Revisar backups.
- [ ] Validar rendimiento.
- [ ] Deployment.

---

# ORDEN DE EJECUCIÓN

Orden recomendado:

1. EP-000
2. EP-001
3. EP-002
4. EP-003
5. EP-004
6. EP-005
7. EP-006
8. EP-007
9. EP-008
10. EP-009
11. EP-010
12. EP-011
13. EP-012

No saltar directamente al bot antes de consolidar pedidos.

---

# Regla de trabajo con Antigravity

Cada tarea debe seguir este flujo:

1. Leer `README.md`.
2. Leer `PLAN.md`.
3. Identificar tarea actual.
4. Auditar archivos involucrados.
5. Presentar plan de modificación.
6. Implementar solo el alcance indicado.
7. Validar.
8. Resumir cambios.
9. Actualizar estado de la tarea en `PLAN.md`.
10. Registrar decisiones técnicas importantes.

Si aparece un problema fuera del alcance:

- No solucionarlo silenciosamente.
- Documentarlo.
- Proponer una tarea separada.

---

# TAREA ACTUAL RECOMENDADA

`INFRA-001 — PostgreSQL Production Foundation`

P0-001 quedó cerrada. El siguiente bloqueo real es la persistencia de producción: `schema.prisma` declara `url = "file:./dev.db"` de forma literal y el despliegue corre sobre un filesystem efímero.

No iniciar hasta confirmarlo con el responsable del plan.
