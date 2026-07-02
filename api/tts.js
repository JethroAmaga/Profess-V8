// Proxies to ElevenLabs Text-to-Speech REST API.
// Docs: https://elevenlabs.io/docs/api-reference/text-to-speech
import { isRateLimited, isForeignOrigin, containsBannedContent } from "./_security.js";

const MAX_TEXT_CHARS = 1000;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: { message: "Method not allowed" } });
  }

  if (isForeignOrigin(req)) {
    return res.status(403).json({ error: { message: "Forbidden" } });
  }
  if (isRateLimited(req)) {
    return res.status(429).json({ error: { message: "Too many requests, please slow down" } });
  }

  const contentType = req.headers["content-type"] || "";
  if (!contentType.includes("application/json")) {
    return res.status(415).json({ error: { message: "Content-Type must be application/json" } });
  }
  const contentLength = parseInt(req.headers["content-length"] || "0", 10);
  if (contentLength > 8_000) {
    return res.status(413).json({ error: { message: "Request body too large" } });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: { message: "ELEVENLABS_API_KEY not configured" } });
  }

  try {
    const { text } = req.body || {};
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: { message: "text is required" } });
    }
    if (text.length > MAX_TEXT_CHARS) {
      return res.status(400).json({ error: { message: "text is too long" } });
    }
    if (containsBannedContent(text)) {
      return res.status(400).json({ error: { message: "text violates content policy" } });
    }

    // Default voice: "Rachel" (well-known stable public voice id). Override via env if desired.
    const rawVoiceId = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";
    const rawModelId = process.env.ELEVENLABS_MODEL_ID || "eleven_turbo_v2_5";
    const ID_RE = /^[a-zA-Z0-9_-]{8,64}$/;
    if (!ID_RE.test(rawVoiceId) || !ID_RE.test(rawModelId)) {
      console.error("Invalid ElevenLabs voice/model ID in environment");
      return res.status(500).json({ error: { message: "Voice service misconfigured" } });
    }

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${rawVoiceId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: rawModelId,
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error("ElevenLabs API error:", response.status, errData);
      return res.status(503).json({ error: { message: "Voice service unavailable" } });
    }

    const arrayBuffer = await response.arrayBuffer();
    const audioBase64 = Buffer.from(arrayBuffer).toString("base64");
    return res.status(200).json({ audio: audioBase64, format: "mpeg" });
  } catch (err) {
    console.error("tts handler error:", err);
    return res.status(500).json({ error: { message: "Internal server error" } });
  }
}
