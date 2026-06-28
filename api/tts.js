// Proxies to ElevenLabs Text-to-Speech REST API.
// Docs: https://elevenlabs.io/docs/api-reference/text-to-speech
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: { message: "ELEVENLABS_API_KEY not configured" } });
  }

  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: { message: "text is required" } });
    }

    // Default voice: "Rachel" (well-known stable public voice id). Override via env if desired.
    const voiceId = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return res.status(response.status).json({ error: errData.detail || errData });
    }

    const arrayBuffer = await response.arrayBuffer();
    const audioBase64 = Buffer.from(arrayBuffer).toString("base64");
    return res.status(200).json({ audio: audioBase64, format: "mpeg" });
  } catch (err) {
    return res.status(500).json({ error: { message: "Internal server error" } });
  }
}
