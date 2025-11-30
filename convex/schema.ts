import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  dailyLogs: defineTable({
    userId: v.optional(v.string()), // Telegram user ID для привязки к аккаунту (опционально для обратной совместимости)
    name: v.string(),
    calories: v.number(),
    protein: v.number(),
    fat: v.number(),
    carbs: v.number(),
    fiber: v.number(),
    omega3: v.optional(v.number()),
    omega6: v.optional(v.number()),
    omega3to6Ratio: v.string(),
    ironType: v.string(),
    ironHeme: v.optional(v.number()),
    ironNonHeme: v.optional(v.number()),
    importantNutrients: v.array(v.string()),
    timestamp: v.number(),
    note: v.optional(v.string()),
    imageId: v.optional(v.id("_storage")),
  }).index("by_user_timestamp", ["userId", "timestamp"])
   .index("by_user", ["userId"]),
   
  userSettings: defineTable({
    userId: v.string(),
    dailyCaloriesGoal: v.number(),
    dailyProteinGoal: v.number(),
    dailyFiberGoal: v.number(),
    dailyFatGoal: v.number(),
    dailyCarbGoal: v.number(),
    goalsMode: v.string(),
    weightKg: v.optional(v.number()),
    heightCm: v.optional(v.number()),
    isTrackingEnabled: v.boolean(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),
});
