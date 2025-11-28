import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { ChatMessage, DailyStats } from "../types";

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

Если пользователь исправляет предыдущую запись (например, "Это было 200г, а не 100г" или "Убери сыр"), пересчитай итоги для *всего* блюда с учетом правки и выведи новый полный JSON блок.

Если сообщение не связано с едой, просто отвечай как обычно без JSON.

Контекст: Пользователь ведет дневник питания.
`;

export const sendMessageToGemini = async (
  history: ChatMessage[],
  newMessage: string,
  image?: string,
  currentStats?: DailyStats
): Promise<{ text: string; data: any | null }> => {
  try {
    // Initialize Gemini Client inside the function to ensure process.env.API_KEY is available
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const model = ai.models;
    
    // Construct prompt history
    // We limit history to last 10 messages to avoid context limits and keep it relevant
    let promptText = "";
    if (currentStats) {
        promptText += `[Текущие итоги дня: ${currentStats.totalCalories}ккал, Б:${currentStats.totalProtein}г, Ж:${currentStats.totalFat}г, У:${currentStats.totalCarbs}г]\n`;
    }
    
    const relevantHistory = history.slice(-6); 
    const historyContext = relevantHistory.map(m => `${m.role === 'user' ? 'Пользователь' : 'Бот'}: ${m.text}`).join('\n');
    
    promptText += `${historyContext}\nПользователь: ${newMessage}`;

    const parts: any[] = [{ text: promptText }];

    if (image) {
      // Extract mimeType and base64 data from Data URL
      let mimeType = 'image/jpeg';
      let data = image;

      const match = image.match(/^data:(.+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        data = match[2];
      } else if (image.includes(',')) {
         // Fallback split if regex fails but comma exists
         const split = image.split(',');
         data = split[1];
         // Try to guess mime type from header if present, otherwise default
         if (split[0].includes('png')) mimeType = 'image/png';
         else if (split[0].includes('webp')) mimeType = 'image/webp';
      }

      parts.push({
        inlineData: {
          mimeType: mimeType,
          data: data
        }
      });
    }

    const response: GenerateContentResponse = await model.generateContent({
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
    
    // Extract JSON if present
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
    let extractedData = null;

    if (jsonMatch && jsonMatch[1]) {
      try {
        extractedData = JSON.parse(jsonMatch[1]);
      } catch (e) {
        console.error("Failed to parse JSON from Gemini response", e);
      }
    }

    // Clean text by removing the JSON block to display to user
    const cleanText = text.replace(/```json[\s\S]*?```/, '').trim();

    return {
      text: cleanText,
      data: extractedData
    };

  } catch (error) {
    console.error("Gemini API Error:", error);
    return {
      text: "Произошла ошибка при анализе. Пожалуйста, проверьте API ключ или попробуйте позже.",
      data: null
    };
  }
};