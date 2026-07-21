const express = require('express');
const {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const fs = require('fs');
const path = require('path');
const pino = require('pino');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;
const AUTH_DIR = '/data/session';

// Ensure auth directory exists
if (!fs.existsSync(AUTH_DIR)) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
}

let sock;
let pairingCode = null;       // current pairing code (if any)
let isConnected = false;

async function startWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version, isLatest } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
    },
    printQRInTerminal: false,   // we'll handle QR manually if needed
    browser: ['FIDUCIA CARE', 'Safari', '1.0.0'],
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      // QR code appeared – we can also fallback to QR if needed,
      // but we prefer pairing code. Log it for manual fallback.
      console.log('QR_CODE:', qr);
    }

    if (connection === 'open') {
      console.log('WhatsApp bridge is ready!');
      isConnected = true;
      pairingCode = null; // clear pairing code once connected
    }

    if (connection === 'close') {
      const shouldReconnect =
        (lastDisconnect?.error instanceof Boom) &&
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      
      console.log('Connection closed. Reconnecting:', shouldReconnect);
      if (shouldReconnect) {
        startWhatsApp();
      } else {
        console.log('Logged out. Please re-link.');
        isConnected = false;
        sock = null;
      }
    }
  });
}

// Start the WhatsApp connection
startWhatsApp();

// ── API Routes ──

// Get current status
app.get('/status', (req, res) => {
  res.json({ connected: isConnected, pairingCode: pairingCode });
});

// Generate pairing code
app.get('/pairing-code', async (req, res) => {
  if (isConnected) {
    return res.json({ connected: true, message: 'Already connected' });
  }
  try {
    // Request a pairing code from the socket
    const phoneNumber = req.query.phone || '2349167049038'; // default to your number? Better require it.
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number required' });
    }
    if (!sock) {
      return res.status(503).json({ error: 'WhatsApp client not ready' });
    }
    const code = await sock.requestPairingCode(phoneNumber);
    pairingCode = code;
    console.log('Pairing code generated:', code);
    return res.json({ pairingCode: code, phoneNumber });
  } catch (err) {
    console.error('Failed to generate pairing code:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Send message (unchanged interface)
app.post('/send-message', async (req, res) => {
  const { phone, message } = req.body;
  if (!phone || !message) {
    return res.status(400).json({ error: 'phone and message required' });
  }
  if (!sock || !isConnected) {
    return res.status(503).json({ error: 'WhatsApp not connected' });
  }
  try {
    const jid = phone.includes('@s.whatsapp.net') ? phone : `${phone}@s.whatsapp.net`;
    await sock.sendMessage(jid, { text: message });
    console.log(`Message sent to ${phone}`);
    res.json({ success: true });
  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`WhatsApp bridge (Baileys) listening on port ${PORT}`);
});
