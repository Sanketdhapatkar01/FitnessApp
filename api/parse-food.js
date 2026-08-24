// Vercel serverless function (Node.js runtime).
// Keeps the Anthropic API key server-side — never expose it in frontend code.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { text } = req.body || {};
  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "Missing 'text' in request body" });
  }

  const system = `You are a nutrition estimation engine for a food logging app. Given a natural-language food description, respond with ONLY a JSON object, no prose, no markdown fences, matching exactly this shape:
{"items":[{"name":"string","quantity":number,"unit":"string","calories":number,"protein":number,"carbs":number,"fat":number,"fiber":number,"confidence":number between 0 and 1}],"clarify":"string or null - a short clarifying question ONLY if the portion/food is too ambiguous to estimate at all, otherwise null"}
Use reasonable standard nutrition values per typical serving sizes. Round calories to nearest 5, macros to nearest 1g. Be concise.`;

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
        max_tokens: 1000,
        system,
        messages: [{ role: "user", content: text }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic API error:", errText);
      return res.status(502).json({ error: "AI service error" });
    }

    const data = await response.json();
    const raw = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n");

    const cleaned = raw.replace(/```json|```/g, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1) {
      return res.status(502).json({ error: "Could not parse AI response" });
    }
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    return res.status(200).json(parsed);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}
