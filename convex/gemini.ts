import { action } from "./_generated/server";
import { v } from "convex/values";
import { GoogleGenAI } from "@google/genai";

const SYSTEM_INSTRUCTION = `
Ты — NutriBot, ИИ-эксперт по нутрициологии. Твоя цель — анализировать еду по фото или текстовому описанию.

Для каждого сообщения пользователя:
1. Определи блюдо/продукты.
2. Оцени следующие показатели с высокой точностью:
   - Калории (ккал)
   - Белки (г)
   - Жиры (г)
   - Углеводы (г)
   - Клетчатка (г)
   - Соотношение Омега-3 к Омега-6 (оценка, например "1:5", "Много Омега-3" или "Н/Д")
   - Тип железа (Гемовое, Негемовое, Смешанное или Незначительное)
   - Другие важные нутриенты (например, Витамин C, Магний).

3. Отвечай в дружелюбном стиле Telegram-бота на русском языке. Будь краток, но полезен.
4. ВАЖНО: Если ты определил еду и рассчитал нутриенты, ты ОБЯЗАН добавить JSON блок в самом конце сообщения, обернутый в тройные обратные кавычки.

Формат JSON должен быть строго таким:
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

Если пользователь исправляет предыдущую запись, пересчитай итоги и выведи новый JSON.
Если сообщение не связано с едой, просто отвечай как обычно без JSON.
`;

export const analyzeFood = action({
  args: {
    message: v.string(),
    imageStorageId: v.optional(v.id("_storage")),
    history: v.array(v.object({
      role: v.string(),
      text: v.string(),
    })),
    currentStats: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    // Используем ключ из переменных окружения Convex (GOOGLE_API_KEY или API_KEY)
    const apiKey = process.env.GOOGLE_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      throw new Error("API Key not configured in Convex Dashboard");
    }

    const ai = new GoogleGenAI({ apiKey: apiKey });

    // Формируем промпт
    let promptText = "";
    if (args.currentStats) {
      promptText += `${args.currentStats}\n`;
    }
    
    // История
    const historyContext = args.history.map(m => `${m.role === 'user' ? 'Пользователь' : 'Бот'}: ${m.text}`).join('\n');
    promptText += `${historyContext}\nПользователь: ${args.message}`;

    const parts: any[] = [{ text: promptText }];

    // Обработка изображения
    if (args.imageStorageId) {
      const imageUrl = await ctx.storage.getUrl(args.imageStorageId);
      if (imageUrl) {
        // Скачиваем изображение, чтобы передать в Gemini как base64
        // (Gemini Action работает на сервере, поэтому fetch работает)
        const imageResponse = await fetch(imageUrl);
        const arrayBuffer = await imageResponse.arrayBuffer();
        const base64Data = Buffer.from(arrayBuffer).toString("base64");
        
        parts.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Data
          }
        });
      }
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
          role: 'user',
          parts: parts
        },
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.7,
        }
      });

      const text = response.text || "Извините, я не смог это обработать.";
      
      // Парсинг JSON
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
      let extractedData = null;

      if (jsonMatch && jsonMatch[1]) {
        try {
          extractedData = JSON.parse(jsonMatch[1]);
        } catch (e) {
          console.error("Failed to parse JSON", e);
        }
      }

      const cleanText = text.replace(/```json[\s\S]*?```/, '').trim();

      return {
        text: cleanText,
        data: extractedData
      };

    } catch (error) {
      console.error("Gemini API Error:", error);
      throw new Error("Failed to process request");
    }
  },
});