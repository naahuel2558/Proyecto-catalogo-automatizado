import { NextResponse } from 'next/server';
import { sendWhatsAppMessage } from '@/lib/whatsapp/bot';
import {
  buildReceiptText,
  CheckoutError,
  getReceiptOrder,
  parseReceiptRequest,
} from '@/lib/orders/secure-checkout';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { orderCode, customerName, customerPhone } = parseReceiptRequest(await req.json());
    const order = await getReceiptOrder(orderCode);
    if (!order) {
      return NextResponse.json({ error: 'Pedido inexistente' }, { status: 404 });
    }
    const receiptText = buildReceiptText(order, customerName, customerPhone);

    console.log(`📩 Solicitud de recibo ${orderCode} para ${customerPhone} (${customerName})`);

    let sent = false;

    if (process.env.NODE_ENV === 'development') {
      try {
        const res = await fetch('http://localhost:3001/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ toPhone: customerPhone, text: receiptText })
        });
        if (res.ok) {
          const data = await res.json();
          sent = data.success;
          console.log('✅ Recibo enviado a través del bot standalone.');
        } else {
          throw new Error('Fallback');
        }
      } catch {
        console.log('⚠️ Bot standalone no detectado en el puerto 3001, usando instancia interna...');
        sent = await sendWhatsAppMessage(customerPhone, receiptText);
      }
    } else {
      // Enviar el recibo por WhatsApp automáticamente al teléfono del cliente
      sent = await sendWhatsAppMessage(customerPhone, receiptText);
    }

    return NextResponse.json({
      success: true,
      message: sent
        ? 'Recibo de pedido enviado por WhatsApp al cliente exitosamente.'
        : 'Pedido registrado en cocina. (Abre la app de WhatsApp si la sesión del bot no está vinculada aún).',
      sentTo: customerPhone,
      botSentStatus: sent,
    });
  } catch (error) {
    if (error instanceof CheckoutError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Error procesando envío de recibo por WhatsApp:', error);
    return NextResponse.json(
      { error: 'Error interno al procesar el recibo' },
      { status: 500 }
    );
  }
}
