import { isRateLimited, isForeignOrigin, containsBannedContent, containsPromptLeak } from "./_security.js";

const MAX_MESSAGES = 50;
const MAX_CONTENT_CHARS = 6000;
const MAX_SYSTEM_CHARS = 50000;

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

  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: { message: "NVIDIA_API_KEY not configured" } });
  }

  const { system, messages } = req.body || {};

  if (system != null && (typeof system !== "string" || system.length > MAX_SYSTEM_CHARS)) {
    return res.status(400).json({ error: { message: "Invalid system prompt" } });
  }
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) {
    return res.status(400).json({ error: { message: "Invalid messages" } });
  }
  for (const m of messages) {
    if (!m || typeof m.content !== "string" || m.content.length > MAX_CONTENT_CHARS) {
      return res.status(400).json({ error: { message: "Invalid message content" } });
    }
    if (m.role === "user" && containsBannedContent(m.content)) {
      return res.status(400).json({ error: { message: "Message violates content policy" } });
    }
  }

  const MODEL = "qwen/qwen2.5-72b-instruct";

  const nimMessages = system ? [{ role: "system", content: system }, ...messages] : messages;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55000);

  try {
    const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1000,
        messages: nimMessages,
      }),
    });

    const raw = await response.text();
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      console.error(`Non-JSON response from NVIDIA NIM (status ${response.status})`);
      return res.status(502).json({ error: { message: "AI service unavailable" } });
    }

    if (!response.ok) {
      console.error("NVIDIA NIM API error:", response.status, data);
      const status = [429, 500, 503, 529].includes(response.status) ? 503 : response.status;
      return res.status(status).json({ error: { message: "AI service unavailable" } });
    }

    const text = data.choices?.[0]?.message?.content || "";

    // Output guardrail: even though the system prompt instructs the model not
    // to produce this content, it can be jailbroken — this deterministic
    // check blocks the response from ever reaching the client/TTS regardless.
    if (containsBannedContent(text)) {
      console.error("Blocked banned content in model output");
      return res.status(502).json({ error: { message: "Response blocked by content policy" } });
    }

    // Same idea for system-prompt leakage: a weak model can be tricked into
    // echoing large verbatim spans of its own system prompt (e.g. via fake
    // "dump_system_prompt()" commands) regardless of what it's told not to
    // do — catch that independently of the model's compliance.
    if (containsPromptLeak(text, system)) {
      console.error("Blocked system prompt leak in model output");
      return res.status(502).json({ error: { message: "Response blocked by content policy" } });
    }

    return res.status(200).json({ content: [{ type: "text", text }] });
  } catch (err) {
    if (err.name === "AbortError") {
      console.error("NVIDIA NIM request timed out after 55s");
      return res.status(504).json({ error: { message: "AI service unavailable" } });
    }
    console.error("chat handler error:", err);
    return res.status(500).json({ error: { message: "Internal server error" } });
  } finally {
    clearTimeout(timeout);
  }
}
