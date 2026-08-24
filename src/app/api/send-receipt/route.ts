import { NextResponse } from 'next/server';
import { sendWhatsAppMessage } from '@/lib/whatsapp/bot';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { customerName, customerPhone, locationDetails, receiptText, order } = body;

    if (!customerPhone || !receiptText) {
      return NextResponse.json({ error: 'Faltan datos obligatorios' }, { status: 400 });
    }

    console.log(`📩 Solicitud recibida para enviar recibo a ${customerPhone} (${customerName})`);

    // Enviar el recibo por WhatsApp automáticamente al teléfono del cliente
    const sent = await sendWhatsAppMessage(customerPhone, receiptText);

    return NextResponse.json({
      success: true,
      message: sent
        ? 'Recibo de pedido enviado por WhatsApp al cliente exitosamente.'
        : 'Pedido registrado en cocina. (Abre la app de WhatsApp si la sesión del bot no está vinculada aún).',
      sentTo: customerPhone,
      botSentStatus: sent,
    });
  } catch (error) {
    console.error('Error procesando envío de recibo por WhatsApp:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno al procesar el recibo';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
