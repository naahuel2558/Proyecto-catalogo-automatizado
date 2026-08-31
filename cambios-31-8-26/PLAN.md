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

- [ ] Crear/revisar modelo `Category`.
- [ ] Crear/revisar modelo `Product`.
- [ ] Agregar `isAvailable`.
- [ ] Agregar `isFeatured`.
- [ ] Agregar `isArchived`.
- [ ] Crear relaciones.
- [ ] Crear migración Prisma.
- [ ] Seed inicial si corresponde.
- [ ] Mantener compatibilidad con datos existentes.

Criterio de aceptación:

El catálogo puede provenir completamente de DB.

---

## EP-001.1 — Migration & Domain Consistency

- [x] Verificar Prisma migrate status.
- [x] Validar categorías dinámicas (sin hardcodeo).
- [x] Ejecutar lint.
- [x] Validar build y types.
- [x] Datos de prueba verificados (3 categorías, 4 productos).
- [x] Generar reporte EP-001.1-consistency-report.md.

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

- [ ] El frontend envía solamente `productId` y `quantity`.
- [ ] Servidor consulta productos.
- [ ] Servidor verifica disponibilidad.
- [ ] Servidor recalcula precios.
- [ ] Servidor calcula total.
- [ ] Servidor genera código `EP-*`.
- [ ] Pedido se crea como `WAITING_WHATSAPP`.
- [ ] Crear OrderItems.
- [ ] Redirección a WhatsApp.
- [ ] No considerar venta confirmada hasta confirmación.

Criterio de aceptación:

Manipular precio desde navegador no altera el pedido real.

---

# FASE 3 — Administración de productos

## EP-004 — Product Admin CRUD

Ruta:

`/admin/productos`

- [ ] Tabla/listado de productos.
- [ ] Búsqueda.
- [ ] Filtro por categoría.
- [ ] Filtro por disponibilidad.
- [ ] Crear producto.
- [ ] Editar producto.
- [ ] Cambiar nombre.
- [ ] Cambiar descripción.
- [ ] Cambiar precio.
- [ ] Cambiar imagen.
- [ ] Cambiar categoría.
- [ ] Disponible/no disponible.
- [ ] Destacado/no destacado.
- [ ] Archivar.
- [ ] Restaurar.
- [ ] Protección ADMIN.
- [ ] Validaciones de servidor.

Criterio de aceptación:

El dueño puede administrar el menú sin tocar código.

---

## EP-005 — Category Admin CRUD

Ruta:

`/admin/categorias`

- [ ] Listar.
- [ ] Crear.
- [ ] Editar.
- [ ] Archivar.
- [ ] Restaurar.
- [ ] Validar slug.
- [ ] Manejar categorías con productos asociados.
- [ ] Protección ADMIN.

---

# FASE 4 — Cocina

## EP-006 — Cocina

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
