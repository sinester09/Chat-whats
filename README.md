# WhatsApp Bot + ChatGPT Assistant

Bot para conectar tu **número personal de WhatsApp** con un **Assistant de OpenAI** (ChatGPT Studio).

## Requisitos

- Node.js 18+
- Cuenta de OpenAI con un Assistant creado
- Google Chrome o Chromium instalado

## Instalación

```bash
# 1. Instalar dependencias
npm install

# 2. Copiar y configurar variables de entorno
cp .env.example .env
# Editar .env con tu OPENAI_API_KEY y ASSISTANT_ID

# 3. Iniciar el bot
npm start
```

## Primera vez

Al iniciar por primera vez verás un código QR en la terminal.
Abre WhatsApp en tu celular → Dispositivos vinculados → Vincular un dispositivo → escanea el QR.

La sesión se guarda en `.wwebjs_auth/` — no tendrás que escanear de nuevo.

## Comandos disponibles (en WhatsApp)

| Mensaje | Acción |
|---------|--------|
| Cualquier texto | El bot responde vía tu Assistant |
| `/reset` o `/nuevo` | Reinicia el hilo de conversación |

## Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `OPENAI_API_KEY` | Tu API Key de OpenAI |
| `ASSISTANT_ID` | ID del Assistant (empieza con `asst_`) |
| `ALLOWED_NUMBERS` | Números que pueden usar el bot (vacío = todos) |
| `TRIGGER_PREFIX` | Prefijo requerido para activar el bot (ej: `!gpt`) |
| `TIMEOUT_MS` | Timeout en ms para respuesta de OpenAI (default: 30000) |

## Dónde encontrar tu Assistant ID

1. Ve a [platform.openai.com/assistants](https://platform.openai.com/assistants)
2. Abre tu Assistant
3. El ID aparece debajo del nombre (formato: `asst_xxxxxxxxxxxxxxxxxx`)

## Notas importantes

- El bot recuerda la conversación por contacto (un thread por número)
- Para grupos: el bot ignora mensajes de grupos por defecto
- Si quieres habilitar grupos, elimina el bloque de `chat.isGroup` en `index.js`
- ⚠️ Usar bots en WhatsApp personal viola los TOS de Meta — úsalo con responsabilidad
