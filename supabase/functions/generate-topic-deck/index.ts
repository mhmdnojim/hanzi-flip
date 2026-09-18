import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

interface Body {
  topic: string;
  count: number;
  frontLanguage: string;
  backLanguage: string;
  /** e.g. "Pinyin" for Chinese, "Transliteration" for Arabic — empty when the script is Latin */
  romanizationLabel?: string;
}

interface GeneratedWord {
  front: string;
  romanization?: string;
  back: string;
  pos?: string;
}

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
    const topic = (body?.topic || "").trim();
    const count = Math.min(Math.max(Math.round(body?.count || 30), 5), 100);
    if (!topic || !body?.frontLanguage || !body?.backLanguage) {
      return new Response(JSON.stringify({ error: "topic, frontLanguage and backLanguage are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const wantsRomanization = !!body.romanizationLabel;
    const userPrompt =
      `Create a vocabulary flashcard deck about the topic "${topic}".\n` +
      `Generate exactly ${count} useful, common words or short phrases related to this topic, ordered from most essential to more specific.\n` +
      `For each entry provide:\n` +
      `- "front": the word in ${body.frontLanguage} (native script)\n` +
      (wantsRomanization
        ? `- "romanization": the ${body.romanizationLabel} of the front word (Latin letters)\n`
        : `- "romanization": "" (empty string)\n`) +
      `- "back": the translation in ${body.backLanguage} (concise, most common meaning)\n` +
      `- "pos": part of speech in English, one word (noun, verb, adjective, phrase, ...)\n\n` +
      `Return STRICT JSON only: {"words":[{"front":"...","romanization":"...","back":"...","pos":"..."}]}. No prose, no markdown fences.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        reasoning_effort: "low",
        max_completion_tokens: Math.min(16000, 300 + count * 60),
        messages: [
          { role: "system", content: "You are a precise language-teaching lexicographer. Reply with strict JSON only — no prose, no markdown fences." },
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
      return new Response(JSON.stringify({ error: "Rate limit — please try again in a moment" }), {
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
    const cleaned = content.replace(/^```(?:json)?/i, "").replace(/```\s*$/i, "").trim();
    let parsed: { words?: GeneratedWord[] } = {};
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const m = cleaned.match(/\{[\s\S]*\}/);
      if (m) {
        try { parsed = JSON.parse(m[0]); } catch { /* ignore */ }
      }
    }
    const words = (Array.isArray(parsed?.words) ? parsed.words : [])
      .filter((w) => w && typeof w.front === "string" && typeof w.back === "string" && w.front.trim() && w.back.trim())
      .slice(0, count)
      .map((w) => ({
        front: w.front.trim(),
        romanization: (w.romanization || "").trim(),
        back: w.back.trim(),
        pos: (w.pos || "").trim(),
      }));

    if (!words.length) {
      return new Response(JSON.stringify({ error: "The AI returned no usable words — please try a different topic" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ words }), {
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
