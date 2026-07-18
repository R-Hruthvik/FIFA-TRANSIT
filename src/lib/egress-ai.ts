/**
 * AI-enhanced egress plan generation.
 *
 * Design reference: Design-20260713-production-realtime-tracking.md
 * D6 — GenAI = per-user contextual reasoning
 *     ("inject caller's user{} + nearest gates + ETA into prompt")
 * D5 — Multilingual = CROSS-CUTTING (served by LLM prompt param, free)
 *
 * Takes the structured egress plan from egress-planner.ts and enriches
 * it with AI-generated natural language instructions. The prompt injects:
 *   - User's position (anonymized)
 *   - Nearest gates + ETAs
 *   - Gate crowd levels
 *   - Transit hub info
 *   - User's language
 *   - Confidence level
 *
 * If confidence is too low (D9), the AI explicitly defers to stewards
 * rather than generating a route.
 *
 * Uses the same NVIDIA NIM primary / Gemini fallback pattern as
 * the existing chat route.
 */

import type { GateCrowd, EgressPlan } from "@/types/position";

// ── Prompt construction ────────────────────────────────────────────────

interface AIPlanContext {
  userPosition: { sector?: string; subsection?: number };
  gateCrowds: GateCrowd[];
  nearestGate: { gateId: string; etaMinutes: number };
  language: string;
  confidence: number;
  isEgressMode: boolean;
}

/**
 * Build the AI prompt for egress plan generation.
 * Injects per-user context as specified in D6.
 */
function buildEgressPrompt(ctx: AIPlanContext): string {
  const lang = ctx.language.split("-")[0];
  const mode = ctx.isEgressMode ? "POST-MATCH EGRESS" : "PRE-MATCH NAVIGATION";

  const gateInfo = ctx.gateCrowds
    .map(
      (g) =>
        `${g.gateId}: ${Math.round((g.count / g.capacityThreshold) * 100)}% capacity, ${g.confidence < 0.35 ? "LOW DATA CONFIDENCE" : "data available"}`,
    )
    .join("\n");

  const positionDesc = ctx.userPosition.sector
    ? `You are in sector ${ctx.userPosition.sector}, subsection ${ctx.userPosition.subsection}`
    : "Your exact position is being estimated";

  const prompt = `You are a multilingual stadium navigation assistant for the FIFA World Cup 2026.
Current mode: ${mode}

${positionDesc}

Gate status:
${gateInfo}

Your task: Provide a clear, concise navigation instruction in ${lang}.

Rules:
1. If ANY gate has LOW DATA CONFIDENCE, explicitly tell the user to follow steward directions — DO NOT guess.
2. Recommend the best gate (lowest capacity, closest to user).
3. Mention which gates to avoid.
4. Include walking time estimate.
5. Keep it to 1-2 sentences maximum.
6. Output ONLY the instruction text, no preamble, no formatting.`;

  return prompt;
}

/**
 * Generate an AI-enhanced instruction for the egress plan.
 * Falls back to a template-based instruction if AI is unavailable.
 */
export async function generateAIInstruction(
  ctx: AIPlanContext,
): Promise<string> {
  const prompt = buildEgressPrompt(ctx);
  const geminiKey = process.env.GEMINI_API_KEY;
  const nvidiaKey = process.env.NVIDIA_NIM_API_KEY;

  try {
    // Try Gemini first (faster for short prompts)
    if (geminiKey) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              maxOutputTokens: 120,
              temperature: 0.3,
            },
          }),
        },
      );

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text && text.length > 0) {
          return text;
        }
      }
    }

    // Fallback to NVIDIA NIM
    if (nvidiaKey) {
      const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${nvidiaKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "meta/llama-3.1-70b-instruct",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 120,
          temperature: 0.3,
          stream: false,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content?.trim();
        if (text && text.length > 0) {
          return text;
        }
      }
    }
  } catch (error) {
    console.error("AI instruction generation failed:", error);
  }

  // AI unavailable — return the structured fallback
  return `Proceed with caution to your assigned checkpoint at ${ctx.nearestGate.gateId || 'stadium exit doors'}. Est. travel window: ${ctx.nearestGate.etaMinutes || '---'} min. Follow all active steward instructions.`;
}

/**
 * Enhance an egress plan with AI-generated instruction.
 */
export async function enhancePlanWithAI(
  plan: EgressPlan,
  gateCrowds: GateCrowd[],
  userPosition?: unknown,
): Promise<EgressPlan> {
  const ctx: AIPlanContext = {
    userPosition:
      (userPosition as { sector?: string; subsection?: number }) || {},
    gateCrowds,
    nearestGate: {
      gateId: plan.gateId || "unknown",
      etaMinutes: plan.etaMinutes,
    },
    language: plan.language,
    confidence: gateCrowds.find((g) => g.gateId === plan.gateId)?.confidence ?? 0,
    isEgressMode: plan.leaveAt < Date.now() + 60 * 60_000, // within 1 hour = egress mode
  };

  const aiInstruction = await generateAIInstruction(ctx);

  return {
    ...plan,
    instruction: aiInstruction,
  };
}
