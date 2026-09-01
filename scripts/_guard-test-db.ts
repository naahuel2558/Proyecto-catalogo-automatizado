/**
 * INFRA-001 — Aislamiento de la base de datos de tests.
 *
 * Todas las suites importan `prisma` desde `src/lib/db`, que resuelve la conexion
 * desde `DATABASE_URL`. Las suites crean y ELIMINAN usuarios, ordenes, productos y
 * categorias. Mientras `DATABASE_URL` apuntaba a SQLite local eso era inofensivo;
 * en cuanto la variable pueda apuntar a PostgreSQL de produccion, ejecutar
 * `npm run test:kitchen` con el entorno equivocado destruiria datos reales.
 *
 * Este modulo se importa PRIMERO en cada suite. Los imports ESM se evaluan en
 * orden de declaracion, por lo que este guard corre antes de que `src/lib/db`
 * instancie el PrismaClient y puede reescribir `DATABASE_URL` con seguridad.
 *
 * Contrato:
 *   - `TEST_DATABASE_URL` definida  -> se usa esa, siempre. Es la via explicita.
 *   - `DATABASE_URL` es `file:`     -> SQLite local, se permite.
 *   - cualquier otro caso           -> ABORTA.
 *
 * No existe forma de saltear el guard con una variable de "forzado": el unico
 * camino hacia una base remota es nombrarla en `TEST_DATABASE_URL`, que es una
 * decision deliberada y visible.
 */

/**
 * A diferencia del CLI de Prisma, tsx no carga `.env` por si mismo. Desde que
 * INFRA-001 movio la conexion a env("DATABASE_URL"), las suites dependen de que
 * ese archivo este cargado. `process.loadEnvFile` es API estable de Node y no
 * pisa variables ya presentes en el entorno, por lo que respeta cualquier
 * DATABASE_URL o TEST_DATABASE_URL inyectada desde afuera.
 */
if (!process.env.DATABASE_URL && !process.env.TEST_DATABASE_URL) {
  try {
    process.loadEnvFile();
  } catch {
    // Sin .env: las validaciones de abajo emiten el diagnostico correspondiente.
  }
}

const PROD_HINTS = ['prod', 'production', 'live'];

function fail(reason: string, detail: string): never {
  console.error('\n[INFRA-001] Suite de tests ABORTADA.\n');
  console.error(`Motivo: ${reason}`);
  console.error(`Detalle: ${detail}\n`);
  console.error('Los tests crean y eliminan registros. Solo pueden ejecutarse contra');
  console.error('una base local o una base declarada explicitamente en TEST_DATABASE_URL.\n');
  console.error('Opciones:');
  console.error('  - desarrollo local : DATABASE_URL="file:./dev.db"');
  console.error('  - base de test     : TEST_DATABASE_URL="postgresql://.../ia_entre_panes_test"\n');
  process.exit(1);
}

/** Oculta credenciales: deja visible solo el esquema y el host. */
function redact(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//<redacted>@${parsed.hostname}/<db>`;
  } catch {
    return url.startsWith('file:') ? url : '<no parseable>';
  }
}

const explicit = process.env.TEST_DATABASE_URL;

if (explicit) {
  if (PROD_HINTS.some((hint) => explicit.toLowerCase().includes(hint))) {
    fail(
      'TEST_DATABASE_URL contiene un indicio de produccion.',
      `Cadena sospechosa en ${redact(explicit)}`,
    );
  }
  process.env.DATABASE_URL = explicit;
} else {
  const current = process.env.DATABASE_URL;

  if (!current) {
    fail('DATABASE_URL no esta definida.', 'No hay ninguna base a la que conectarse.');
  }

  if (!current.startsWith('file:')) {
    fail(
      'DATABASE_URL no apunta a una base SQLite local.',
      `Apunta a ${redact(current)}. Defini TEST_DATABASE_URL para usar una base de test remota.`,
    );
  }

  if (PROD_HINTS.some((hint) => current.toLowerCase().includes(hint))) {
    fail('DATABASE_URL contiene un indicio de produccion.', `Cadena sospechosa en ${current}`);
  }
}

export const TEST_DATABASE_TARGET = process.env.DATABASE_URL as string;
