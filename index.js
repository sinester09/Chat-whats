ex · JS
Copiar

require("dotenv").config();
 
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const { askAssistant, clearThread } = require("./assistant");
 
// ─── Validar variables de entorno ────────────────────────────────────────────
if (!process.env.OPENAI_API_KEY) {
  console.error("❌ Falta OPENAI_API_KEY en .env");
  process.exit(1);
}
if (!process.env.ASSISTANT_ID) {
  console.error("❌ Falta ASSISTANT_ID en .env");
}
 
// ─── Configuración ───────────────────────────────────────────────────────────
const ALLOWED_NUMBERS = process.env.ALLOWED_NUMBERS
  ? process.env.ALLOWED_NUMBERS.split(",").map((n) => n.trim())
  : [];
 
const TRIGGER_PREFIX = process.env.TRIGGER_PREFIX || "";
 
// ─── Cliente WhatsApp ─────────────────────────────────────────────────────────
const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: "./.wwebjs_auth",
  }),
  puppeteer: {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-extensions",
      "--disable-plugins",
      "--disable-background-networking",  // evita peticiones en segundo plano
      "--disable-default-apps",
    ],
  },
  // Evita que whatsapp-web.js interactúe con la UI más allá de lo necesario
  webVersionCache: {
    type: "none",
  },
});
 
// ─── Eventos del cliente ──────────────────────────────────────────────────────
 
// Muestra el QR para vincular la sesión (solo la primera vez)
client.on("qr", (qr) => {
  console.log("\n📱 Escanea este QR con tu WhatsApp (una sola vez):\n");
  qrcode.generate(qr, { small: true });
});
 
// Sesión restaurada sin necesidad de QR
client.on("authenticated", () => {
  console.log("✅ Sesión autenticada correctamente");
});
 
// Cliente listo para recibir mensajes
client.on("ready", () => {
  console.log("🤖 Bot iniciado y listo");
  console.log(
    `   Assistant ID : ${process.env.ASSISTANT_ID}`
  );
  console.log(
    `   Filtro número: ${ALLOWED_NUMBERS.length > 0 ? ALLOWED_NUMBERS.join(", ") : "todos"}`
  );
  console.log(
    `   Prefijo       : ${TRIGGER_PREFIX || "(ninguno, responde a todo)"}`
  );
});
 
// Error de autenticación
client.on("auth_failure", (msg) => {
  console.error("❌ Error de autenticación:", msg);
  process.exit(1);
});
 
// Desconexión
client.on("disconnected", (reason) => {
  console.warn("⚠️  Cliente desconectado:", reason);
});
 
// ─── Procesamiento de mensajes ────────────────────────────────────────────────
client.on("message", async (msg) => {
  try {
    // Ignorar mensajes propios
    if (msg.fromMe) return;
 
    // Ignorar mensajes de grupos (opcional, quita este bloque si quieres grupos)
    const chat = await msg.getChat();
    if (chat.isGroup) return;
 
    const contactId = msg.from;
    const body = msg.body?.trim();
 
    if (!body) return;
 
    // Filtrar por número si está configurado
    if (ALLOWED_NUMBERS.length > 0 && !ALLOWED_NUMBERS.includes(contactId)) {
      console.log(`[Skip] Número no permitido: ${contactId}`);
      return;
    }
 
    // Filtrar por prefijo si está configurado
    if (TRIGGER_PREFIX && !body.startsWith(TRIGGER_PREFIX)) {
      return;
    }
 
    // Comando especial: limpiar historial
    if (body === "/reset" || body === "/nuevo") {
      clearThread(contactId);
      await msg.reply("🔄 Conversación reiniciada. ¿En qué te puedo ayudar?");
      return;
    }
 
    // Extraer el mensaje real (quitando el prefijo si existe)
    const userMessage = TRIGGER_PREFIX
      ? body.slice(TRIGGER_PREFIX.length).trim()
      : body;
 
    if (!userMessage) return;
 
    console.log(`[MSG] ${contactId}: ${userMessage.slice(0, 80)}...`);
 
    // Indicador de "escribiendo..." (no crítico, se ignora si falla)
    try { await chat.sendStateTyping(); } catch (_) {}
 
    // Llamar al Assistant
    const response = await askAssistant(contactId, userMessage);
 
    // Limpiar estado "escribiendo..."
    try { await chat.sendStatePaused(); } catch (_) {}
 
    // Responder en WhatsApp
    await msg.reply(response);
 
    console.log(`[OK] Respuesta enviada a ${contactId}`);
  } catch (error) {
    console.error("[Error] Al procesar mensaje:", error.message);
    // Limpiar estado "escribiendo..." aunque haya fallado
    try { await chat.sendStatePaused(); } catch (_) {}
  }
});
 
// ─── Iniciar cliente ──────────────────────────────────────────────────────────
console.log("🚀 Iniciando bot WhatsApp + ChatGPT...");
client.initialize();
 
// Manejo de cierre limpio
process.on("SIGINT", async () => {
  console.log("\n🛑 Cerrando bot...");
  await client.destroy();
  process.exit(0);
});
