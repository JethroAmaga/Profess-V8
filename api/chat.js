import { isRateLimited, isForeignOrigin, containsBannedContent } from "./_security.js";

const MAX_MESSAGES = 50;
const MAX_CONTENT_CHARS = 6000;
const MAX_SYSTEM_CHARS = 16000;

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

  // Middle ground: deepseek/z-ai follow the [ROLE]/[MODE]/[INNER] tag
  // protocol well but are popular enough to hit 503/timeout constantly;
  // llama-3.1-8b/mistral-7b were stable but too weak at instruction-
  // following to obey the tag protocol. qwen2.5-7b-instruct's model ID
  // kept 404ing (guessed wrong twice — couldn't verify against NVIDIA's
  // docs directly), so instead of guessing a third ID, this stays inside
  // the meta/llama-3.1 family whose ID format already proved valid
  // (llama-3.1-8b-instruct worked, just too weak) — 70b should have much
  // better instruction-following while keeping the same proven ID
  // pattern. deepseek stays as fallback. NVIDIA_MODEL env override is
  // intentionally ignored here so a stale env var can't override this
  // choice.
  const PRIMARY_MODEL = "meta/llama-3.1-70b-instruct";
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
      // Some NIM models occasionally return a malformed/non-JSON body (seen
      // from qwen) even with stream:false — parse the raw text ourselves so
      // a parse failure can be treated as a retryable error instead of an
      // uncaught exception that skips the fallback model entirely.
      const raw = await response.text();
      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        throw new Error(`Non-JSON response from ${model} (status ${response.status})`);
      }
      return { response, data };
    } finally {
      clearTimeout(timeout);
    }
  }

  const nvMessages = [
    ...(system ? [{ role: "system", content: system }] : []),
    ...messages,
  ];

  // Calls a model and reports whether the caller should retry with the
  // fallback model: 503/429/500, a timeout (model hung past 25s), and any
  // other thrown error (e.g. a malformed/non-JSON body) are all treated as
  // retryable, so a single bad response from the primary never skips the
  // fallback model by bubbling up as an uncaught exception.
  async function attempt(model) {
    try {
      const { response, data } = await callNvidia(model, nvMessages);
      if (!response.ok && [503, 429, 500].includes(response.status)) {
        console.error(`NVIDIA ${model} unavailable (${response.status})`);
        return { retry: true };
      }
      return { retry: false, response, data };
    } catch (err) {
      if (err.name === "AbortError") {
        console.error(`NVIDIA ${model} timed out after 25s`);
        return { retry: true, timedOut: true };
      }
      console.error(`NVIDIA ${model} request failed: ${err.message}`);
      return { retry: true };
    }
  }

  try {
    let model = PRIMARY_MODEL;
    let result = await attempt(model);

    if (result.retry && model !== FALLBACK_MODEL) {
      console.error(`Retrying with fallback model ${FALLBACK_MODEL}`);
      model = FALLBACK_MODEL;
      result = await attempt(model);
    }

    if (result.retry) {
      return res.status(result.timedOut ? 504 : 503).json({ error: { message: "AI service unavailable" } });
    }

    const { response, data } = result;
    if (!response.ok) {
      console.error("NVIDIA API error:", response.status, data);
      return res.status(response.status).json({ error: { message: "AI service unavailable" } });
    }

    const text = data.choices?.[0]?.message?.content || "";

    // Output guardrail: even though the system prompt instructs the model not
    // to produce this content, it can be jailbroken — this deterministic
    // check blocks the response from ever reaching the client/TTS regardless.
    if (containsBannedContent(text)) {
      console.error("Blocked banned content in model output");
      return res.status(502).json({ error: { message: "Response blocked by content policy" } });
    }

    return res.status(200).json({ content: [{ type: "text", text }] });
  } catch (err) {
    console.error("chat handler error:", err);
    return res.status(500).json({ error: { message: "Internal server error" } });
  }
}
