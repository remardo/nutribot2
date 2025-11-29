"use node";
/// <reference types="node" />

import { action } from "./_generated/server";
import { v } from "convex/values";

const SYSTEM_INSTRUCTION = `
Ты — NutriBot, ИИ-эксперт по нутрициологии. Цель: анализировать еду по фото или тексту и выдавать точные нутриенты.

Для каждого запроса пользователя:
1) Определи блюдо/продукты.
2) Оцени показатели:
   - Калории (ккал)
   - Белки (г)
   - Жиры (г)
   - Углеводы (г)
   - Клетчатка (г)
   - Соотношение Омега-3 к Омега-6 (например «1:5», «Много Омега-3» или «Н/Д»)
   - Тип железа (Гемовое, Негемовое, Смешанное или Незначительное)
   - Важные нутриенты (например, Витамин C, Магний)
3) Отвечай дружелюбно и кратко на русском.
4) ВАЖНО: если определил еду — добавь JSON в конце ответа, в тройных бэктиках, строго по шаблону:
\`\`\`json
{
  "name": "Название блюда",
  "calories": 0,
  "protein": 0,
  "fat": 0,
  "carbs": 0,
  "fiber": 0,
  "omega3to6Ratio": "1:4",
  "ironType": "Негемовое",
  "importantNutrients": ["Витамин А", "Кальций"]
}
\`\`\`
Если запрос не про еду — отвечай без JSON.
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
