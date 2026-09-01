# INFRA-001 — PostgreSQL Production Foundation

Fecha: 31/08/2026 — actualizado tras una segunda ejecución.
Estado: **`[~]` En progreso — bloqueada por aprovisionamiento externo**

> INFRA-001 **no se marca completa**. La preparación de plataforma está terminada,
> pero no existe ninguna instancia PostgreSQL aprovisionada, por lo que la primera
> pregunta de la sección 15 se responde `NO`. El detalle está en §3 y §14.
>
> **Segunda ejecución:** partió del supuesto de que PostgreSQL ya había sido
> aprovisionado vía Neon/Vercel. Ese supuesto **no se verificó**: no existe proyecto
> de Vercel para esta aplicación ni integración Neon, y el responsable confirmó que
> la base todavía no fue creada. Ver **§18 — Finalización PostgreSQL**, que registra
> lo comprobado, la re-verificación del guard, la causa raíz del EPERM y los pasos
> exactos que faltan.

---

## 1. Estado anterior

`prisma/schema.prisma` declaraba la conexión de forma literal:

```prisma
datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}
```

Consecuencias:

- La URL no era configurable por entorno: todos los entornos apuntaban al mismo archivo relativo.
- El despliegue corre sobre un filesystem efímero, por lo que cualquier escritura de producción no persiste de forma durable.
- No existía `.env.example`; las variables requeridas no estaban documentadas.
- Las seis suites de test importan `prisma` desde `src/lib/db` y **crean y eliminan** usuarios, órdenes, productos y categorías. Mientras la URL era un literal SQLite eso era inofensivo; en cuanto la variable pudiera apuntar a PostgreSQL de producción, ejecutar `npm run test:kitchen` con el entorno equivocado destruiría datos reales.
- `prisma/seed.ts` no tenía ninguna protección de entorno.

---

## 2. Checkpoint Git (Fase A)

Estado inicial inspeccionado sin `git add -A`: 8 archivos modificados, 2 eliminaciones ya *staged* (`git rm --cached` previo) y 4 archivos sin trackear.

Cada cambio fue clasificado por origen antes de commitear. `PLAN.md` y `package.json` contenían cambios de **ambas** tareas, por lo que se construyeron versiones intermedias para que cada commit quedara coherente y compilable por separado.

### Commits creados

| Commit | Tipo | Contenido |
|---|---|---|
| `8a25205` | `feat(kitchen)` | EP-006: Cocina sobre Prisma, `scripts/test-kitchen.ts`, regresión HTTP, informe EP-006 |
| `05a37d9` | `fix(security)` | P0-001: contención de `/api/send-receipt`, bot atado a loopback, `.gitignore`, destracking de `prisma/dev.db` y `tsconfig.tsbuildinfo`, tests A–D, informe P0-001 |

Working tree tras el checkpoint: **limpio**. No se ejecutó `push`.

Ningún cambio quedó sin clasificar: no hubo modificaciones de origen desconocido, por lo que no fue necesario dejar nada fuera de los commits.

### Historial y publicación

| Pregunta | Resultado |
|---|---|
| ¿`prisma/dev.db` aparece en commits históricos? | Sí, en **1** commit: `15c400d` |
| ¿Ese commit existe en el remoto? | **Sí** — `git branch -r --contains 15c400d` devuelve `origin/main` |
| ¿HEAD local coincidía con la rama remota? | Sí, `0` adelante / `0` detrás al inicio |
| ¿El commit problemático ya fue publicado? | **Sí** |
| Remote | `github.com/naahuel2558/Proyecto-catalogo-automatizado.git` |
| Visibilidad del repositorio | **UNKNOWN** — no determinable con Git local |

**El historial no fue reescrito.** No se ejecutó `filter-branch`, `filter-repo`, BFG ni `push --force`.

### Credenciales históricas

El blob de `15c400d` contiene, en cantidades: **2 registros de `User`**, los dos con email y con hash de contraseña, **1 con rol `ADMIN`**; `Order` y `OrderItem` en **0**. No se muestran emails, nombres, hashes ni ningún dato personal.

Al estar el commit publicado y la visibilidad del repositorio en `UNKNOWN`, **se recomienda rotar la contraseña de ambas cuentas**, en particular la administrativa, y hacerlo con independencia de que se limpie o no el historial. Si esas contraseñas se reutilizan en otros servicios, rotarlas allí también. No se intentó ni se intentará recuperar contraseñas desde los hashes.

---

## 3. Proveedor PostgreSQL

**No hay ninguno disponible.** Verificado, no asumido:

| Comprobación | Resultado |
|---|---|
| `DATABASE_URL` / `POSTGRES_*` en el entorno | Ninguna definida |
| `.env` | Sólo contenía `NEXTAUTH_SECRET` y `NEXTAUTH_URL` |
| `psql` en la máquina | No disponible |
| `docker` en la máquina | No disponible |
| CLI de Vercel | Disponible, sesión activa |
| `vercel env ls` | **Falla**: el proyecto fue borrado, transferido, o la sesión ya no tiene acceso |

`.vercel/project.json` referencia el proyecto `ia-entre-panes`, que **ya no es alcanzable** con la sesión actual.

Conforme a la instrucción de la tarea: **no se inventaron credenciales, no se hardcodearon secretos y no se crearon recursos externos.** Aprovisionar una base de datos es una acción con costo y efectos fuera del repositorio; corresponde al responsable del proyecto.

### Información externa que falta

1. Una instancia PostgreSQL para **Production** (Neon, Supabase, Vercel Postgres o equivalente).
2. Una instancia o rama separada para **Preview**.
3. Los valores de `DATABASE_URL` y `DIRECT_DATABASE_URL` cargados en Vercel por entorno.
4. Restablecer el vínculo del proyecto en Vercel.

---

## 4. Variables de entorno

Documentadas en `.env.example`, **versionado y sin un solo valor**. `.gitignore` recibió la excepción `!.env.example`; `.env`, `.env.local` y `.env.production` siguen ignorados (verificado con `git check-ignore`).

| Variable | Función | Requerida |
|---|---|---|
| `DATABASE_URL` | Conexión de runtime. En serverless, la URL **pooled** | Sí |
| `DIRECT_DATABASE_URL` | Conexión directa sin pooler, sólo para `prisma migrate` | Sólo si el proveedor distingue pooled/direct |
| `TEST_DATABASE_URL` | Base contra la que corren las suites | No (por defecto SQLite local) |
| `NEXTAUTH_SECRET` | Firma de los JWT | Sí |
| `NEXTAUTH_URL` | URL pública del despliegue | Sí |
| `GOOGLE_CLIENT_ID` | OAuth de Google | No |
| `GOOGLE_CLIENT_SECRET` | OAuth de Google | No |

---

## 5. Local / Preview / Production

| Entorno | Base | `DATABASE_URL` | Migraciones | Estado |
|---|---|---|---|---|
| **Local** | SQLite `file:./dev.db` | En `.env`, nunca versionado | `migrate dev` | ✅ Operativo |
| **Preview** | PostgreSQL separada de Production | Variable de entorno Preview en Vercel | `migrate deploy` contra la base de Preview | ⚠️ Sin aprovisionar |
| **Production** | PostgreSQL persistente | Variable de entorno Production en Vercel | `migrate deploy` únicamente | ⚠️ Sin aprovisionar |

Separación garantizada por construcción: no hay ninguna URL en el código. Cada entorno resuelve su conexión desde su propia variable, y Vercel las mantiene aisladas por *environment*.

Preview **no debe** compartir base con Production: ejecuta migraciones de ramas todavía no fusionadas. La estrategia recomendada es una rama de base de datos por Preview (Neon y Supabase lo ofrecen de forma nativa) o, como mínimo, una instancia de staging separada.

SQLite puede seguir usándose en local y para tests aislados. Lo que deja de ser aceptable es que el despliegue dependa de `file:./dev.db`.

---

## 6. Connection pooling

La aplicación corre en un runtime serverless: cada invocación puede abrir su propia conexión, y una instancia PostgreSQL agota su límite de conexiones con rapidez. `src/lib/db.ts` ya reutiliza el cliente vía `globalThis` fuera de producción, lo que ayuda en desarrollo pero no sustituye a un pooler.

| URL | Uso | Por qué |
|---|---|---|
| **Pooled** → `DATABASE_URL` | Tráfico normal de la aplicación | Multiplexa conexiones; es lo único que tolera el runtime serverless |
| **Direct** → `DIRECT_DATABASE_URL` | `prisma migrate`, introspección | Un pooler en modo *transaction* no soporta los statements que emite Prisma Migrate |

Cuando exista proveedor, `schema.prisma` debe declarar:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_DATABASE_URL")
}
```

`directUrl` es compatible con Prisma 5.22. Los nombres definitivos deben adaptarse a lo que exponga el proveedor elegido: si no distingue pooled y direct, `directUrl` se omite.

---

## 7. Prisma

**Versión sin cambios: 5.22.** No se actualizó el ORM. Migración de infraestructura y upgrade de ORM se mantienen como tareas separadas; PostgreSQL funciona con esta versión y no hubo ningún bloqueo técnico que obligara a subirla.

Configuración actual:

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

La URL hardcodeada quedó eliminada. El `provider` permanece en `sqlite` porque **cambiarlo sin una instancia PostgreSQL detrás rompería el desarrollo local y las seis suites**, y la tarea indica no avanzar si la migración rompe el dominio actual. El cambio pendiente es de dos líneas y está documentado en §6.

`Order.status` y `User.role` siguen siendo `String`. **No se convirtieron a enums**: es una decisión de dominio registrada como `DOMAIN-001`.

---

## 8. Migraciones — estrategia de baseline

Las tres migraciones existentes contienen SQL **específico de SQLite** y no pueden aplicarse contra PostgreSQL:

| Migración | Rasgos incompatibles |
|---|---|
| `0_init` | `TEXT NOT NULL PRIMARY KEY`, `REAL`, `DATETIME` |
| `20260831112700_order_domain` | `PRAGMA foreign_keys`, reconstrucción de tabla al estilo SQLite |
| `20260831131700_init_product_catalog` | `TEXT`, `DATETIME` |

`DATETIME` no existe en PostgreSQL (`TIMESTAMP(3)`), `PRAGMA` no existe, y el patrón de *table rebuild* de SQLite no aplica.

**No se reescribieron las migraciones históricas.** Reescribir SQL ya aplicado a ciegas invalidaría los checksums de `_prisma_migrations` y rompería el entorno local.

### Estrategia elegida: baseline limpio

1. Archivar `prisma/migrations/` bajo `prisma/migrations-sqlite-legacy/`, como registro histórico. No se borra.
2. Cambiar el `provider` a `postgresql` y añadir `directUrl`.
3. Generar una migración inicial nueva desde el schema, sin aplicarla:
   `npx prisma migrate dev --name init_postgres --create-only`
4. Revisar el SQL generado antes de aplicarlo.
5. Aplicar a la base de Production vacía con `npx prisma migrate deploy`.
6. Verificar con `npx prisma migrate status`.

A partir de ese punto, el historial de migraciones es nativo de PostgreSQL y `migrate deploy` es el único mecanismo de despliegue.

Esta estrategia es segura precisamente porque **no hay órdenes que preservar** (§9). Si existieran datos transaccionales, correspondería una migración de datos explícita en lugar de un baseline.

---

## 9. Datos

Auditoría de cantidades. **No se leyó ni se imprimió ningún dato personal.**

| Tabla | Antes | Después | Debe preservarse |
|---|---|---|---|
| `User` | 2 | 2 | Sí — incluye 1 `ADMIN`; los hashes se migran tal cual, nunca se imprimen ni se vuelcan a archivos |
| `Category` | 3 | 3 | Sí |
| `Product` | 5 | 5 | Sí — conservar los `id`, referenciados por `OrderItem` |
| `Order` | 0 | 0 | **No hay órdenes reales que migrar** |
| `OrderItem` | 0 | 0 | Ídem |

Conteos idénticos antes y después de toda la batería de tests: ninguna suite dejó fixtures residuales.

Al no existir órdenes, **no hay `orderCode` ni snapshots históricos en riesgo**. Es el momento de menor costo posible para migrar de motor. El volumen a preservar son 2 usuarios, 3 categorías y 5 productos.

Cuando exista destino, la migración de datos se reduce a reinsertar esas 10 filas conservando `id` y relaciones. No se ejecutó: no hay base a la que escribir.

---

## 10. Aislamiento de los tests respecto de Production

El riesgo más concreto detectado en INFRA-001. Las seis suites importan `prisma` desde `src/lib/db`, que resuelve la conexión desde `DATABASE_URL`, y **crean y eliminan** registros.

Mitigación: `scripts/_guard-test-db.ts`, importado como **primer import** de las seis suites. Los imports ESM se evalúan en orden de declaración, por lo que el guard corre antes de que se instancie el `PrismaClient`.

Contrato:

| Situación | Comportamiento |
|---|---|
| `TEST_DATABASE_URL` definida | Se usa esa, y se sobrescribe `DATABASE_URL` |
| `DATABASE_URL` empieza con `file:` | SQLite local, permitido |
| Cualquier otro caso | **Aborta con exit 1** |
| La cadena contiene `prod`/`production`/`live` | **Aborta**, incluso vía `TEST_DATABASE_URL` |

No existe variable de "forzado": el único camino a una base remota es nombrarla explícitamente en `TEST_DATABASE_URL`. Las credenciales se **redactan** en todo mensaje de error.

El guard también carga `.env` con `process.loadEnvFile()` cuando el entorno no trae la variable, porque `tsx` —a diferencia del CLI de Prisma— no lo hace por sí mismo. Sin eso, mover la conexión a `env("DATABASE_URL")` habría dejado las seis suites sin base.

### Verificación

| Caso | Resultado |
|---|---|
| `DATABASE_URL` = Postgres de producción | ABORTA — *no apunta a una base SQLite local* |
| `TEST_DATABASE_URL` con `prod` en la cadena | ABORTA — *contiene un indicio de produccion* |
| Sin `DATABASE_URL` | ABORTA — *no esta definida* |
| SQLite local | Las 6 suites corren y pasan |

### Seed

`prisma/seed.ts` no borra filas, pero su `update` reescribe `name`, `description`, `price`, `image`, `categoryId` e `isAvailable` con los valores hardcodeados de `src/lib/data/menu.ts`. **Ejecutarlo contra producción revertiría cualquier precio o disponibilidad cambiado desde `/admin/productos`** — destructivo en el sentido que le importa al negocio.

Ahora aborta si `DATABASE_URL` no es local, salvo `SEED_ALLOW_NON_LOCAL=1` explícito. Verificado. Queda así distinguido el bootstrap de desarrollo de una migración de datos productivos.

Una infraestructura completa con runner y base efímera por corrida sigue siendo `TEST-001`.

---

## 11. Vercel

Configuración necesaria (a cargar por el responsable, **nunca en Git**):

| Variable | Environment |
|---|---|
| `DATABASE_URL` (pooled) | Production |
| `DIRECT_DATABASE_URL` | Production |
| `DATABASE_URL` (pooled, base de Preview) | Preview |
| `DIRECT_DATABASE_URL` (base de Preview) | Preview |
| `NEXTAUTH_SECRET` | Production + Preview |
| `NEXTAUTH_URL` | Production + Preview |

- **Generate**: `package.json` → `"build": "prisma generate && next build"`. Solución mínima, un solo lugar, sin scripts redundantes. Cubre el caso en que Vercel reutiliza `node_modules` cacheados y el cliente quedaría desactualizado respecto del schema.
- **Migraciones**: `prisma migrate deploy`, ejecutado de forma deliberada contra el entorno correspondiente. **No** se encadenó al build: acoplar migraciones al build hace que cualquier redeploy —incluido un rollback— intente migrar Production.
- **Prohibido en Production**: `migrate dev`, `db push`, `migrate reset`, seeds destructivos.
- Restablecer el vínculo del proyecto (`vercel link`) antes de cargar variables.

---

## 12. README

Reescrito. Antes describía una arquitectura que ya no existe: catálogo hardcodeado, `/cocina` como vista pública de recibos y envío automático de recibos por WhatsApp como funcionalidad vigente.

Ahora refleja el estado real: catálogo desde Prisma, Secure Checkout con recálculo server-side y snapshots inmutables, Product y Category Admin, Cocina sobre base de datos con su máquina de estados, envío automático **deshabilitado** por P0-001, PostgreSQL como destino de producción con SQLite acotado a desarrollo local y tests, y una tabla de deuda técnica conocida. Lo pendiente está marcado como pendiente.

---

## 13. Validaciones

| Comando | Resultado |
|---|---|
| `npx prisma validate` | **PASS** |
| `npx prisma migrate status` | **PASS** — 3 migraciones, base sincronizada |
| `npx tsc --noEmit` | **PASS** — 0 errores |
| `npm run lint` | **PASS** — 0 errores, 28 warnings (baseline preexistente, 0 nuevos) |
| `npx next build` | **PASS** — 16 rutas compiladas |
| `npm run build` | **BLOQUEADO localmente** — ver nota |
| `npm run test:secure-checkout` | **PASS** — A–J |
| `npm run test:product-admin` | **PASS** — A–K |
| `npm run test:category-admin` | **PASS** — A–L |
| `npm run test:kitchen` | **PASS** — A–P |
| `npm run test:receipt-security` | **PASS** — A–D |
| `npm run test:admin-routes` | **PASS** |

### Nota sobre `npm run build`

`prisma generate` falla en esta máquina con `EPERM: operation not permitted, rename` sobre `node_modules/.prisma/client/query_engine-windows.dll.node`.

Diagnóstico: un proceso Node residente mantiene abierto el motor de consultas y Windows impide reemplazar el archivo. Se comprobó que:

- el cliente Prisma existente está generado y es válido (19 MB);
- el cambio de schema fue únicamente la URL del datasource, que **no altera el cliente generado**;
- `npx next build` compila las 16 rutas sin errores;
- las seis suites, que ejercitan el cliente contra la base, pasan.

**No es un defecto del código y no aplica en Vercel**, cuyos runners son Linux y parten de un `node_modules` limpio. Remedio local: cerrar los procesos Node residentes y repetir. No se terminaron procesos del usuario sin autorización.

### Regresión funcional

Catálogo, login, registro, perfil, Secure Checkout, Product Admin, Category Admin, Cocina y CRM siguen operativos: verificado por las suites A–P y por la regresión HTTP autenticada por rol.

---

## 14. Riesgos restantes

| Riesgo | Estado |
|---|---|
| **Sin PostgreSQL aprovisionado** | Bloqueante. La persistencia durable de producción sigue sin existir |
| **Historial Git** | El blob de `prisma/dev.db` sigue en `15c400d`, **ya publicado en `origin/main`**. Limpiarlo exige reescritura más `push --force` coordinado con todos los clones. Fuera del alcance de esta tarea |
| **Rotación de credenciales** | Recomendada para las 2 cuentas del blob, en particular la `ADMIN`, dado que el commit está publicado y la visibilidad del repositorio es `UNKNOWN` |
| **Vínculo de Vercel roto** | `.vercel/project.json` apunta a un proyecto inaccesible |
| **Guest identity** (`EP-002.1`) | `Order` no persiste `customerName`/`customerPhone`. Cocina no puede contactar al cliente en un pedido invitado, y es el prerrequisito para reactivar cualquier envío de WhatsApp |
| **Middleware / guards** (`SEC-002`) | Conviven cuatro patrones de autorización y no existe `middleware.ts` |
| **Test infrastructure** (`TEST-001`) | El guard impide tocar Production, pero las suites siguen sin runner, sin CI y compartiendo `dev.db` con el desarrollo |
| **Enums** (`DOMAIN-001`) | `Order.status` y `User.role` siguen siendo `String`; la base acepta cualquier valor |
| **WhatsApp Cloud API** (`EP-007`) | Baileys no es infraestructura de producción. El envío automático sigue deshabilitado |

---

## 15. Estado final

> **¿La aplicación desplegada puede persistir datos de forma durable en PostgreSQL sin depender de SQLite local?**
>
> **NO.**

La plataforma quedó preparada —sin URLs hardcodeadas, variables documentadas, estrategia de baseline definida, pooling especificado— pero **no existe ninguna instancia PostgreSQL aprovisionada**. Sin destino real, la persistencia durable no está garantizada. Requiere una acción externa del responsable (§3).

> **¿Preview y tests están impedidos de modificar accidentalmente la DB de Production?**
>
> **Tests: SÍ**, verificado con tres casos de abuso que abortan con exit 1, más la protección del seed.
> **Preview: la estrategia está definida** (base separada por entorno) pero **no aplicada**, porque no hay ninguna base que separar.

Conforme al criterio de la tarea, al ser la primera respuesta `NO`, **INFRA-001 no se marca completa**. Queda en `[~] En progreso`, bloqueada por aprovisionamiento externo, con todo el trabajo que no dependía de un proveedor terminado y verificado.

---

## 16. Archivos modificados

- `prisma/schema.prisma` — URL hardcodeada eliminada; conexión por `env("DATABASE_URL")`.
- `prisma/seed.ts` — guard frente a bases no locales.
- `scripts/_guard-test-db.ts` — **nuevo**; aislamiento de la base de tests.
- `scripts/test-secure-checkout.ts`, `test-product-admin.ts`, `test-category-admin.ts`, `test-kitchen.ts`, `test-receipt-security.ts`, `test-admin-routes.ts` — guard como primer import.
- `.env.example` — **nuevo**; variables documentadas, sin valores.
- `.gitignore` — excepción `!.env.example`.
- `package.json` — `build: prisma generate && next build`.
- `README.md` — reescrito con la arquitectura real.
- `PLAN.md` — INFRA-001 en progreso; alta de `DOMAIN-001`, `EP-002.1`, `SEC-002`, `TEST-001`.
- `auditorias/INFRA-001-postgresql-foundation-report.md` — **nuevo**.

`.env` recibió `DATABASE_URL="file:./dev.db"` para desarrollo local. No se versiona.

---

## 17. Siguiente paso

Desbloquear INFRA-001 requiere aprovisionar PostgreSQL y cargar las variables en Vercel. Una vez cerrada, el orden recomendado es `EP-002.1` → `SEC-002` → `TEST-001` → `EP-007`.

**Ninguna de ellas fue iniciada.**

---

## 18. Finalización PostgreSQL

> Sección añadida en la segunda ejecución de INFRA-001, cuyo encargo partía de que
> PostgreSQL ya había sido aprovisionado mediante la integración Neon/Vercel.
> **Esa premisa no se verificó.** Se detalla abajo lo comprobado y lo que sigue faltando.

### 18.1 Proveedor

**AUSENTE.** Confirmado por inspección y por el responsable del proyecto.

| Comprobación | Resultado |
|---|---|
| Vínculo del proyecto local con Vercel | **ROTO** — `.vercel/project.json` referencia `ia-entre-panes`, que no existe |
| Sesión del CLI de Vercel | Activa |
| Teams accesibles | 1 |
| Proyectos accesibles | 10 |
| ¿Existe un proyecto de IA ENTRE PANES? | **No** |
| Integración Neon detectada | **Ninguna** |

Ningún proyecto corresponde a esta aplicación. Dos tenían actividad reciente y
nombres cercanos —uno coincidente con el repositorio de GitHub, otro con la URL
citada en el README histórico—, por lo que **no se relinkeó por deducción**:
vincular el proyecto equivocado habría expuesto la configuración de otra
aplicación y arriesgado apuntar la base incorrecta. Se consultó al responsable,
que confirmó: **la base Neon todavía no fue creada.**

En consecuencia **no se ejecutó** ninguna de las acciones que dependen del
proveedor: detección de variables reales, cambio de `provider`, baseline,
migración de datos, smoke test ni verificación funcional del aislamiento de
Preview. No se inventaron nombres de variables ni credenciales.

### 18.2 Environments

| Environment | Base efectiva | Estado |
|---|---|---|
| Development / Local | SQLite `file:./dev.db` vía `DATABASE_URL` | ✅ Operativo |
| Preview | — | **Sin aprovisionar** |
| Production | — | **Sin aprovisionar** |

No es posible afirmar que Preview y Production usan bases distintas: **no existe
ninguna de las dos**. El aislamiento de Preview queda sin verificar, y conforme al
punto 12 del encargo, eso por sí solo mantiene INFRA-001 en `[~]`.

### 18.3 Variables presentes

Sólo nombres. Ningún valor fue leído, impreso ni almacenado.

| Variable | Local | Preview | Production |
|---|---|---|---|
| `DATABASE_URL` | **PRESENTE** (SQLite) | AUSENTE | AUSENTE |
| `NEXTAUTH_SECRET` | **PRESENTE** | AUSENTE | AUSENTE |
| `NEXTAUTH_URL` | **PRESENTE** | AUSENTE | AUSENTE |
| `DIRECT_DATABASE_URL` | AUSENTE | AUSENTE | AUSENTE |
| `TEST_DATABASE_URL` | AUSENTE (opcional) | — | — |
| Variables de Neon | AUSENTES | AUSENTES | AUSENTES |

Las columnas Preview y Production figuran como AUSENTE porque **no hay proyecto
remoto vinculado del cual leerlas**, no porque se haya comprobado que están vacías.

### 18.4 Estrategia pooled / direct

Sin proveedor, los nombres definitivos **no pueden confirmarse**. La integración
Neon/Vercel inyecta su propio juego de variables, y adoptar nombres de
documentación sin verificarlos contra la integración real sería exactamente el
error que el encargo pide evitar.

Lo que sí está establecido, y es independiente del proveedor:

- La conexión de **runtime** debe ser la variante **pooled**. El runtime serverless abre conexiones por invocación y agota el límite de una conexión directa.
- `prisma migrate` requiere una conexión **directa**: un pooler en modo *transaction* no soporta los statements que emite.
- Si —y sólo si— la integración expone ambas, `schema.prisma` declara `directUrl` apuntando a la directa. Si expone una sola conexión ya apta, `directUrl` **se omite**.

`.env.example` documenta `DIRECT_DATABASE_URL` como *"requerida únicamente cuando
el proveedor distingue pooled/direct"*. Al cablear Neon, ese nombre debe
reemplazarse por el que la integración provea realmente.

### 18.5 Baseline

**No ejecutado.** No hay base destino. La estrategia definida en §8 sigue vigente
y sin cambios: archivar las migraciones SQLite como legado, generar una migración
inicial nueva desde el schema con `--create-only`, revisar el SQL y aplicarla con
`migrate deploy` a una base vacía.

No se ejecutó `prisma migrate deploy` contra PostgreSQL, conforme al punto 6 del
encargo. Las migraciones SQLite históricas **no fueron reescritas ni borradas**.

### 18.6 Conteos

Reconfirmados, no asumidos. Sin datos personales.

| Tabla | Antes | Después | Comentario |
|---|---|---|---|
| `User` | 2 | 2 | 1 con rol `ADMIN` |
| `Category` | 3 | 3 | |
| `Product` | 5 | 5 | |
| `Order` | 0 | 0 | Sin órdenes reales |
| `OrderItem` | 0 | 0 | |

Sin migración de datos: sin destino, no hubo "después" distinto del "antes". El
volumen a preservar sigue siendo de 10 filas, y al no haber órdenes **no hay
`orderCode` ni snapshots históricos en riesgo**. Sigue siendo el momento de menor
costo posible para cambiar de motor.

### 18.7 Pruebas — test guard

Re-verificado con los cuatro escenarios exactos del encargo. **La protección no
fue eliminada ni debilitada.**

| Escenario | Resultado esperado | Obtenido |
|---|---|---|
| Production PostgreSQL | ABORTA | ✅ ABORTA |
| `TEST_DATABASE_URL` sospechosa | ABORTA | ✅ ABORTA |
| Sin configuración segura | ABORTA | ✅ ABORTA |
| DB explícitamente de test | PERMITIDA | ✅ PERMITIDA |

El tercer escenario se ejecutó retirando temporalmente `.env` para simular un
entorno sin configuración; el archivo fue restaurado y verificado intacto.

El guard también resuelve la trampa de que `tsx` no carga `.env` por sí mismo,
cosa que el CLI de Prisma sí hace. Sin eso, mover la conexión a
`env("DATABASE_URL")` habría dejado las seis suites sin base.

### 18.8 Preview isolation

**NO VERIFICABLE.** No existe integración Neon ni proyecto Vercel vinculado cuya
configuración inspeccionar. El encargo es explícito: *"No alcanza con
documentarlo"*. Al no poder comprobarse, INFRA-001 permanece en `[~]`.

### 18.9 Production

**NO OPERATIVA sobre PostgreSQL.** El datasource sigue en:

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

La URL hardcodeada está eliminada —la conexión se resuelve por entorno— pero el
`provider` continúa en `sqlite`. Cambiarlo sin una instancia detrás rompería el
desarrollo local y las seis suites, y el encargo prohíbe avanzar si la migración
rompe el dominio actual.

### 18.10 Validaciones

| Comando | Resultado |
|---|---|
| `npx prisma validate` | **PASS** |
| `npx prisma migrate status` | **PASS** — 3 migraciones, base sincronizada |
| `npx tsc --noEmit` | **PASS** — 0 errores |
| `npm run lint` | **PASS** — 0 errores, 28 warnings (baseline, 0 nuevos) |
| `npx next build` | **PASS** — compilado en 2.2 s, 12 páginas estáticas, 16 rutas |
| `npm run build` | **BLOQUEADO localmente** — ver 18.11 |
| `npm run test:secure-checkout` | **PASS** — A–J |
| `npm run test:product-admin` | **PASS** — A–K |
| `npm run test:category-admin` | **PASS** — A–L |
| `npm run test:kitchen` | **PASS** — A–P |
| `npm run test:receipt-security` | **PASS** — A–D |
| `npm run test:admin-routes` | **PASS** |

Regresión funcional cubierta por las suites: catálogo, login, registro, perfil,
Secure Checkout, Product Admin, Category Admin, Cocina y CRM siguen operativos.

### 18.11 EPERM — causa raíz identificada

El fallo de `prisma generate` quedó diagnosticado con precisión, sin modificar la
arquitectura para ocultarlo:

| Dato | Valor |
|---|---|
| Proceso que retiene el motor | PID **17204** |
| Comando | `node .../next/dist/server/lib/start-server.js` |
| Iniciado | 31/08/2026 13:18:28 |

Es un servidor `next dev` en ejecución con el query engine de Prisma cargado en
memoria. Windows impide reemplazar un archivo mapeado por un proceso vivo, de ahí
el `EPERM` al renombrar `query_engine-windows.dll.node`.

**No es un defecto del código ni de la configuración de build**, y no puede
ocurrir en Vercel, cuyos runners son Linux y parten de un `node_modules` limpio.
Remedio: detener ese servidor y repetir. **No se terminó el proceso**: pertenece
al usuario y podría estar en uso.

`"build": "prisma generate && next build"` se mantiene sin cambios. Degradarlo
para evitar un bloqueo de archivo local habría sido esconder el síntoma.

### 18.12 Commit creado

Asunto: `chore(infra): preparar la fundacion PostgreSQL y aislar la base de tests`

Contenido: datasource por variable de entorno, guard de aislamiento de tests,
protección del seed, `.env.example`, `prisma generate` en el build, README y
PLAN actualizados, y este informe. 15 archivos: 12 modificados y 3 nuevos.

(El hash no se transcribe aquí porque este mismo archivo forma parte del commit;
se obtiene con `git log --oneline -1`.)

Verificado antes de commitear con `git status --short`, `git diff` y
`git diff --cached`, sin `git add -A` a ciegas. No se detectaron cambios
concurrentes de otro agente. **No se ejecutó `push`.**

### 18.13 Qué falta para cerrar INFRA-001

Acciones externas, en orden:

1. **Crear la base en Neon**, desde el marketplace de Vercel o desde `neon.tech`. Habilitar *database branching* para Preview.
2. **Crear o identificar el proyecto de Vercel** de esta aplicación y conectarlo al repositorio `Proyecto-catalogo-automatizado`.
3. **Vincular el repositorio local**: `vercel link`. Esto reescribe `.vercel/project.json`, hoy apuntando a un proyecto inexistente.
4. **Conectar la integración Neon al proyecto**, que inyecta sus variables por environment.
5. **Verificar los nombres reales** de las variables inyectadas: `vercel env ls`. No asumirlos.

Con eso disponible, el trabajo restante dentro del repositorio es acotado:
ajustar el `datasource` a `postgresql` con los nombres reales, generar el baseline,
aplicarlo con `migrate deploy`, migrar las 10 filas conservando IDs, correr el
smoke test y verificar que Preview resuelve a una branch distinta de Production.

### 18.14 Estado

> **¿Production persiste durablemente en PostgreSQL?** — **NO.** No existe instancia.
>
> **¿Preview y tests están aislados de Production?** — **Tests: SÍ**, re-verificado con los cuatro escenarios. **Preview: NO VERIFICABLE**, no hay integración que inspeccionar.

Conforme al criterio de cierre, **INFRA-001 permanece en `[~]` En progreso**.

El bloqueo es enteramente externo al repositorio: falta aprovisionar la base. Todo
lo que no dependía del proveedor está terminado, verificado y ahora commiteado.
