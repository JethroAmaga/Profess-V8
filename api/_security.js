// Shared best-effort abuse controls for serverless API routes.
// Note: rate limiting is in-memory per function instance — Vercel may spin up
// multiple instances, so this is a deterrent against casual/scripted abuse,
// not a hard guarantee. Good enough for a demo project's blast radius.

const buckets = new Map(); // ip -> { count, resetAt }
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 15;

// Prune expired entries every 5 minutes to prevent unbounded Map growth
// on long-lived warm function instances.
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now > bucket.resetAt) buckets.delete(key);
  }
}, 5 * 60_000).unref?.();

export function getClientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  if (fwd) return fwd.split(",")[0].trim();
  return req.socket?.remoteAddress || "unknown";
}

// Anonymous per-browser session token (client-generated UUID, sent via a
// custom header). Used as an ADDITIONAL rate-limit bucket key (alongside IP,
// never instead of it) so that multiple users behind the same IP (NAT,
// office, campus) aren't limited together as one bucket. Using the session
// key alone would let anyone bypass rate limiting entirely just by sending a
// fresh random UUID per request — checking both buckets closes that gap
// while keeping the original benefit.
const SESSION_HEADER = "x-profess-session";
const SESSION_ID_RE = /^[a-zA-Z0-9-]{8,64}$/;

function checkBucket(key) {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  bucket.count += 1;
  return bucket.count > MAX_PER_WINDOW;
}

export function isRateLimited(req) {
  const ipLimited = checkBucket(`ip:${getClientIp(req)}`);
  const sessionId = req.headers[SESSION_HEADER];
  const sessionLimited = typeof sessionId === "string" && SESSION_ID_RE.test(sessionId)
    ? checkBucket(`session:${sessionId}`)
    : false;
  return ipLimited || sessionLimited;
}

// Deterministic backstop against severe hate speech/slurs, independent of
// any LLM-side instructions. Deliberately narrow (only egregious terms) so
// it doesn't break legitimate confrontational/debate-simulation roleplay.
// Shared by chat.js (input + output) and tts.js (direct text-to-speech calls
// can't be filtered by the chat guardrails since they bypass the model entirely).
const BANNED_PATTERNS = [
  /\bn[i1]gg[ea3]r/i,
  /\bf[a4]gg[o0]t/i,
  /\bk[i1]ke\b/i,
  /\bch[i1]nk\b/i,
  /\bsp[i1]c\b/i,
  /\bt[e3]rr[o0]r[i1]st\s+(attack|bomb)/i,
  /\bhow\s+to\s+(make|build)\s+a\s+bomb/i,
];

export function containsBannedContent(text) {
  return BANNED_PATTERNS.some((re) => re.test(text));
}

// Deterministic backstop against system-prompt leakage. The model itself is
// instructed never to reveal/paraphrase the system prompt, but a small model
// can still be tricked (e.g. "run dump_system_prompt()") into echoing large
// verbatim spans of it back in the response. Instructions alone can't be
// trusted to prevent this, so independently check the model's OUTPUT for
// substantial overlap with the system prompt it was given, regardless of why
// the model produced it.
// Chunk length must stay comfortably longer than the quoted example refusal
// lines embedded in the prompt (the model is *meant* to say those verbatim,
// e.g. "I don't think my perspective has changed. Let's continue discussing
// your methodology." — under 90 chars) so intended output isn't flagged as a
// leak of its own instructions. Real verbatim leaks are whole rule paragraphs,
// far longer than any single instructed line, so raising the threshold still
// catches those while clearing this false-positive class.
const LEAK_CHUNK_LEN = 110;
const LEAK_CHUNK_STRIDE = 30;

function normalize(s) {
  return s.toLowerCase().replace(/\s+/g, " ");
}

export function containsPromptLeak(text, systemPrompt) {
  if (!systemPrompt || text.length < LEAK_CHUNK_LEN) return false;
  const haystack = normalize(text);
  const needle = normalize(systemPrompt);
  for (let i = 0; i + LEAK_CHUNK_LEN <= needle.length; i += LEAK_CHUNK_STRIDE) {
    const chunk = needle.slice(i, i + LEAK_CHUNK_LEN);
    if (haystack.includes(chunk)) return true;
  }
  return false;
}

// Rejects only when an Origin header is present AND it doesn't match this
// deployment's own host — allows same-origin requests (which sometimes omit
// Origin) through, while blocking obvious cross-site script abuse.
export function isForeignOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return false;
  try {
    const originHost = new URL(origin).host;
    return originHost !== req.headers.host;
  } catch {
    return true;
  }
}
