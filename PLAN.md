# PLAN — IA ENTRE PANES

Documento de ejecución del proyecto.

Estados:

- `[ ]` Pendiente
- `[~]` En progreso
- `[x]` Completado
- `[!]` Bloqueado

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

Estado: `[ ]` Pendiente

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

Estado: `[~]` En progreso — auditoría previa completada el 31/08/2026.

Decisiones de implementación: Prisma será la única fuente de pedidos; acceso operativo con el rol `ADMIN` existente; transiciones validadas y condicionales en servidor; snapshots de `OrderItem` inmutables; sin cambios de schema ni migraciones previstos.

Ruta:

`/cocina`

- [ ] Proteger acceso.
- [ ] Mostrar pedidos `CONFIRMED`.
- [ ] Mostrar pedidos `PREPARING`.
- [ ] Mostrar pedidos `READY`.
- [ ] Comenzar preparación.
- [ ] Marcar listo.
- [ ] Marcar entregado.
- [ ] Cancelación controlada.
- [ ] Actualización rápida.
- [ ] Diseño usable en tablet/escritorio.

Criterio de aceptación:

El personal puede operar pedidos sin entrar al CRM.

---

# FASE 5 — WhatsApp

## EP-007 — WhatsApp Webhook

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

`EP-000 — Auditoría técnica`

No modificar arquitectura todavía.

Primero obtener estado real del repositorio.
