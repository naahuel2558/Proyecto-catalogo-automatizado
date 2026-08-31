# IA ENTRE PANES

Sistema integral para la rotisería **Entre Panes**: catálogo web, carrito, cuentas de usuario, historial de compras, panel administrativo, cocina y automatización de WhatsApp.

## Objetivo

Construir una plataforma real de operación diaria para la rotisería, no solamente una página web.

El sistema debe permitir:

- Mostrar el catálogo actualizado.
- Gestionar productos y categorías desde administración.
- Agregar productos al carrito.
- Crear pedidos de forma segura.
- Continuar/confirmar pedidos mediante WhatsApp.
- Registrar clientes.
- Consultar historial de compras.
- Administrar clientes y pedidos.
- Gestionar pedidos desde una vista de cocina.
- Automatizar confirmaciones y notificaciones de WhatsApp.
- Incorporar métricas y automatizaciones futuras.

---

## Stack tecnológico

### Aplicación
- Next.js
- App Router
- Server Components
- Server Actions
- TypeScript

### UI
- Tailwind CSS
- Responsive
- Mobile-first
- Componentes reutilizables

### Base de datos
- SQLite durante desarrollo local.
- PostgreSQL proyectado para producción.

### ORM
- Prisma

### Autenticación
- NextAuth.js v4
- Email + contraseña
- Google OAuth
- JWT / sesiones
- Roles USER y ADMIN

### Seguridad
- bcryptjs
- Validaciones del lado del servidor.
- Rutas protegidas.
- Autorización basada en roles.
- Nunca confiar en precios calculados por el frontend.

---

# Principios arquitectónicos

## 1. La UI no contiene la lógica central

Catálogo, carrito, perfil, administración, cocina y WhatsApp son interfaces distintas sobre el mismo dominio.

La lógica de negocio vive en servidor/servicios.

## 2. El servidor es la fuente de verdad

El frontend puede enviar:

- productId
- quantity

El servidor debe:

1. Consultar producto.
2. Verificar disponibilidad.
3. Obtener precio real.
4. Calcular subtotal.
5. Calcular total.
6. Crear Order.
7. Crear OrderItems.

## 3. Los pedidos históricos no cambian

`OrderItem` debe guardar un snapshot de:

- productName
- unitPrice
- quantity

Aunque el producto cambie de nombre o precio, los pedidos anteriores conservan sus datos históricos.

## 4. No borrar productos usados históricamente

Preferir baja lógica mediante:

`isArchived = true`

---

# Roles

## USER

Puede:

- Registrarse.
- Iniciar sesión.
- Ver catálogo.
- Usar carrito.
- Crear pedido.
- Continuar pedido por WhatsApp.
- Ver perfil.
- Ver historial.

## ADMIN

Puede:

- Entrar al panel administrativo.
- Ver clientes.
- Ver pedidos.
- Crear productos.
- Modificar productos.
- Cambiar precios.
- Cambiar imágenes.
- Cambiar descripciones.
- Cambiar categorías.
- Activar/desactivar productos.
- Destacar productos.
- Archivar/restaurar productos.
- Crear y editar categorías.
- Gestionar estados de pedidos.
- Acceder a métricas futuras.

---

# Modelo de datos

## User

Campos base:

- id
- name
- email
- password
- image
- role
- createdAt
- updatedAt

Roles:

- USER
- ADMIN

## Category

Campos recomendados:

- id
- name
- slug
- description?
- isArchived
- createdAt
- updatedAt

Ejemplos:

- Lomitos
- Hamburguesas
- Pizzas
- Milanesas
- Papas
- Bebidas
- Combos

## Product

Campos recomendados:

- id
- name
- description
- price
- image
- categoryId
- isAvailable
- isFeatured
- isArchived
- createdAt
- updatedAt

## Order

Campos recomendados:

- id
- orderCode
- userId?
- total
- status
- fulfillmentType
- paymentMethod?
- address?
- notes?
- whatsappConfirmedAt?
- createdAt
- updatedAt

## OrderItem

Campos recomendados:

- id
- orderId
- productId?
- productName
- unitPrice
- quantity

---

# Estados del pedido

Estados propuestos:

- DRAFT
- WAITING_WHATSAPP
- CONFIRMED
- PREPARING
- READY
- DELIVERED
- CANCELLED

Flujo principal:

DRAFT  
→ WAITING_WHATSAPP  
→ CONFIRMED  
→ PREPARING  
→ READY  
→ DELIVERED

También puede terminar en:

CANCELLED

---

# Flujo de compra

1. Cliente entra al catálogo.
2. Agrega productos al carrito.
3. Inicia checkout.
4. El servidor consulta productos reales.
5. El servidor recalcula precios.
6. Se crea Order.
7. Se genera un código único.

Ejemplo:

`EP-8F31K2`

8. El pedido queda:

`WAITING_WHATSAPP`

9. La web abre WhatsApp.

Número:

`+54 9 3582 435386`

Mensaje base:

Hola Entre Panes 👋

Quiero confirmar el pedido #EP-8F31K2.

10. El sistema recibe confirmación.
11. Pedido pasa a:

`CONFIRMED`

12. Aparece en cocina.

---

# Carrito

Debe permitir:

- Agregar producto.
- Quitar producto.
- Cambiar cantidad.
- Vaciar carrito.
- Mostrar subtotal.
- Mostrar total.
- Persistencia local opcional.
- Checkout.

El carrito representa intención de compra.

La base de datos representa pedidos.

---

# Perfil de usuario

Ruta:

`/perfil`

Protegida.

Debe mostrar:

- Nombre.
- Email.
- Foto.
- Pedidos.
- Fecha.
- Estado.
- Productos.
- Cantidades.
- Total.

---

# Administración

Estructura proyectada:

```text
/admin
├── dashboard
├── pedidos
├── productos
│   ├── nuevo
│   └── [id]
├── categorias
├── clientes
│   └── [id]
└── configuracion
```

---

# Administración de productos

Ruta:

`/admin/productos`

Debe permitir:

- Listar productos.
- Buscar.
- Filtrar.
- Crear.
- Editar.
- Modificar precio.
- Modificar descripción.
- Modificar imagen.
- Cambiar categoría.
- Marcar disponible/no disponible.
- Destacar.
- Archivar.
- Restaurar.

Rutas:

- `/admin/productos`
- `/admin/productos/nuevo`
- `/admin/productos/[id]`

---

# Administración de categorías

Ruta:

`/admin/categorias`

Debe permitir:

- Crear.
- Editar.
- Listar.
- Archivar.
- Restaurar.
- Evitar eliminaciones inconsistentes cuando haya productos asociados.

---

# CRM de clientes

Ruta:

`/admin/clientes`

Mostrar:

- Nombre.
- Email.
- Cantidad de pedidos.
- Última compra.
- Total comprado en el futuro.

Detalle:

`/admin/clientes/[id]`

Debe mostrar:

- Perfil.
- Pedidos.
- Productos.
- Fechas.
- Totales.
- Estados.

---

# Cocina

Ruta:

`/cocina`

Debe ser simple, rápida y operativa.

Columnas:

## NUEVOS
Pedidos `CONFIRMED`.

## EN PREPARACIÓN
Pedidos `PREPARING`.

## LISTOS
Pedidos `READY`.

Acciones:

- Comenzar preparación.
- Marcar listo.
- Marcar entregado.
- Cancelar cuando corresponda.

---

# WhatsApp

## Primera etapa

La web genera el mensaje y abre WhatsApp.

## Segunda etapa

Implementar webhook oficial.

Endpoint proyectado:

`/api/webhooks/whatsapp`

## OrderAgent

Primera versión determinista.

Debe:

- Detectar código de pedido.
- Buscar Order.
- Confirmar pedido.
- Informar estado.
- Enviar avisos.

Luego podrá incorporar IA para lenguaje natural.

Ejemplos futuros:

- "Quiero dos lomitos sin tomate."
- "¿Tienen milanesas?"
- "¿Cuánto tarda?"
- "Quiero pedir lo mismo de la otra vez."

---

# Dashboard futuro

Ruta:

`/admin/dashboard`

Métricas:

- Ventas del día.
- Pedidos del día.
- Ticket promedio.
- Productos más vendidos.
- Clientes frecuentes.
- Ventas semanales.
- Ventas mensuales.
- Pedidos cancelados.
- Horarios de mayor demanda.

---

# Arquitectura conceptual

```text
                        ENTRE PANES
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
          ▼                 ▼                 ▼
      CATÁLOGO           CLIENTES           ADMIN
          │                 │                 │
       CARRITO            PERFIL          PRODUCTOS
          │              HISTORIAL        CLIENTES
          │                 │             PEDIDOS
          └──────────┐      │                 │
                     ▼      │                 │
                   ORDER ◄──┴─────────────────┘
                     │
               PRISMA / DATABASE
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
       COCINA             WHATSAPP AGENT
          │                     │
     CONFIRMED             WEBHOOK
          │                     │
     PREPARING                  │
          │                     │
        READY ◄─────────────────┘
          │
      DELIVERED
```

---

# Reglas para agentes de IA

Antes de modificar código:

1. Leer `README.md`.
2. Leer `PLAN.md`.
3. Revisar estructura actual.
4. No reemplazar arquitectura existente sin justificación.
5. No modificar archivos fuera del alcance de la tarea.
6. No duplicar lógica.
7. Mantener TypeScript estricto.
8. Mantener lógica de negocio del lado del servidor.
9. No confiar en datos sensibles provenientes del cliente.
10. Ejecutar validaciones/build después de cambios relevantes.
11. Explicar qué se modificó.
12. Actualizar `PLAN.md` cuando una tarea cambie de estado.
13. No implementar tareas futuras de forma anticipada.
14. Mantener compatibilidad con el sistema actual de autenticación salvo tarea explícita.
15. Priorizar soluciones mantenibles sobre parches rápidos.
