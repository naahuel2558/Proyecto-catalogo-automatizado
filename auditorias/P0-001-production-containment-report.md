# P0-001 — Production Containment

Fecha: 31/08/2026
Estado: completada y validada

Alcance: contención de dos riesgos de producción. No incluye migración a PostgreSQL, persistencia de contacto en `Order`, middleware, WhatsApp Cloud API ni reescritura del historial de Git.

---

## 1. send-receipt — Estado anterior

`src/app/api/send-receipt/route.ts` exponía un `POST` público con este comportamiento:

| Pregunta | Respuesta encontrada |
|---|---|
| ¿Quién podía llamarlo? | Cualquiera. Ruta pública sin restricción de origen. |
| Payload aceptado | `{ orderCode, customerName, customerPhone }`. Rechazaba campos desconocidos. |
| Origen de `orderCode` | Body de la petición, validado contra `/^EP-[A-F0-9]{10}$/`. |
| Origen de `customerPhone` | **Body de la petición.** Validado sólo por forma telefónica. |
| Reconstrucción de la Order | `getReceiptOrder(orderCode)` — leída desde Prisma, correcta. |
| ¿Autenticación? | **No.** No invocaba `getServerSession` ni ningún guard. |
| ¿Autorización? | **No.** |
| ¿Rate limiting? | **No.** |
| ¿Un tercero podía provocar un envío a un teléfono arbitrario? | **Sí.** |

El flujo terminaba en `sendWhatsAppMessage(customerPhone, receiptText)` (`src/lib/whatsapp/bot.ts`), que envía a través de la sesión Baileys vinculada al número de la rotisería. En `NODE_ENV=development` intentaba primero delegar en `http://localhost:3001/send`, con el mismo efecto.

EP-003 endureció correctamente el **contenido** del recibo: se reconstruye desde la base y rechaza `receiptText`, `price` y `total`. Lo que quedó sin resolver fue el **destinatario**.

Consumidores identificados de `sendWhatsAppMessage`:

- `src/app/api/send-receipt/route.ts` — ruta pública (contenida en esta tarea).
- `src/lib/whatsapp/bot.ts` — servidor HTTP local levantado sólo por `npm run whatsapp`.

---

## 2. Riesgo

`Order` no persiste `customerPhone`. En consecuencia el servidor **no tenía ninguna forma de comprobar que el teléfono recibido perteneciera al pedido**: aceptaba como destinatario autorizado un número únicamente porque venía en el body.

Esto rompe la regla absoluta del alcance: un cliente no debe poder indicarle al servidor "enviá el pedido X al número Y".

Consecuencias:

- El número de WhatsApp del negocio podía usarse como emisor de mensajes hacia destinatarios no relacionados con el pedido.
- El activo en riesgo es el propio número comercial: su bloqueo por parte de la plataforma interrumpe el canal de ventas.
- Un `orderCode` conocido permitía además que el contenido del pedido llegara a un destinatario elegido por el solicitante.

No se requería autenticación, sesión ni conocimiento previo del sistema.

---

## 3. Mitigación

Se aplicó la opción preferida del alcance: **deshabilitar el envío automático** en lugar de construir una autorización que el modelo de datos actual no puede sostener.

`src/app/api/send-receipt/route.ts` fue reescrita:

- no importa `@/lib/whatsapp/bot`;
- no invoca `sendWhatsAppMessage`;
- no delega en `localhost:3001`;
- **no lee el body ni recibe la `Request`** — el handler no declara parámetro;
- `POST` y `GET` responden `410 Gone` con `RECEIPT_AUTOSEND_DISABLED`.

Al no leer el payload, la ruta es inerte frente a **cualquier** cuerpo de petición. No hay validación que evadir porque no hay dato del cliente que se consulte.

`src/components/MenuClient.tsx` dejó de invocar el endpoint tras crear la orden.

Deliberadamente **no** se usaron: secretos enviados al navegador, tokens hardcodeados en frontend, checks de `User-Agent`, `Origin` como única protección, ni IDs falsificables como autorización.

### Bot standalone (desarrollo)

`src/lib/whatsapp/bot.ts` conserva todo el código de Baileys, pero su servidor HTTP local se endureció:

- antes: `listen(3001)` — escuchaba en todas las interfaces, alcanzable desde la red local;
- ahora: `listen(3001, '127.0.0.1')` — sólo loopback;
- se eliminó `Access-Control-Allow-Origin: '*'` y el preflight asociado.

Sólo se levanta ejecutando `npm run whatsapp` de forma manual. No forma parte del build de Next.

---

## 4. WhatsApp — qué funciona y qué se deshabilitó

**Sigue funcionando:**

- creación de la Order por Secure Checkout (EP-003 intacto);
- generación server-side del `orderCode`;
- cálculo del total en servidor desde `Product.price`;
- construcción server-side del texto del recibo desde la Order validada;
- `whatsappUrl`: enlace `wa.me` hacia el número oficial `5493585762463`, devuelto por `createOrder`;
- apertura manual de WhatsApp por parte del cliente;
- registro del pedido en `/cocina`.

**Deshabilitado temporalmente:**

- envío automático del recibo por Baileys desde la ruta pública.

La experiencia se degrada de forma consciente: el cliente pulsa el enlace en lugar de recibir el mensaje automáticamente. Seguridad por encima de automatización.

**Baileys** queda documentado como herramienta de desarrollo, no como infraestructura de producción. `EP-007` deberá implementarse con una integración oficial de WhatsApp (Cloud API). No se implementó en esta tarea.

**Reactivación**: requiere `EP-002.1` (persistir `customerName`/`customerPhone` en `Order`, para que el destinatario provenga de la base y no del cliente) y `EP-007`.

---

## 5. Git — archivos problemáticos trackeados

Verificado con `git ls-files --error-unmatch` (coincidencia exacta, sin inferencia):

| Archivo | Estado encontrado |
|---|---|
| `prisma/dev.db` | **TRACKED** |
| `tsconfig.tsbuildinfo` | **TRACKED** |
| `prisma/dev.db.backup` | NOT TRACKED |
| `*.db-journal` / `*.db-shm` / `*.db-wal` | NOT TRACKED (no existen) |
| `*.sqlite` / `*.sqlite3` | NOT TRACKED (no existen) |
| `.env` | **NOT TRACKED** |
| `.env.local` | NOT TRACKED |
| `.env.production` | NOT TRACKED |
| `.env.development` | NOT TRACKED |

No se muestra ningún valor de configuración. Sólo estado de tracking.

Acción aplicada:

```
git rm --cached prisma/dev.db tsconfig.tsbuildinfo
```

Ambos archivos **permanecen en disco**. Verificado tras la operación: `prisma/dev.db` (118.784 bytes), `prisma/dev.db.backup` (106.496 bytes) y `tsconfig.tsbuildinfo` (154.575 bytes) siguen presentes. No se borró ningún dato local.

`git check-ignore` confirma que los tres quedan ignorados de aquí en adelante.

---

## 6. SQLite — auditoría de metadatos

Inspección exclusivamente de metadatos. No se leyó ni se imprimió ningún dato personal.

- Archivo: `prisma/dev.db`
- Tamaño: 118.784 bytes
- Tablas: 9

| Tabla | Registros | Categorías de datos presentes |
|---|---|---|
| `User` | 2 | email, hash de contraseña, nombre, rol, imagen |
| `Account` | 0 | (tokens OAuth — vacía) |
| `Session` | 0 | (tokens de sesión — vacía) |
| `VerificationToken` | 0 | (tokens — vacía) |
| `Order` | 0 | (sin pedidos) |
| `OrderItem` | 0 | (sin ítems de pedido) |
| `Product` | 5 | catálogo, sin datos personales |
| `Category` | 3 | catálogo, sin datos personales |
| `_prisma_migrations` | 3 | metadatos de migración |

Conclusión: la base trackeada **no contenía pedidos ni datos de clientes**. El dato sensible presente son 2 registros de `User` con email y hash de contraseña, más 3 filas de catálogo y 5 de productos, compatibles con un entorno de desarrollo.

Los recuentos se verificaron de nuevo después de ejecutar toda la batería de tests: idénticos. Ninguna suite dejó fixtures residuales.

---

## 7. Historial Git

**No se reescribió el historial.** No se ejecutó `git filter-branch`, `git filter-repo`, BFG ni `push --force`.

| Pregunta | Resultado |
|---|---|
| ¿`prisma/dev.db` aparece en commits históricos? | **Sí.** |
| ¿En cuántos? | 1 commit. |
| ¿Cuál? | `15c400d` — *"feat: despliegue de las últimas actualizaciones"*, 2026-08-31 15:01:54 -0300. |
| ¿Desde cuándo? | Introducido en ese mismo commit (`--diff-filter=A`), que es `HEAD`. |
| ¿`tsconfig.tsbuildinfo` en histórico? | Sí: `15c400d` y `6c0aa47` ("Add files via upload"). |
| Total de commits del repositorio | 11. |
| Remote configurado | `origin` → `github.com/naahuel2558/Proyecto-catalogo-automatizado.git` |
| ¿Repositorio público o privado? | **UNKNOWN** — no es determinable con la información disponible localmente. |
| ¿Contiene datos personales reales o fixtures? | Los recuentos indican datos compatibles con desarrollo: 2 usuarios, 0 pedidos, 0 tokens. No hay datos de clientes. |

El blob permanece accesible en el historial. La limpieza histórica queda registrada en riesgos pendientes, no ejecutada en P0-001.

Circunstancia favorable: al aparecer en un único commit, y siendo éste `HEAD`, una eventual limpieza futura es considerablemente más simple que en un historial con múltiples versiones del binario.

---

## 8. .gitignore — cambios realizados

Añadido:

```
# P0-001 — bases de datos locales y artefactos generados
*.db
*.db-journal
*.db-shm
*.db-wal
*.db.backup
*.sqlite
*.sqlite3
```

Modificado: la regla `*.tsbuildinfo` se normalizó a `**/*.tsbuildinfo` para cubrir subdirectorios.

Sin excepciones (`!`). Ningún archivo `.db` del proyecto es de runtime necesario: `prisma/dev.db` se genera con `prisma migrate` y `prisma db seed`.

Las reglas previas —incluida `.env*`— se conservaron intactas.

---

## 9. Artefactos del repositorio

Clasificados, **no eliminados** salvo lo inequívocamente generado.

| Archivo / directorio | Tracking | Clasificación | Acción |
|---|---|---|---|
| `prisma/dev.db` | era TRACKED | Artefacto generado (base local) | **Retirado del índice**, conservado en disco |
| `tsconfig.tsbuildinfo` | era TRACKED | Artefacto generado (build TS) | **Retirado del índice**, conservado en disco |
| `prisma/dev.db.backup` | NOT TRACKED | Backup local | Sin acción; ahora cubierto por `.gitignore` |
| `screen.html` (23 KB) | TRACKED | **Desconocido** — sin imports desde `src/` | Documentado. Sin acción |
| `temp_init.sql` | TRACKED | **Desconocido** — el nombre sugiere temporal, pero podría ser bootstrap de base | Documentado. Sin acción |
| `cambios-31-8-26/` (3 archivos) | TRACKED | Documentación (`PLAN.md`, `PROMPTS.md`, `README.md`) | Conservar |
| `imgs/` (9 imágenes) | TRACKED | **Desconocido** — posibles originales; las servidas viven en `public/imgs/` | Documentado. Sin acción |
| `stitch_downloads/` | NOT TRACKED | Temporal | Ya ignorado |
| `.next/`, `node_modules/` | NOT TRACKED | Generados | Ya ignorados |

Ante duda, se documentó en lugar de eliminar.

---

## 10. Package manager

| Artefacto | Estado |
|---|---|
| `package-lock.json` | PRESENTE y trackeado |
| `pnpm-lock.yaml` | Ausente |
| `yarn.lock` | Ausente |
| `pnpm-workspace.yaml` | PRESENTE y trackeado |

**Package manager real: npm.** Es el único con lockfile.

Inconsistencia detectada: `pnpm-workspace.yaml` está versionado pero nunca fue configurado — su contenido conserva los placeholders literales `set this to true or false` para `@whiskeysockets/baileys`, `esbuild`, `protobufjs` y `unrs-resolver`. Es un residuo de una instalación con pnpm que no prosperó.

**No se cambió el package manager.** Queda documentado para una tarea posterior.

---

## 11. Tests — casos A–D

Suite nueva: `scripts/test-receipt-security.ts` → `npm run test:receipt-security`.

Precondiciones estructurales verificadas antes de los casos:

- **PRE1** — la ruta no importa `whatsapp/bot`, no invoca `sendWhatsAppMessage` y no delega en `localhost:3001`.
- **PRE2** — la ruta no lee el body (`req.json`, `request.json`, `formData`) ni recibe la `Request`.

| Caso | Payload | Resultado esperado | Resultado |
|---|---|---|---|
| **A** | `orderCode` + teléfono arbitrario como destino | No provoca envío | **PASS** — `410`, `RECEIPT_AUTOSEND_DISABLED`, sin cambios en `Order` |
| **B** | Payload con `receiptText` manipulado | No provoca envío | **PASS** — `410` |
| **C** | Payload con `total: 0`, `price: 0` e `items` inyectados | No provoca envío | **PASS** — `410` |
| **C.1** | `GET` sobre la ruta | No ofrece vía alternativa | **PASS** — `410` |
| **C.2** | `MenuClient.tsx` | No invoca el endpoint | **PASS** |
| **D** | Checkout válido | Order creada + enlace manual disponible | **PASS** |

Detalle del caso D verificado:

- `orderCode` con formato `EP-[A-F0-9]{10}` generado en servidor;
- `total` igual a `unitPrice × quantity` calculado en servidor;
- estado inicial `WAITING_WHATSAPP`;
- `whatsappUrl` apunta a `https://wa.me/5493585762463?text=` y contiene el `orderCode`;
- `Order` y `OrderItem` persistidos, con `unitPrice` snapshot correcto.

Alcance de la demostración, sin sobreafirmar: los casos A–C prueban que la ruta responde `410` sin efecto y que **estructuralmente carece de camino hacia el bot y de lectura del payload**. Esa combinación es lo que hace imposible el envío, no una validación que pudiera evadirse.

Las fixtures se eliminan en `finally`. Recuentos de la base idénticos antes y después.

---

## 12. Validaciones

| Comando | Resultado |
|---|---|
| `npx prisma validate` | **PASS** — schema válido |
| `npx prisma migrate status` | **PASS** — 3 migraciones, base sincronizada |
| `npx tsc --noEmit` | **PASS** — 0 errores |
| `npm run lint` | **PASS** — 0 errores, 28 warnings (baseline preexistente, 0 nuevos) |
| `npm run build` | **PASS** — Next.js 16.3.1, 16 rutas |
| `npm run test:receipt-security` | **PASS** — A, B, C, D |
| `npm run test:secure-checkout` | **PASS** — A–J |
| `npm run test:product-admin` | **PASS** — A–K |
| `npm run test:category-admin` | **PASS** — A–L |
| `npm run test:kitchen` | **PASS** — A–P |
| `npm run test:admin-routes` | **PASS** — catálogo, auth, perfil, clientes, productos, categorías y cocina |

Regresión completa sin roturas. EP-003, EP-004, EP-005 y EP-006 siguen pasando.

No se modificó `schema.prisma`, no se creó ninguna migración y no se editó una migración aplicada.

---

## 13. Riesgos restantes

1. **Limpieza histórica de Git.** `prisma/dev.db` sigue presente en el commit `15c400d`. La visibilidad del remoto es `UNKNOWN`. Si el repositorio resultara público, corresponde reescribir el historial y rotar las credenciales de los 2 usuarios de `User`. Tarea separada; no ejecutada aquí por instrucción explícita.
2. **PostgreSQL — `INFRA-001`.** `schema.prisma` declara `url = "file:./dev.db"` de forma literal, sin `env("DATABASE_URL")`. Con despliegue en Vercel el filesystem es efímero, por lo que la persistencia real de producción no está garantizada.
3. **Persistencia de `customerName` / `customerPhone` — `EP-002.1`.** Es el bloqueo de fondo de SEC-001. Mientras el contacto no viva en `Order`: el envío automático no puede reactivarse de forma segura, y `/cocina` sigue mostrando "Pedido invitado" sin forma de contactar al cliente.
4. **Middleware y unificación de guards.** No existe `middleware.ts`. La protección de `/admin` y `/cocina` depende de que cada página nueva recuerde llamar a `requireAdminPage()`. Además conviven cuatro patrones de autorización (`requireAdminPage`, `assertAdminActor`, guard inline y guard cliente en `/admin/clientes`).
5. **Base de datos de test.** Las suites escriben sobre `prisma/dev.db`, la misma base de desarrollo. Limpian en `finally`, pero un fallo a mitad de camino puede dejar residuos. Corresponde una base efímera y un runner real.
6. **WhatsApp Cloud API — `EP-007`.** Baileys es cliente no oficial y requiere proceso persistente; no es viable en serverless. El webhook y la confirmación automática siguen pendientes.
7. **Código residual de recibo.** `parseReceiptRequest` y `getReceiptOrder` permanecen exportados en `src/lib/orders/secure-checkout.ts` sin consumidores de runtime. Se conservan porque `test-secure-checkout.ts` los ejercita y su eliminación excede este alcance.
8. **Artefactos sin clasificar.** `screen.html`, `temp_init.sql` e `imgs/` siguen versionados sin propósito confirmado.

---

## 14. Estado final

**¿Existe todavía una ruta pública que permita utilizar el WhatsApp del negocio para enviar mensajes a un teléfono arbitrario?**

**NO.**

La única ruta pública que lo permitía ya no importa el bot, no lo invoca, no delega en el servidor local y no lee el payload. El servidor HTTP del bot standalone sólo se levanta manualmente en desarrollo y quedó atado a `127.0.0.1`.

**¿Los archivos SQLite locales siguen siendo agregados a nuevos commits Git?**

**NO.**

`prisma/dev.db` y `tsconfig.tsbuildinfo` fueron retirados del índice conservando las copias locales, y `.gitignore` cubre `*.db`, `*.db-journal`, `*.db-shm`, `*.db-wal`, `*.db.backup`, `*.sqlite`, `*.sqlite3` y `**/*.tsbuildinfo`. `git check-ignore` lo confirma.

Ambas respuestas son `NO`: **P0-001 queda completa.**

---

## 15. Nota sobre el estado del roadmap

El encargo de esta tarea indicaba dejar `EP-004 — Product Admin CRUD` como `[ ] BLOQUEADO POR P0`. Al auditar el repositorio se comprobó que **EP-004, EP-005 y EP-006 ya estaban completadas y validadas**, con informes propios en `auditorias/` y suites en verde.

Marcarlas como pendientes habría falseado el estado real del proyecto. En su lugar:

- se conservó el estado real de EP-004, EP-005 y EP-006;
- se registró en `PLAN.md` que P0-001 bloquea el avance hacia `EP-007` y posteriores, que es el trabajo efectivamente pendiente;
- no se eliminó ninguna tarea del roadmap.

Queda a criterio del responsable del plan si desea otra representación.

---

## 16. Archivos modificados

- `PLAN.md` — sección `P0 — Production Safety`, `P0-001` e `INFRA-001`.
- `.gitignore` — patrones SQLite y normalización de `tsbuildinfo`.
- `package.json` — script `test:receipt-security`.
- `src/app/api/send-receipt/route.ts` — envío deshabilitado.
- `src/components/MenuClient.tsx` — eliminada la llamada al endpoint.
- `src/lib/whatsapp/bot.ts` — servidor de desarrollo atado a loopback, sin CORS permisivo.
- `scripts/test-receipt-security.ts` — nuevo.
- `auditorias/P0-001-production-containment-report.md` — nuevo.

Índice de Git: `prisma/dev.db` y `tsconfig.tsbuildinfo` retirados con `git rm --cached`. Ambos conservados en disco.

---

## 17. Siguiente tarea

`INFRA-001 — PostgreSQL Production Foundation`, registrada en `PLAN.md` como pendiente.

**No iniciada.**

---

## 18. Re-verificación independiente

Las conclusiones de este informe fueron re-verificadas en una sesión posterior, ejecutando las comprobaciones de nuevo desde cero en lugar de aceptar los resultados registrados.

### Contención del endpoint

| Comprobación | Método | Resultado |
|---|---|---|
| Consumidores de `sendWhatsAppMessage` en `src/` y `scripts/` | `grep -rn` | 1 única invocación runtime: `src/lib/whatsapp/bot.ts:205`, dentro del servidor local atado a `127.0.0.1` que sólo existe al ejecutar `npm run whatsapp` |
| Rutas API expuestas | `find src/app/api -name route.ts` | 2: `auth/[...nextauth]` y `send-receipt` (deshabilitada) |
| `send-receipt` importa el bot | Lectura del archivo | No |
| `send-receipt` lee el body | Lectura del archivo | No — las firmas `POST()` / `GET()` no reciben `Request` |
| `MenuClient` invoca el endpoint | `grep -rn "send-receipt" src/` | No |

### Estado de Git

| Comprobación | Resultado |
|---|---|
| `git ls-files` filtrado por `.db`/`.sqlite`/`tsbuildinfo` | Sin coincidencias — índice limpio |
| `git check-ignore` sobre `prisma/dev.db`, `dev.db.backup`, `dev.db-journal`, `tsconfig.tsbuildinfo`, `test.sqlite3` | Los cinco IGNORADOS |
| Archivos conservados en disco | `prisma/dev.db` (118.784 B), `prisma/dev.db.backup` (106.496 B), `tsconfig.tsbuildinfo` (154.823 B) — los tres presentes |
| `.env`, `.env.local`, `.env.production`, `.env.development`, `.env.test` | Los cinco NOT TRACKED |
| `prisma/dev.db` en historial | Sí, 1 commit: `15c400d` (HEAD) — no reescrito |

### Metadatos del blob commiteado

Se extrajo el binario tal como quedó en `15c400d` (`git show HEAD:prisma/dev.db`) y se inspeccionaron sólo metadatos. Recuentos idénticos a los de la copia local: `User=2` (2 con email, 2 con hash de contraseña, 1 con rol `ADMIN`), `Order=0`, `OrderItem=0`, `Product=5`, `Category=3`, `_prisma_migrations=3`.

Confirma la conclusión de la sección 6: **la base expuesta no contiene pedidos ni datos de clientes**. La exposición se limita a dos cuentas de entorno de desarrollo, una de ellas administrativa. La copia extraída se eliminó tras la inspección.

### Validaciones re-ejecutadas

| Comando | Resultado |
|---|---|
| `npx prisma validate` | PASS |
| `npx prisma migrate status` | PASS — 3 migraciones, base sincronizada |
| `npx tsc --noEmit` | PASS — 0 errores |
| `npm run lint` | PASS — 0 errores, 28 warnings (baseline) |
| `npm run build` | PASS — 16 rutas, `/api/send-receipt` compilada como dinámica |
| `npm run test:receipt-security` | PASS — PRE1, PRE2, A, B, C, C.1, C.2, D |
| `npm run test:secure-checkout` | PASS — A–J |
| `npm run test:product-admin` | PASS — A–K |
| `npm run test:category-admin` | PASS — A–L |
| `npm run test:kitchen` | PASS — A–P |
| `npm run test:admin-routes` | PASS |

Recuento de `dev.db` posterior a toda la batería: `User=2 | Order=0 | OrderItem=0 | Product=5 | Category=3`. Idéntico al previo — ninguna suite dejó fixtures residuales.

### Conclusión

Las dos respuestas de la sección 14 se sostienen con verificación independiente:

- ¿Existe todavía una ruta pública que permita usar el WhatsApp del negocio para enviar mensajes a un teléfono arbitrario? **NO.**
- ¿Los archivos SQLite locales siguen siendo agregados a nuevos commits? **NO.**

### Advertencia operativa

Todo el trabajo de P0-001 —y también el de EP-006— está **sin commitear** en el working tree, incluido el `git rm --cached` en estado *staged*. La contención no es efectiva para nadie más hasta que se confirme el commit.
