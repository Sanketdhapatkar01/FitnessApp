// Vercel serverless function (Node.js runtime).
// Keeps the Anthropic API key server-side — never expose it in frontend code.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { messages, context } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "Missing 'messages' in request body" });
  }

  const c = context || {};
  const system = `You are a warm, practical AI nutrition coach inside a fitness app. Be encouraging, concise (2-5 short sentences or a short list), and never judgmental. This is general fitness guidance, not medical advice — say so only if genuinely relevant.
User goal: ${c.goal || "unspecified"}.
Daily targets: ${c.targets?.calories ?? "?"} kcal, ${c.targets?.protein ?? "?"}g protein, ${c.targets?.carbs ?? "?"}g carbs, ${c.targets?.fat ?? "?"}g fat.
Consumed so far today: ${c.consumed?.calories ?? 0} kcal, ${c.consumed?.protein ?? 0}g protein, ${c.consumed?.carbs ?? 0}g carbs, ${c.consumed?.fat ?? 0}g fat.
Today's meals: ${(c.todaysMeals || []).join(" | ") || "none yet"}.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 500,
        system,
        messages: messages.map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.text,
        })),
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic API error:", errText);
      return res.status(502).json({ error: "AI service error" });
    }

    const data = await response.json();
    const reply = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n");

    return res.status(200).json({ reply });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}
