const OpenAI = require("openai");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── Modo: "assistant" si hay ASSISTANT_ID, "chat" si no ─────────────────────
const MODE = process.env.ASSISTANT_ID ? "assistant" : "chat";

console.log(
  `[OpenAI] Modo: ${MODE === "assistant"
    ? `Assistant API (${process.env.ASSISTANT_ID})`
    : `Chat Completions API (${process.env.CHAT_MODEL || "gpt-4o"})`
  }`
);

// ─── Almacenamiento de contexto por contacto ──────────────────────────────────

// Modo assistant: threadId por contacto
const threads = new Map();

// Modo chat: historial de mensajes por contacto
const histories = new Map();

// ─── Modo Assistant (con agente en ChatGPT Studio) ────────────────────────────

async function askViaAssistant(contactId, userMessage) {
  let threadId = threads.get(contactId);

  if (!threadId) {
    const thread = await openai.beta.threads.create();
    threadId = thread.id;
    threads.set(contactId, threadId);
    console.log(`[Assistant] Nuevo thread ${threadId} para ${contactId}`);
  }

  await openai.beta.threads.messages.create(threadId, {
    role: "user",
    content: userMessage,
  });

  const run = await openai.beta.threads.runs.createAndPoll(
    threadId,
    { assistant_id: process.env.ASSISTANT_ID },
    { timeout: parseInt(process.env.TIMEOUT_MS || "30000") }
  );

  if (run.status !== "completed") {
    throw new Error(`Run finalizado con estado: ${run.status}`);
  }

  const messages = await openai.beta.threads.messages.list(threadId, {
    order: "desc",
    limit: 1,
  });

  const lastMessage = messages.data[0];

  if (!lastMessage || lastMessage.role !== "assistant") {
    throw new Error("No se recibió respuesta del Assistant");
  }

  return lastMessage.content
    .filter((block) => block.type === "text")
    .map((block) => block.text.value)
    .join("\n");
}

// ─── Modo Chat Completions (sin agente, ChatGPT directo) ──────────────────────

async function askViaChat(contactId, userMessage) {
  const model = process.env.CHAT_MODEL || "gpt-4o";
  const systemPrompt =
    process.env.SYSTEM_PROMPT ||
    "Eres un asistente útil que responde por WhatsApp. Sé conciso y claro.";

  // Recuperar o inicializar historial del contacto
  if (!histories.has(contactId)) {
    histories.set(contactId, [
      { role: "system", content: systemPrompt },
    ]);
  }

  const history = histories.get(contactId);

  // Agregar mensaje del usuario
  history.push({ role: "user", content: userMessage });

  // Llamar a Chat Completions
  const completion = await openai.chat.completions.create({
    model,
    messages: history,
    max_tokens: parseInt(process.env.MAX_TOKENS || "1000"),
  });

  const reply = completion.choices[0].message.content;

  // Guardar respuesta en el historial para mantener contexto
  history.push({ role: "assistant", content: reply });

  // Limitar historial a últimos 20 turnos (evitar tokens excesivos)
  const MAX_HISTORY = 42; // system + 20 pares user/assistant
  if (history.length > MAX_HISTORY) {
    // Siempre conservar el system prompt en [0]
    history.splice(1, history.length - MAX_HISTORY);
  }

  console.log(`[Chat] Modelo ${model} · tokens usados: ${completion.usage?.total_tokens}`);

  return reply;
}

// ─── Función pública principal ────────────────────────────────────────────────

/**
 * Envía un mensaje a OpenAI y devuelve la respuesta.
 * Usa Assistant API si ASSISTANT_ID está definido, Chat Completions si no.
 *
 * @param {string} contactId   - ID de WhatsApp (ej: 51987654321@c.us)
 * @param {string} userMessage - Texto del mensaje
 * @returns {Promise<string>}  - Respuesta de OpenAI
 */
async function askAssistant(contactId, userMessage) {
  if (MODE === "assistant") {
    return askViaAssistant(contactId, userMessage);
  } else {
    return askViaChat(contactId, userMessage);
  }
}

/**
 * Limpia el historial/thread de un contacto (reinicia la conversación)
 */
function clearThread(contactId) {
  threads.delete(contactId);
  histories.delete(contactId);
  console.log(`[OpenAI] Contexto eliminado para ${contactId}`);
}

module.exports = { askAssistant, clearThread, MODE };
