import { isRateLimited, isForeignOrigin, containsBannedContent, containsPromptLeak } from "./_security.js";
import enFormal from "../src/prompts/en.formal.js";
import enSocial from "../src/prompts/en.social.js";
import idFormal from "../src/prompts/id.formal.js";
import idSocial from "../src/prompts/id.social.js";

const PROMPTS = {
  en: { formal: enFormal, social: enSocial },
  id: { formal: idFormal, social: idSocial },
};

const VALID_LANGS = new Set(["en", "id"]);
const VALID_MODES = new Set(["formal", "social"]);
const VALID_INTENSITIES = new Set(["comfortable", "challenging", "no_mercy"]);

const MAX_MESSAGES = 50;
const MAX_CONTENT_CHARS = 6000;

const PRIMARY_MODEL    = "qwen/qwen3.5-397b-a17b";
const FALLBACK_MODEL   = "qwen/qwen3-next-80b-a3b-instruct";
const FALLBACK_MODEL_2 = "meta/llama-3.3-70b-instruct";
const PRIMARY_TIMEOUT_MS    = 38000;
const FALLBACK_TIMEOUT_MS   = 15000;
const FALLBACK_TIMEOUT_MS_2 = 15000;

async function callNIM(apiKey, model, messages, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, max_tokens: 1000, messages }),
    });
    const raw = await response.text();
    let data;
    try { data = JSON.parse(raw); } catch {
      throw Object.assign(new Error("non-json"), { status: response.status, isNonJSON: true });
    }
    if (!response.ok) {
      throw Object.assign(new Error("api-error"), { status: response.status, data });
    }
    return data.choices?.[0]?.message?.content || "";
  } finally {
    clearTimeout(timer);
  }
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

  const contentType = req.headers["content-type"] || "";
  if (!contentType.includes("application/json")) {
    return res.status(415).json({ error: { message: "Content-Type must be application/json" } });
  }
  const contentLength = parseInt(req.headers["content-length"] || "0", 10);
  if (contentLength > 64_000) {
    return res.status(413).json({ error: { message: "Request body too large" } });
  }

  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: { message: "NVIDIA_API_KEY not configured" } });
  }

  const { lang, mode, intensity, messages } = req.body || {};

  if (!VALID_LANGS.has(lang)) {
    return res.status(400).json({ error: { message: "Invalid lang" } });
  }
  if (!VALID_MODES.has(mode)) {
    return res.status(400).json({ error: { message: "Invalid mode" } });
  }
  if (intensity != null && !VALID_INTENSITIES.has(intensity)) {
    return res.status(400).json({ error: { message: "Invalid intensity" } });
  }
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) {
    return res.status(400).json({ error: { message: "Invalid messages" } });
  }
  for (const m of messages) {
    if (!m || !["user", "assistant"].includes(m.role) || typeof m.content !== "string" || m.content.length > MAX_CONTENT_CHARS) {
      return res.status(400).json({ error: { message: "Invalid message content" } });
    }
    if (m.role === "user" && containsBannedContent(m.content)) {
      return res.status(400).json({ error: { message: "Message violates content policy" } });
    }
  }

  const rawPrompt = PROMPTS[lang][mode];
  const system = rawPrompt.replace(/\{\{INTENSITY\}\}/g, intensity || "challenging");

  const nimMessages = [{ role: "system", content: system }, ...messages];

  let text = "";
  let usedFallback = false;

  try {
    text = await callNIM(apiKey, PRIMARY_MODEL, nimMessages, PRIMARY_TIMEOUT_MS);
  } catch (primaryErr) {
    const isTimeout = primaryErr.name === "AbortError";
    const isServerError = [429, 500, 502, 503, 529].includes(primaryErr.status);
    if (isTimeout || isServerError) {
      console.error(`Primary model ${isTimeout ? "timed out" : "errored"}, trying fallback`);
      try {
        text = await callNIM(apiKey, FALLBACK_MODEL, nimMessages, FALLBACK_TIMEOUT_MS);
        usedFallback = true;
      } catch (fallbackErr) {
        const fbTimeout = fallbackErr.name === "AbortError";
        const fbServerErr = [429, 500, 502, 503, 529].includes(fallbackErr.status);
        console.error(`Fallback 1 failed: ${fbTimeout ? "timeout" : fallbackErr.message}, trying fallback 2`);
        if (fbTimeout || fbServerErr) {
          try {
            text = await callNIM(apiKey, FALLBACK_MODEL_2, nimMessages, FALLBACK_TIMEOUT_MS_2);
            usedFallback = true;
          } catch (fallback2Err) {
            console.error(`Fallback 2 also failed: ${fallback2Err.name === "AbortError" ? "timeout" : fallback2Err.message}`);
            return res.status(504).json({ error: { message: "AI service unavailable" } });
          }
        } else {
          return res.status(504).json({ error: { message: "AI service unavailable" } });
        }
      }
    } else if (primaryErr.isNonJSON) {
      console.error(`Non-JSON response from NVIDIA NIM (status ${primaryErr.status})`);
      return res.status(502).json({ error: { message: "AI service unavailable" } });
    } else {
      console.error("NVIDIA NIM API error:", primaryErr.status, primaryErr.data);
      const status = [429, 500, 503, 529].includes(primaryErr.status) ? 503 : (primaryErr.status || 500);
      return res.status(status).json({ error: { message: "AI service unavailable" } });
    }
  }

  if (usedFallback) console.log("Served by fallback model:", FALLBACK_MODEL);

  if (containsBannedContent(text)) {
    console.error("Blocked banned content in model output");
    return res.status(502).json({ error: { message: "Response blocked by content policy" } });
  }
  if (containsPromptLeak(text, system)) {
    console.error("Blocked system prompt leak in model output");
    return res.status(502).json({ error: { message: "Response blocked by content policy" } });
  }

  return res.status(200).json({ content: [{ type: "text", text }] });
}
