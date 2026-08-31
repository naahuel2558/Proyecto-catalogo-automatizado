# EP-005 — Category Admin CRUD

Fecha de cierre: 31/08/2026  
Estado: completada y validada

## Resultado

Se implementó la administración de categorías en:

- `/admin/categorias`
- `/admin/categorias/nueva`
- `/admin/categorias/[id]`

El panel permite listar, buscar, filtrar, crear, renombrar, archivar y restaurar categorías. Todas las páginas usan la protección server-side compartida y cada Server Action vuelve a obtener la sesión y autoriza al actor antes de validar datos o consultar Prisma.

## Decisiones funcionales

- El único dato editable por el administrador es `name`.
- `slug` se deriva en servidor al crear y renombrar: minúsculas, sin diacríticos, separado por guiones.
- La equivalencia de slug evita duplicados por mayúsculas, espacios, acentos o puntuación y se refuerza con el índice único existente.
- Las categorías nuevas comienzan activas.
- El archivo es exclusivamente lógico mediante `Category.isArchived`; no existe eliminación física desde el panel.
- Archivar una categoría no cambia `Product.categoryId`, `Product.isAvailable`, `Product.isFeatured` ni `Product.isArchived`.
- Un producto activo de una categoría archivada continúa visible y comprable, porque su publicación depende de los estados del producto. La categoría archivada deja de ofrecerse para nuevas asociaciones y permanece en filtros históricos administrativos.
- Renombrar, archivar o restaurar no modifica órdenes ni snapshots de `OrderItem`.

## Compatibilidad y persistencia

- Se reutilizó el modelo `Category` existente.
- No se modificó el schema funcional ni se creó una migración.
- `Product Admin` sigue excluyendo categorías archivadas del selector de asociaciones nuevas y las conserva en filtros históricos.
- El catálogo público y Secure Checkout siguen leyendo productos desde Prisma.
- El seed continúa siendo bootstrap/idempotencia y no participa en runtime.

## Archivos principales

- `src/lib/admin/categories.ts`: validación, autorización y operaciones Prisma.
- `src/app/actions/category-admin.ts`: Server Actions, errores controlados y revalidación.
- `src/app/admin/categorias/page.tsx`: listado y filtros server-side.
- `src/app/admin/categorias/nueva/page.tsx`: alta protegida.
- `src/app/admin/categorias/[id]/page.tsx`: edición y estados.
- `src/components/admin/CategoryForm.tsx`: formulario reutilizable.
- `src/components/admin/CategoryStateActions.tsx`: archivo/restauración con confirmación.
- `src/components/admin/AdminShell.tsx`: acceso a Categorías en la navegación.
- `scripts/test-category-admin.ts`: casos A–L y limpieza en `finally`.
- `scripts/test-admin-routes.ts`: regresión HTTP autenticada y control de roles.
- `package.json`: comando `test:category-admin`.
- `PLAN.md`: EP-005 marcada como completada.

## Errores controlados

- `UNAUTHORIZED`
- `FORBIDDEN`
- `INVALID_INPUT`
- `CATEGORY_NOT_FOUND`
- `CATEGORY_ALREADY_EXISTS`
- `DATABASE_ERROR`

## Revalidación

Cada mutación invalida:

- `/`
- `/admin/categorias` (layout)
- `/admin/productos` (layout)
- `/admin/categorias/[id]` cuando corresponde

## Validación final

| Comando | Resultado |
|---|---|
| `npx prisma format` | OK |
| `npx prisma validate` | OK |
| `npx prisma migrate status` | OK, 3 migraciones aplicadas y schema actualizado |
| `npx tsc --noEmit` | OK |
| `npm run lint` | OK, 0 errores y 28 warnings preexistentes |
| `npm run build` | OK, incluye las 3 rutas de categorías |
| `npm run test:secure-checkout` | OK, casos A–J |
| `npm run test:product-admin` | OK, casos A–K |
| `npm run test:category-admin` | OK, casos A–L |
| `npm run test:admin-routes` | OK, catálogo, auth, perfil, clientes, productos, categorías y cocina |

La prueba de rutas también confirma:

- sin sesión: redirección a `/login`;
- sesión `USER`: redirección a `/`;
- sesión `ADMIN`: acceso HTTP 200 a listado, alta y edición de categorías.

Las fixtures temporales de categorías, productos, órdenes y usuarios se eliminan en bloques `finally`.

## Veredicto

¿La EP-005 quedó realmente finalizada y el sistema sigue sano? **SÍ.**
