const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { words } = await req.json();
    if (!words || !Array.isArray(words) || words.length === 0) {
      return new Response(JSON.stringify({ error: "No words provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const wordList = words.map((w: Record<string, string>, i: number) =>
      `[${i}] ${w.original} → ${w.translated}${w.pinyin ? ` (${w.pinyin})` : ""}`
    ).join("\n");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        messages: [
          {
            role: "system",
            content: `You are a linguistics expert. Classify each word by part of speech and topic/theme. Be precise and consistent.

Part of speech categories: noun, verb, adjective, adverb, measure_word, preposition, conjunction, interjection, particle, pronoun, numeral, other
Topic categories: food, family, travel, body, nature, time, numbers, education, work, emotions, clothing, housing, health, sports, technology, weather, animals, colors, daily_life, social, other`,
          },
          { role: "user", content: `Classify these words:\n${wordList}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "classify_words",
            description: "Classify words by part of speech and topic",
            parameters: {
              type: "object",
              properties: {
                classifications: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      index: { type: "integer", description: "0-based word index" },
                      pos: { type: "string", description: "Part of speech" },
                      topic: { type: "string", description: "Topic/theme category" },
                    },
                    required: ["index", "pos", "topic"],
                  },
                },
              },
              required: ["classifications"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "classify_words" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again later" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI gateway error:", response.status, await response.text());
      return new Response(JSON.stringify({ error: "Classification failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const result = typeof toolCall.function.arguments === "string"
        ? JSON.parse(toolCall.function.arguments)
        : toolCall.function.arguments;
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ classifications: [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("classify-words error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
