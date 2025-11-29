import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  dailyLogs: defineTable({
    userId: v.string(), // Telegram user ID для привязки к аккаунту
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
    note: v.optional(v.string()),
    imageId: v.optional(v.id("_storage")),
  }).index("by_user_timestamp", ["userId", "timestamp"])
   .index("by_user", ["userId"]),
   
  userSettings: defineTable({
    userId: v.string(), // Telegram user ID
    dailyCaloriesGoal: v.number(), // Дневная цель по калориям
    dailyProteinGoal: v.number(), // Дневная цель по белкам (г)
    dailyFiberGoal: v.number(), // Дневная цель по клетчатке (г)
    isTrackingEnabled: v.boolean(), // Включен ли отслеживание прогресса
    updatedAt: v.number(), // Время последнего обновления
  }).index("by_user", ["userId"]),
});