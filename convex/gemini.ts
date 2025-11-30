"use node";
/// <reference types="node" />

import { action } from "./_generated/server";
import { v } from "convex/values";

const SYSTEM_INSTRUCTION = `
Ty — NutriBot, AI-nutriciolog. Tvoya tsel: raspoznat' blyudo i vydat' polnyy nutri-analiz v JSON.

Vsegda vozvrashchay (chisla dazhe dlya minimal'nyh znacheniy; esli nutritientov net — 0, esli est' sledy — minimum 0.1):
- name (stroka)
- calories (kkal)
- protein, fat, carbs, fiber (g)
- omega3 (g)
- omega6 (g)
- omega3to6Ratio (stroka, naprimer "1:4" ili "n/d")
- ironHeme (mg)
- ironNonHeme (mg)
- ironType ("gemovoe" | "negemovoe" | "smeshannoe" | "neizvestno")
- importantNutrients (massiv strok)
- isCorrection (true/false)
- originalName (stroka, esli korrektirovka)

Opredeli, eto korrektsiya ili net (slova "ispravi", "ne to", "zameni"). Esli korrektsiya — isCorrection: true i originalName predydushchego blyuda, inache isCorrection: false.

Format otveta, esli blyudo raspoznano: snachala kratkiy kommentarij, zatem JSON strogo s etimi polyami. Primer:
```json
{
  "name": "Primer blyuda",
  "calories": 120,
  "protein": 8,
  "fat": 5,
  "carbs": 10,
  "fiber": 2,
  "omega3": 0.2,
  "omega6": 1.1,
  "omega3to6Ratio": "1:5",
  "ironHeme": 0.0,
  "ironNonHeme": 0.6,
  "ironType": "negemovoe",
  "importantNutrients": ["vitamin C"],
  "isCorrection": false,
  "originalName": ""
}
```
Esli blyudo ne raspoznano — napishi ob etom tekstom, bez JSON.
`;

const MODEL = "gemini-2.0-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
};

const extractText = (resp: GeminiResponse) => {
  const parts = resp.candidates?.[0]?.content?.parts || [];
  return parts
    .map((p) => p.text || "")
    .join("")
    .trim();
};

export const analyzeFood = action({
  args: {
    message: v.string(),
    imageStorageId: v.optional(v.id("_storage")),
    history: v.array(
      v.object({
        role: v.string(),
        text: v.string(),
      })
    ),
    currentStats: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const apiKey =
      process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      throw new Error("API Key not configured in Convex Dashboard");
    }

    let promptText = "";
    if (args.currentStats) {
      promptText += `${args.currentStats}\n`;
    }
    const historyContext = args.history
      .map((m) => `${m.role === "user" ? "Пользователь" : "Бот"}: ${m.text}`)
      .join("\n");
    promptText += `${historyContext}\nПользователь: ${args.message}`;

    const parts: Array<Record<string, unknown>> = [
      { text: `${SYSTEM_INSTRUCTION}\n\n${promptText}` },
    ];

    if (args.imageStorageId) {
      const imageUrl = await ctx.storage.getUrl(args.imageStorageId);
      if (imageUrl) {
        const imageResponse = await fetch(imageUrl);
        const arrayBuffer = await imageResponse.arrayBuffer();
        const base64Data = Buffer.from(arrayBuffer).toString("base64");

        parts.push({
          inline_data: {
            mime_type: "image/jpeg",
            data: base64Data,
          },
        });
      }
    }

    try {
      const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          safetySettings: [],
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Gemini API error: ${response.status} ${body}`);
      }

      const json = (await response.json()) as GeminiResponse;
      const text = extractText(json) || "Извини, я не смог это обработать.";

      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
      let extractedData = null;

      if (jsonMatch && jsonMatch[1]) {
        try {
          extractedData = JSON.parse(jsonMatch[1]);
        } catch (e) {
          console.error("Failed to parse JSON", e);
        }
      }

      const cleanText = text.replace(/```json[\s\S]*?```/, "").trim();

      return {
        text: cleanText,
        data: extractedData,
      };
    } catch (error) {
      console.error("Gemini API Error:", error);
      throw new Error("Failed to process request");
    }
  },
});
