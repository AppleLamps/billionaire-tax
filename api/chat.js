// Vercel Serverless Function for Bill Chat
// This keeps the xAI API key secure on the server side

export default async function handler(req, res) {
    // CORS headers - set these first
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    // Only allow POST requests
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const apiKey = process.env.XAI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: "API key not configured" });
    }

    try {
        const { messages } = req.body;

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: "Invalid request: messages array required" });
        }

        const response = await fetch("https://api.x.ai/v1/responses", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: "grok-4-1-fast",
                input: messages,
                tools: [
                    { type: "web_search" },
                    { type: "x_search" }
                ],
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return res.status(response.status).json({
                error: errorData.error?.message || `API error: ${response.status}`,
            });
        }

        const data = await response.json();

        // Extract the assistant's response
        let assistantMessage = "";
        if (data.output) {
            for (const item of data.output) {
                if (item.type === "message" && item.content) {
                    for (const contentItem of item.content) {
                        if (contentItem.type === "output_text" || contentItem.type === "text") {
                            assistantMessage += contentItem.text;
                        }
                    }
                }
            }
        }

        if (!assistantMessage && data.choices?.[0]?.message?.content) {
            assistantMessage = data.choices[0].message.content;
        }

        return res.status(200).json({
            message: assistantMessage || "I apologize, but I couldn't generate a response.",
            citations: data.citations || [],
        });
    } catch (error) {
        console.error("Chat API error:", error);
        return res.status(500).json({
            error: error.message || "Internal server error",
        });
    }
}
