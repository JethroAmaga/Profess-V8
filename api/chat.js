import { isRateLimited, isForeignOrigin } from "./_security.js";

const MAX_MESSAGES = 50;
const MAX_CONTENT_CHARS = 6000;
const MAX_SYSTEM_CHARS = 16000;

// Deterministic backstop against severe hate speech/slurs, independent of
// the LLM's own "USER CONDUCT" system-prompt instructions. Deliberately
// narrow (only egregious terms) so it doesn't break legitimate confrontational
// or debate-simulation roleplay, which this app's characters rely on.
const BANNED_PATTERNS = [
  /\bn[i1]gg[ea3]r/i,
  /\bf[a4]gg[o0]t/i,
  /\bk[i1]ke\b/i,
  /\bch[i1]nk\b/i,
  /\bsp[i1]c\b/i,
  /\bt[e3]rr[o0]r[i1]st\s+(attack|bomb)/i,
  /\bhow\s+to\s+(make|build)\s+a\s+bomb/i,
];

function containsBannedContent(text) {
  return BANNED_PATTERNS.some((re) => re.test(text));
}

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

  // Fallback model used when the primary model's worker pool is saturated
  // (503) or rate-limited (429) — NVIDIA NIM runs each model on a separate
  // worker pool, so the fallback often has capacity even when the primary doesn't.
  const FALLBACK_MODEL = "deepseek-ai/deepseek-v4-pro";

  async function callNvidia(model, nvMessages) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    try {
      const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: nvMessages,
          max_tokens: 1000,
          stream: false,
          // Disable extended chain-of-thought reasoning on DeepSeek's
          // "thinking" models — without this, generation can take minutes.
          // GLM doesn't use this param, so only send it for DeepSeek models.
          ...(model.includes("deepseek") ? { chat_template_kwargs: { thinking: false } } : {}),
        }),
      });
      const data = await response.json();
      return { response, data };
    } finally {
      clearTimeout(timeout);
    }
  }

  try {
    let model = process.env.NVIDIA_MODEL || FALLBACK_MODEL;

    const nvMessages = [
      ...(system ? [{ role: "system", content: system }] : []),
      ...messages,
    ];

    let { response, data } = await callNvidia(model, nvMessages);

    if (!response.ok && (response.status === 503 || response.status === 429) && model !== FALLBACK_MODEL) {
      console.error(`NVIDIA ${model} unavailable (${response.status}), retrying with fallback model ${FALLBACK_MODEL}`);
      model = FALLBACK_MODEL;
      ({ response, data } = await callNvidia(model, nvMessages));
    }

    if (!response.ok) {
      console.error("NVIDIA API error:", response.status, data);
      return res.status(response.status).json({ error: { message: "AI service unavailable" } });
    }

    const text = data.choices?.[0]?.message?.content || "";

    // Output guardrail: even though the system prompt instructs z-ai not to
    // produce this content, the model can be jailbroken — this deterministic
    // check blocks the response from ever reaching the client/TTS regardless.
    if (containsBannedContent(text)) {
      console.error("Blocked banned content in model output");
      return res.status(502).json({ error: { message: "Response blocked by content policy" } });
    }

    return res.status(200).json({ content: [{ type: "text", text }] });
  } catch (err) {
    if (err.name === "AbortError") {
      return res.status(504).json({ error: { message: "NVIDIA API timed out after 25s" } });
    }
    console.error("chat handler error:", err);
    return res.status(500).json({ error: { message: "Internal server error" } });
  }
}
