import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * P0-001 — Production Containment.
 *
 * Esta ruta enviaba un mensaje de WhatsApp, desde el número del negocio, hacia el
 * teléfono recibido en el body. `Order` no persiste `customerPhone`, por lo que el
 * servidor no tiene ninguna forma fiable de demostrar que ese número pertenece al
 * pedido. Un tercero podía, en consecuencia, provocar envíos hacia teléfonos
 * arbitrarios usando la identidad de la rotisería.
 *
 * El envío automático queda deshabilitado. La ruta ya no importa ni invoca
 * `sendWhatsAppMessage` y no puede producir un envío bajo ningún payload.
 *
 * El checkout continúa operando: `createOrder` devuelve `whatsappUrl`, un enlace
 * `wa.me` construido en servidor a partir de la Order validada, que el cliente abre
 * manualmente hacia el número oficial.
 *
 * Reactivación: requiere `EP-002.1` (persistir contacto en `Order`) y `EP-007`
 * (integración oficial de WhatsApp Cloud API). Baileys no es infraestructura de
 * producción.
 */
const DISABLED_RESPONSE = {
  error: 'RECEIPT_AUTOSEND_DISABLED',
  message:
    'El envío automático de recibos por WhatsApp está deshabilitado. El pedido se registra igual y el recibo se envía desde el enlace manual de WhatsApp.',
} as const;

export async function POST() {
  // El handler no lee el body en ningún momento: no existe dato del cliente
  // capaz de seleccionar un destinatario ni de disparar un envío.
  return NextResponse.json(DISABLED_RESPONSE, { status: 410 });
}

export async function GET() {
  return NextResponse.json(DISABLED_RESPONSE, { status: 410 });
}
