import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getLogs = query({
  args: {},
  handler: async (ctx) => {
    const logs = await ctx.db.query("dailyLogs").withIndex("by_timestamp").order("desc").collect();
    
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

export const deleteLog = mutation({
  args: { id: v.id("dailyLogs") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});