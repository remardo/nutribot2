

import { DailyLogItem, DayStats } from "../types";

/**
 * This service mimics a backend database like Convex.
 * In a real application, these methods would call `convex.query` or `convex.mutation`.
 * For this web demo, we use localStorage to persist data.
 */

const STORAGE_KEY = 'nutribot_daily_log';

// Helper for internal use
const getLocalStorageLog = (): DailyLogItem[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

export const getDailyLog = (): DailyLogItem[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return [];
  try {
    const parsed = JSON.parse(data);
    const today = new Date().toDateString();
    return parsed.filter((item: DailyLogItem) => new Date(item.timestamp).toDateString() === today);
  } catch (e) {
    return [];
  }
};

export const getAllLogs = (): DailyLogItem[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data).sort((a: DailyLogItem, b: DailyLogItem) => b.timestamp - a.timestamp);
  } catch (e) {
    return [];
  }
};

export const getLast7DaysStats = (): DayStats[] => {
  const logs = getLocalStorageLog();
  const stats: DayStats[] = [];
  
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateString = d.toDateString(); 
    
    const dayLogs = logs.filter(item => new Date(item.timestamp).toDateString() === dateString);
    
    // Sum nutrients for this day
    const dayStats = dayLogs.reduce((acc, item) => ({
      calories: acc.calories + item.calories,
      protein: acc.protein + item.protein,
      fat: acc.fat + item.fat,
      carbs: acc.carbs + item.carbs,
      fiber: acc.fiber + item.fiber
    }), {
      calories: 0,
      protein: 0,
      fat: 0,
      carbs: 0,
      fiber: 0
    });
      
    stats.push({
      // Short weekday name in Russian (e.g., "пн", "вт")
      date: d.toLocaleDateString('ru-RU', { weekday: 'short' }),
      ...dayStats
    });
  }
  return stats;
};

export const addToDailyLog = (item: Omit<DailyLogItem, 'id' | 'timestamp'>): DailyLogItem => {
  const currentLog = getLocalStorageLog();
  const newItem: DailyLogItem = {
    ...item,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  };
  
  const updatedLog = [...currentLog, newItem];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedLog));
  return newItem;
};

export const updateLogItem = (id: string, updates: Partial<DailyLogItem>): DailyLogItem[] => {
  const currentLog = getLocalStorageLog();
  const updatedLog = currentLog.map(item => 
    item.id === id ? { ...item, ...updates } : item
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedLog));
  return updatedLog;
};

export const deleteLogItem = (id: string): DailyLogItem[] => {
  const currentLog = getLocalStorageLog();
  const updatedLog = currentLog.filter(item => item.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedLog));
  return updatedLog;
};

export const clearDailyLog = () => {
  localStorage.removeItem(STORAGE_KEY);
};
