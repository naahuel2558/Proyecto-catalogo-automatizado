# PROMPTS — IA ENTRE PANES

Repositorio de prompts utilizados con Antigravity.

---

# PROMPT 001 — Inicialización documental y auditoría

## Objetivo

Hacer que Antigravity adopte `README.md` y `PLAN.md` como fuente de contexto y ejecute `EP-000` sin modificar todavía la arquitectura.

## Prompt

Actúa como un Ingeniero de Software Senior y Software Architect con más de 15 años de experiencia en aplicaciones fullstack, Next.js, TypeScript, Prisma, autenticación, bases de datos y sistemas de pedidos.

Estás trabajando sobre el proyecto real **IA ENTRE PANES**, una plataforma para una rotisería.

REGLA PRINCIPAL:

Antes de realizar cualquier modificación debes leer completamente:

1. `README.md`
2. `PLAN.md`

Estos documentos constituyen la fuente de verdad funcional y arquitectónica del proyecto.

Tu tarea actual es exclusivamente:

`EP-000 — Auditoría técnica`

NO implementes todavía EP-001 ni ninguna tarea posterior.

Objetivos de la auditoría:

1. Inspeccionar la estructura completa del repositorio.
2. Revisar `package.json` y dependencias.
3. Revisar el `schema.prisma`.
4. Revisar migraciones existentes.
5. Revisar configuración de NextAuth.
6. Revisar roles y protección de rutas.
7. Encontrar dónde vive actualmente el catálogo.
8. Revisar cómo funciona el carrito.
9. Revisar cómo funciona el checkout.
10. Revisar cómo se crean actualmente las órdenes.
11. Revisar `/perfil`.
12. Revisar `/admin/clientes`.
13. Revisar cualquier ruta administrativa existente.
14. Identificar duplicación de lógica.
15. Identificar riesgos de seguridad.
16. Detectar código hardcodeado que debería provenir de base de datos.
17. Ejecutar las validaciones disponibles, incluyendo build/typecheck/lint si existen.

IMPORTANTE:

- No cambies arquitectura.
- No crees nuevas features.
- No hagas refactors grandes.
- No borres código.
- No actualices dependencias.
- No cambies Prisma Schema todavía.
- No cambies NextAuth todavía.
- No implementes cocina.
- No implementes WhatsApp webhook.
- No implementes OrderAgent.

Si detectas problemas, documéntalos.

Al finalizar debes producir un informe con:

### 1. Estado actual
Qué ya existe y funciona.

### 2. Arquitectura encontrada
Estructura real del proyecto.

### 3. Modelo de datos actual
Modelos Prisma existentes y relaciones.

### 4. Flujo actual del pedido
Desde catálogo hasta WhatsApp/DB.

### 5. Problemas encontrados
Separados por:
- críticos
- importantes
- menores

### 6. Riesgos de seguridad

### 7. Deuda técnica

### 8. Diferencias entre implementación actual y README.md

### 9. Archivos que deberían modificarse en EP-001

### 10. Recomendación
Explica cuál debería ser el siguiente paso exacto.

Después de completar la auditoría:

- Actualiza `PLAN.md`.
- Marca EP-000 como completada solamente si la auditoría realmente terminó.
- No marques otras tareas.
- No empieces EP-001.
