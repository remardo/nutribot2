import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Функция для получения ID пользователя из Telegram WebApp
function getCurrentUserId(ctx: any, providedUserId?: string | null): string | null {
  if (providedUserId) return providedUserId;

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
  args: { userId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    // Получаем ID пользователя из Telegram WebApp
    const userId = getCurrentUserId(ctx, args.userId);
    
    let logs;
    if (!userId) {
      // Если пользователь не аутентифицирован, показываем все записи для демо
      console.log("User not authenticated, showing all logs for demo");
      logs = await ctx.db.query("dailyLogs")
        .order("desc")
        .collect();
    } else {
      // Получаем логи текущего пользователя
      logs = await ctx.db.query("dailyLogs")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .order("desc")
        .collect();
    }
    
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
    userId: v.optional(v.string()), // Telegram user ID (опционально)
    name: v.string(),
    calories: v.number(),
    protein: v.number(),
    fat: v.number(),
    carbs: v.number(),
    fiber: v.number(),
    omega3to6Ratio: v.string(),
    omega3: v.optional(v.number()),
    omega6: v.optional(v.number()),
    ironType: v.string(),
    ironHeme: v.optional(v.number()),
    ironNonHeme: v.optional(v.number()),
    importantNutrients: v.array(v.string()),
    timestamp: v.number(),
    imageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    // Если userId не передан, пытаемся получить его из контекста
    const finalUserId = args.userId || getCurrentUserId(ctx, args.userId) || undefined;
    
    const logData = {
      ...args,
      userId: finalUserId,
    };
    
    return await ctx.db.insert("dailyLogs", logData);
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
    userId: v.optional(v.string()),
    name: v.optional(v.string()),
    calories: v.optional(v.number()),
    protein: v.optional(v.number()),
    fat: v.optional(v.number()),
    carbs: v.optional(v.number()),
    fiber: v.optional(v.number()),
    omega3to6Ratio: v.optional(v.string()),
    omega3: v.optional(v.number()),
    omega6: v.optional(v.number()),
    ironType: v.optional(v.string()),
    ironHeme: v.optional(v.number()),
    ironNonHeme: v.optional(v.number()),
    importantNutrients: v.optional(v.array(v.string())),
    imageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const { id, userId, ...updates } = args;
    
    // Проверяем, что запись принадлежит текущему пользователю
    const currentUserId = getCurrentUserId(ctx, userId);
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
  args: { id: v.id("dailyLogs"), userId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    // Проверяем, что запись принадлежит текущему пользователю
    const currentUserId = getCurrentUserId(ctx, args.userId);
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

export const deleteImage = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    try {
      await ctx.storage.delete(args.storageId);
      console.log('Image successfully deleted from storage:', args.storageId);
      return true;
    } catch (error) {
      console.error('Failed to delete image from storage:', error);
      return false;
    }
  },
});

export const getUserSettings = query({
  args: { userId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = getCurrentUserId(ctx, args.userId);
    
    const defaultSettings = {
      userId,
      dailyCaloriesGoal: 2000,
      dailyProteinGoal: 100,
      dailyFiberGoal: 25,
      dailyFatGoal: 70,
      dailyCarbGoal: 250,
      goalsMode: "manual",
      weightKg: undefined,
      heightCm: undefined,
      isTrackingEnabled: false,
      updatedAt: Date.now(),
    };

    if (!userId) {
      console.log("User not authenticated, returning default settings");
      return { ...defaultSettings, userId: null };
    }

    const settings = await ctx.db.query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    
    if (!settings) {
      return defaultSettings;
    }
    
    return {
      ...defaultSettings,
      ...settings,
    };
  },
});

export const updateUserSettings = mutation({
  args: {
    userId: v.optional(v.string()),
    dailyCaloriesGoal: v.number(),
    dailyProteinGoal: v.number(),
    dailyFiberGoal: v.number(),
    dailyFatGoal: v.number(),
    dailyCarbGoal: v.number(),
    goalsMode: v.string(),
    weightKg: v.optional(v.number()),
    heightCm: v.optional(v.number()),
    isTrackingEnabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = getCurrentUserId(ctx, args.userId);
    if (!userId) {
      throw new Error("User not authenticated");
    }

    // Ищем существующие настройки
    const existingSettings = await ctx.db.query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    const { userId: _, ...userArgs } = args;
    const settingsData = {
      userId,
      ...userArgs,
      updatedAt: Date.now(),
    };

    if (existingSettings) {
      // Обновляем существующие настройки
      await ctx.db.patch(existingSettings._id, settingsData);
      return existingSettings._id;
    } else {
      // Создаем новые настройки
      return await ctx.db.insert("userSettings", settingsData);
    }
  },
});
