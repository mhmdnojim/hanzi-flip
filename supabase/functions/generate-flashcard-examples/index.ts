import { corsHeaders } from "@supabase/supabase-js/cors";

interface WordPair { original: string; translated: string }
interface Body { words: WordPair[]; language?: string }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI gateway not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as Body;
    if (!body || !Array.isArray(body.words) || body.words.length === 0) {
      return new Response(JSON.stringify({ error: "words array required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cap batch size to keep responses fast
    const words = body.words.slice(0, 60);
    const language = body.language || "the original language";

    const userPrompt =
      `For each vocabulary entry below, write ONE short, natural example sentence in ${language} that uses the original word naturally (max ~15 words, simple register, no quotes around the sentence).\n\n` +
      `Return STRICT JSON of the form: {"examples":[{"word":"...","sentence":"..."}]} — one item per input word, in the same order.\n\n` +
      `Words:\n` +
      words.map((w, i) => `${i + 1}. ${w.original} = ${w.translated}`).join("\n");

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a concise language tutor. Reply with strict JSON only — no prose, no markdown fences." },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (aiRes.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiRes.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiRes.ok) {
      const txt = await aiRes.text();
      return new Response(JSON.stringify({ error: "AI request failed", detail: txt }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ai = await aiRes.json();
    const content: string = ai?.choices?.[0]?.message?.content ?? "";
    // Strip optional fences just in case
    const cleaned = content.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
    let parsed: { examples?: { word: string; sentence: string }[] } = {};
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      // Try to extract JSON object substring
      const m = cleaned.match(/\{[\s\S]*\}$/);
      if (m) {
        try { parsed = JSON.parse(m[0]); } catch { /* ignore */ }
      }
    }
    const examples = Array.isArray(parsed?.examples) ? parsed.examples : [];

    return new Response(JSON.stringify({ examples }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});