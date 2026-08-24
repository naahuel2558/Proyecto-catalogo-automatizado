import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode-terminal';
import pino from 'pino';
import path from 'path';

const logger = pino({ level: 'info' });
const AUTH_FOLDER = path.join(process.cwd(), 'whatsapp-auth-session');

export const GREETING_MESSAGE = `Buenas noches! Te estás comunicando con *Entre Panes*. ¿Qué te preparamos hoy? 😎

Somos *ENTRE PANES*! 🥪🍔🍟

Horario de atención: Lunes a Domingos de 19:30hs a 23:30hs!

*Recordá que para ver precios, nuestros productos y realizar tu pedido, ingresá al siguiente link:*

⬇️⬇️⬇️⬇️⬇️⬇️⬇️⬇️⬇️

*https://ia-entre-panes.vercel.app*

Estamos a tu disposición!

📍*IMPORTANTE*: 

👉🏻 ALIAS: *entrepanes.mp*
🧒🏻 Titular: *ENTRE PANES S.A.S.*
📞 Teléfono: *+54 9 3582 435386*

*LAS PROMOS SON SOLAMENTE EN EFECTIVO*`;

let activeSocket: ReturnType<typeof makeWASocket> | null = null;

export async function connectToWhatsApp() {
  if (activeSocket) return activeSocket;

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);
  const { version } = await fetchLatestBaileysVersion();

  console.log(`\n==================================================`);
  console.log(`🤖 Iniciando Agente Bot de WhatsApp - ENTRE PANES v${version.join('.')}`);
  console.log(`==================================================\n`);

  const sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: true,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
  });

  activeSocket = sock;

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('📲 Escanea el siguiente código QR con tu WhatsApp para vincular el bot:\n');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      activeSocket = null;
      const shouldReconnect =
        (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('❌ Conexión cerrada debido a:', lastDisconnect?.error, ', reconectando:', shouldReconnect);
      if (shouldReconnect) {
        connectToWhatsApp();
      }
    } else if (connection === 'open') {
      console.log('✅ Bot de WhatsApp conectado exitosamente con el número de ENTRE PANES (+54 9 3582 435386)!');
    }
  });

  sock.ev.on('messages.upsert', async (m) => {
    try {
      const msg = m.messages[0];
      if (!msg.message || msg.key.fromMe) return;

      const remoteJid = msg.key.remoteJid;
      if (!remoteJid || remoteJid.endsWith('@g.us')) return; // Ignorar grupos

      const messageText =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        '';

      console.log(`💬 Mensaje recibido de ${remoteJid}: "${messageText}"`);

      // Responder con el saludo automático que incluye el link al catálogo web de Vercel
      await sock.sendMessage(remoteJid, { text: GREETING_MESSAGE });
      console.log(`🤖 Saludo automático y enlace enviado a ${remoteJid}`);
    } catch (err) {
      console.error('Error procesando mensaje entrante de WhatsApp:', err);
    }
  });

  return sock;
}

export async function sendWhatsAppMessage(toPhone: string, text: string): Promise<boolean> {
  try {
    const cleanNumber = toPhone.replace(/\D/g, '');
    if (!cleanNumber) return false;

    // Formatear JID de WhatsApp
    let jid = cleanNumber;
    if (jid.startsWith('54') && !jid.startsWith('549')) {
      jid = '549' + jid.slice(2);
    }
    const formattedJid = `${jid}@s.whatsapp.net`;

    if (!activeSocket) {
      await connectToWhatsApp();
    }

    // Verificar que la sesión de WhatsApp esté conectada y lista (con usuario activo)
    if (activeSocket && (activeSocket as unknown as { user?: object }).user) {
      // Enviar recibo al cliente
      await activeSocket.sendMessage(formattedJid, { text });
      console.log(`📲 Recibo enviado automáticamente al usuario en WhatsApp: ${formattedJid}`);

      // Enviar copia del recibo al número oficial de la rotisería (si es un número distinto)
      const officialJid = '5493582435386@s.whatsapp.net';
      if (formattedJid !== officialJid) {
        await activeSocket.sendMessage(officialJid, { text: `[NUEVO PEDIDO RECIBIDO]\n\n${text}` });
        console.log(`📲 Copia del recibo enviada a la rotisería: ${officialJid}`);
      }

      return true;
    } else {
      console.log('⚠️ El bot de WhatsApp aún no ha vinculado el código QR (esperando vinculación).');
      return false;
    }
  } catch (err) {
    console.error('Error al enviar mensaje de WhatsApp:', err);
  }
  return false;
}

// Permitir ejecución directa desde la consola
if (require.main === module) {
  connectToWhatsApp().catch((err) => console.error('Error al iniciar WhatsApp Bot:', err));
}
