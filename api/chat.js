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

    const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: nvMessages,
        max_tokens: 1000,
        stream: false,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data.error || data });
    }

    const text = data.choices?.[0]?.message?.content || "";
    return res.status(200).json({ content: [{ type: "text", text }] });
  } catch (err) {
    return res.status(500).json({ error: { message: "Internal server error" } });
  }
}
