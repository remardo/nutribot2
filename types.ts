
export interface NutrientData {
  name: string;
  calories: number; // kcal
  protein: number; // g
  fat: number; // g
  carbs: number; // g
  fiber: number; // g
  omega3to6Ratio: string; // e.g., "1:4" or "Low Omega-3"
  omega3?: number; // g
  omega6?: number; // g
  ironType: string; // 'гемовое' | 'негемовое' | 'смешанное' | 'неизвестно'
  ironHeme?: number; // mg
  ironNonHeme?: number; // mg
  importantNutrients: string[]; // List of other vitamins/minerals found
  isCorrection?: boolean; // True if this is a correction of previous food
  originalName?: string; // Original name being corrected
}


export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  image?: string; // Base64
  data?: NutrientData; // If the model parsed food data
  timestamp: number;
}

export interface DailyLogItem extends NutrientData {
  id: string;
  userId?: string; // Telegram user ID (опционально для обратной совместимости)
  timestamp: number;
  note?: string;
  imageUrl?: string | null;
  imageId?: string; // Internal Convex Storage ID
}

export interface DailyStats {
  totalCalories: number;
  totalProtein: number;
  totalFat: number;
  totalCarbs: number;
  totalFiber: number;
  totalOmega3: number;
  totalOmega6: number;
  totalIronHeme: number;
  totalIronNonHeme: number;
}

export interface DayStats {
  date: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
}

export interface UserSettings {
  id?: string;
  userId: string;
  dailyCaloriesGoal: number;
  dailyProteinGoal: number;
  dailyFiberGoal: number;
  dailyFatGoal: number;
  dailyCarbGoal: number;
  goalsMode: "auto" | "manual";
  weightKg?: number;
  heightCm?: number;
  isTrackingEnabled: boolean;
  updatedAt: number;
}

export interface NutritionProgress {
  calories: {
    current: number;
    goal: number;
    percentage: number;
  };
  protein: {
    current: number;
    goal: number;
    percentage: number;
  };
  fat: {
    current: number;
    goal: number;
    percentage: number;
  };
  carbs: {
    current: number;
    goal: number;
    percentage: number;
  };
  fiber: {
    current: number;
    goal: number;
    percentage: number;
  };
  omega3: {
    current: number;
    goal: number;
    percentage: number;
    ratioText: string;
  };
  omega6: {
    current: number;
    goal: number;
    percentage: number;
  };
  iron: {
    heme: number;
    nonHeme: number;
    total: number;
    hemeSharePercent: number;
  };
}

// Telegram Web App Types
declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void;
        expand: () => void;
        close: () => void;
        MainButton: {
          text: string;
          color: string;
          textColor: string;
          isVisible: boolean;
          isActive: boolean;
          show: () => void;
          hide: () => void;
          onClick: (cb: () => void) => void;
          offClick: (cb: () => void) => void;
          showProgress: (leaveActive: boolean) => void;
          hideProgress: () => void;
        };
        BackButton: {
          isVisible: boolean;
          show: () => void;
          hide: () => void;
          onClick: (cb: () => void) => void;
          offClick: (cb: () => void) => void;
        };
        themeParams: {
          bg_color?: string;
          text_color?: string;
          hint_color?: string;
          link_color?: string;
          button_color?: string;
          button_text_color?: string;
          secondary_bg_color?: string;
        };
        initDataUnsafe: any;
      }
    }
  }
}