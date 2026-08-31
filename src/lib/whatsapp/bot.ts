import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  AnyMessageContent
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

*https://entrepanes-iota.vercel.app*

Estamos a tu disposición!

📍*IMPORTANTE*: 

👉🏻 ALIAS: *entrepanes.mp*
🧒🏻 Titular: *ENTRE PANES S.A.S.*
📞 Teléfono: *+54 9 3585 762463*

*LAS PROMOS SON SOLAMENTE EN EFECTIVO*`;

// Prevención de múltiples instancias en el entorno de desarrollo de Next.js (Fast Refresh)
const globalForBot = global as unknown as { 
  activeSocket: ReturnType<typeof makeWASocket> | null;
  messageCooldowns: Map<string, number> | null;
};

let activeSocket: ReturnType<typeof makeWASocket> | null = globalForBot.activeSocket || null;

// Mapa para guardar el tiempo del último saludo enviado a cada usuario
const messageCooldowns = globalForBot.messageCooldowns || new Map<string, number>();
if (!globalForBot.messageCooldowns) globalForBot.messageCooldowns = messageCooldowns;

const COOLDOWN_TIME_MS = 45 * 60 * 1000; // 45 minutos en milisegundos

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
  globalForBot.activeSocket = sock;

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
      console.log('✅ Bot de WhatsApp conectado exitosamente con el número de ENTRE PANES (+54 9 3585 762463)!');
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

      const now = Date.now();
      const lastSentTime = messageCooldowns.get(remoteJid) || 0;

      if (now - lastSentTime < COOLDOWN_TIME_MS) {
        console.log(`⏳ Saludo automático omitido para ${remoteJid} (en período de enfriamiento)`);
        return;
      }

      // Responder con el saludo automático que incluye el link al catálogo web de Vercel
      await sock.sendMessage(remoteJid, { text: GREETING_MESSAGE });
      messageCooldowns.set(remoteJid, now);
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

    let isNewConnection = false;
    if (!activeSocket) {
      await connectToWhatsApp();
      isNewConnection = true;
    }

    // Si acabamos de arrancar el socket, le damos 4 segundos para que se conecte correctamente a los servidores de Meta
    if (isNewConnection) {
      console.log('⏳ Esperando a que la conexión de WhatsApp se estabilice antes de enviar el recibo...');
      await new Promise(resolve => setTimeout(resolve, 4000));
    }

    // Verificar que la sesión de WhatsApp esté conectada y lista (con usuario activo)
    if (activeSocket && (activeSocket as unknown as { user?: object }).user) {
      const sendWithTimeout = async (jid: string, content: AnyMessageContent) => {
        return Promise.race([
          activeSocket!.sendMessage(jid, content),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout de WhatsApp (Bot desconectado)')), 8000))
        ]);
      };

      // Enviar recibo al cliente
      await sendWithTimeout(formattedJid, { text });
      console.log(`📲 Recibo enviado automáticamente al usuario en WhatsApp: ${formattedJid}`);

      // Enviar copia del recibo al número oficial de la rotisería (si es un número distinto)
      const officialJid = '5493585762463@s.whatsapp.net';
      if (formattedJid !== officialJid) {
        await sendWithTimeout(officialJid, { text: `[NUEVO PEDIDO RECIBIDO]\n\n${text}` });
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

// Ejecución directa desde CLI
if (typeof process !== 'undefined' && process.argv && process.argv[1] && process.argv[1].includes('bot.ts')) {
  console.log('🚀 Iniciando bot en modo standalone...');
  connectToWhatsApp();

  import('http').then((http) => {
    http.createServer((req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      
      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        return res.end();
      }
      
      if (req.method === 'POST' && req.url === '/send') {
        let body = '';
        req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
        req.on('end', async () => {
          try {
            const { toPhone, text } = JSON.parse(body);
            const result = await sendWhatsAppMessage(toPhone, text);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: result }));
          } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            res.writeHead(500);
            res.end(JSON.stringify({ error: errorMessage }));
          }
        });
      } else {
        res.writeHead(404);
        res.end();
      }
    }).listen(3001, () => console.log('🔌 Servidor API local del Bot escuchando en http://localhost:3001'));
  });
}

// Fin del archivo bot.ts
