export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: { message: "NVIDIA_API_KEY not configured" } });
  }

  try {
    const { system, messages } = req.body;
    const model = process.env.NVIDIA_MODEL || "deepseek-ai/deepseek-v4-pro";

    const nvMessages = [
      ...(system ? [{ role: "system", content: system }] : []),
      ...messages,
    ];

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    let response;
    try {
      response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
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
    } finally {
      clearTimeout(timeout);
    }

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data.error || data });
    }

    const text = data.choices?.[0]?.message?.content || "";
    return res.status(200).json({ content: [{ type: "text", text }] });
  } catch (err) {
    if (err.name === "AbortError") {
      return res.status(504).json({ error: { message: "NVIDIA API timed out after 25s" } });
    }
    return res.status(500).json({ error: { message: "Internal server error" } });
  }
}
