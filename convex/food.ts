import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Функция для получения ID пользователя из Telegram WebApp
function getCurrentUserId(ctx: any): string | null {
  const tg = ctx.request?.headers?.get?.('x-telegram-init-data') || ctx.request?.headers?.get?.('tg-init-data');
  if (!tg) return null;

  try {
    // Парсим initData из Telegram WebApp
    const params = new URLSearchParams(tg);
    const userStr = params.get('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      return user.id?.toString() || null;
    }
  } catch (error) {
    console.error('Failed to parse Telegram user data:', error);
  }
  
  return null;
}

export const getLogs = query({
  args: {},
  handler: async (ctx) => {
    // Получаем ID пользователя из Telegram WebApp
    const userId = getCurrentUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated");
    }

    // Получаем только логи текущего пользователя
    const logs = await ctx.db.query("dailyLogs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
    
    // Генерируем URL для изображений, если они есть
    return await Promise.all(logs.map(async (log) => {
      let imageUrl = undefined;
      if (log.imageId) {
        imageUrl = await ctx.storage.getUrl(log.imageId);
      }
      return {
        ...log,
        imageUrl,
      };
    }));
  },
});

export const addLog = mutation({
  args: {
    userId: v.string(), // Telegram user ID
    name: v.string(),
    calories: v.number(),
    protein: v.number(),
    fat: v.number(),
    carbs: v.number(),
    fiber: v.number(),
    omega3to6Ratio: v.string(),
    ironType: v.string(),
    importantNutrients: v.array(v.string()),
    timestamp: v.number(),
    imageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("dailyLogs", args);
  },
});

export const updateLog = mutation({
  args: {
    id: v.id("dailyLogs"),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
  },
});

export const updateLogFull = mutation({
  args: {
    id: v.id("dailyLogs"),
    name: v.optional(v.string()),
    calories: v.optional(v.number()),
    protein: v.optional(v.number()),
    fat: v.optional(v.number()),
    carbs: v.optional(v.number()),
    fiber: v.optional(v.number()),
    omega3to6Ratio: v.optional(v.string()),
    ironType: v.optional(v.string()),
    importantNutrients: v.optional(v.array(v.string())),
    imageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    
    // Проверяем, что запись принадлежит текущему пользователю
    const currentUserId = getCurrentUserId(ctx);
    if (!currentUserId) {
      throw new Error("User not authenticated");
    }
    
    const existingLog = await ctx.db.get(id);
    if (!existingLog) {
      throw new Error("Log not found");
    }
    
    if (existingLog.userId !== currentUserId) {
      throw new Error("Unauthorized: Can only edit your own logs");
    }
    
    await ctx.db.patch(id, updates);
  },
});

export const deleteLog = mutation({
  args: { id: v.id("dailyLogs") },
  handler: async (ctx, args) => {
    // Проверяем, что запись принадлежит текущему пользователю
    const currentUserId = getCurrentUserId(ctx);
    if (!currentUserId) {
      throw new Error("User not authenticated");
    }
    
    const existingLog = await ctx.db.get(args.id);
    if (!existingLog) {
      throw new Error("Log not found");
    }
    
    if (existingLog.userId !== currentUserId) {
      throw new Error("Unauthorized: Can only delete your own logs");
    }
    
    await ctx.db.delete(args.id);
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});