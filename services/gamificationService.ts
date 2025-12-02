
import { DailyLogItem, UserGamificationState, UserGoals, Quest, MapNode, Wallet, DailyStats, NutrientData, PlateRating, Habit, DailyChecklistTask, HabitTier, Achievement } from "../types";
import { getGamificationState, saveGamificationState } from "./dbService";

// --- Configuration ---

const RANKS = [
    { id: 'rookie', title: 'Новичок Осознанности', level: 1, minExp: 0 },
    { id: 'gatherer', title: 'Собиратель Баланса', level: 2, minExp: 500 },
    { id: 'architect', title: 'Архитектор Тарелки', level: 3, minExp: 1500 },
    { id: 'master', title: 'Мастер Стабильности', level: 4, minExp: 3000 },
    { id: 'mentor', title: 'Наставник Экспедиции', level: 5, minExp: 6000 },
];

const SEASON_LENGTH = 28; // 4 weeks

// Initial State Generator
const generateInitialState = (): UserGamificationState => {
    const nodes: MapNode[] = [];
    for (let i = 0; i < SEASON_LENGTH; i++) {
        let type: MapNode['type'] = 'path';
        if ((i + 1) % 7 === 0) type = 'camp'; // Weekly camp
        
        nodes.push({
            id: i,
            day: i + 1,
            type: type,
            status: i === 0 ? 'current' : 'locked',
            rewards: type === 'camp' ? { mindfulness: 1, energy: 50 } : undefined
        });
    }

    return {
        profile: {
            name: 'Исследователь',
            totalDaysActive: 0
        },
        rankId: 'rookie',
        totalExp: 0,
        wallet: { energy: 0, balance: 0, mindfulness: 1 }, // Start with 1 token
        currentSeasonId: 'season_protein',
        currentDayIndex: 0,
        mapNodes: nodes,
        activeQuests: generateDailyQuests(),
        lastLoginDate: new Date().toDateString(),
        dailyChestOpened: false,
        streak: {
            current: 0,
            best: 0,
            lastLogDate: '',
            freezeActive: false
        },
        returnMechanic: {
            isActive: false,
            currentDays: 0,
            lastLogDate: ''
        },
        habits: [
            { id: 'h_breakfast', title: 'Завтрак чемпиона', description: 'Первый прием пищи до 11:00', streak: 0, history: [], tier: 'none', totalCompletions: 0 },
            { id: 'h_protein', title: 'Белковый профи', description: 'Набрать >100г белка за день', streak: 0, history: [], tier: 'none', totalCompletions: 0 },
            { id: 'h_veggie', title: 'Зеленый день', description: 'Съесть >20г клетчатки', streak: 0, history: [], tier: 'none', totalCompletions: 0 }
        ],
        unlockedAchievements: [],
        notificationSettings: {
            enabled: false,
            lastSent: ''
        }
    };
};

// Quest Generator (Fixed CP7 Checklist)
const generateDailyQuests = (): Quest[] => {
    return [
        { id: 'q_log_2', title: 'Дисциплина', description: 'Запишите минимум 2 приема пищи', target: 2, progress: 0, isCompleted: false, type: 'daily', reward: { energy: 20 }, icon: 'camera' },
        { id: 'q_quality', title: 'Качество', description: 'Съешьте блюдо с оценкой "A" или "S"', target: 1, progress: 0, isCompleted: false, type: 'daily', reward: { balance: 15 }, icon: 'star' },
        { id: 'q_photo', title: 'Фото-охота', description: 'Добавьте фото к любому приему пищи', target: 1, progress: 0, isCompleted: false, type: 'daily', reward: { energy: 10 }, icon: 'image' }
    ];
};

export const initializeOrGetState = (): UserGamificationState => {
    let state = getGamificationState();
    if (!state) {
        state = generateInitialState();
        saveGamificationState(state);
    }
    
    // Check if new day
    const today = new Date().toDateString();
    if (state.lastLoginDate !== today) {
        // Daily Reset Logic
        state.activeQuests = generateDailyQuests();
        state.dailyChestOpened = false;
        state.lastLoginDate = today;
        
        // Streak Logic: If missed yesterday and no freeze active
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (state.streak.lastLogDate !== yesterday.toDateString() && state.streak.lastLogDate !== today) {
             // Missed a day!
             if (state.wallet.mindfulness > 0) {
                 // Auto-use token to save streak
                 state.wallet.mindfulness -= 1;
                 state.streak.freezeActive = true; 
             } else {
                 state.streak.current = 0; // Reset streak
                 
                 // Enable Return Mechanic if not already active
                 state.returnMechanic.isActive = true;
                 state.returnMechanic.currentDays = 0;
                 state.returnMechanic.lastLogDate = '';
             }
        } else {
            state.streak.freezeActive = false;
        }
        
        // If Return Mechanic is active but user missed a day during the return attempt
        if (state.returnMechanic.isActive && state.returnMechanic.lastLogDate) {
             if (state.returnMechanic.lastLogDate !== yesterday.toDateString()) {
                 state.returnMechanic.currentDays = 0;
             }
        }
        
        saveGamificationState(state);
    }
    
    // Migration for existing states missing new fields
    if (!state.unlockedAchievements) {
        state.unlockedAchievements = [];
    }
    state.habits.forEach(h => {
        if (!h.tier) h.tier = 'none';
        if (h.totalCompletions === undefined) h.totalCompletions = 0;
    });
    
    return state;
};

// --- Helpers ---

export const getHabitTierInfo = (completions: number): { current: HabitTier, next: { label: string, remaining: number } | null, progress: number } => {
    if (completions < 7) {
        return { 
            current: 'none', 
            next: { label: 'Bronze', remaining: 7 - completions }, 
            progress: (completions / 7) * 100 
        };
    } else if (completions < 21) {
         return { 
            current: 'bronze', 
            next: { label: 'Silver', remaining: 21 - completions }, 
            progress: ((completions - 7) / (21 - 7)) * 100 
        };
    } else if (completions < 50) {
         return { 
            current: 'silver', 
            next: { label: 'Gold', remaining: 50 - completions }, 
            progress: ((completions - 21) / (50 - 21)) * 100 
        };
    } else if (completions < 100) {
         return { 
            current: 'gold', 
            next: { label: 'Platinum', remaining: 100 - completions }, 
            progress: ((completions - 50) / (100 - 50)) * 100 
        };
    } else {
        return { 
            current: 'platinum', 
            next: null, 
            progress: 100 
        };
    }
};

export const getAllAchievementsList = (): Achievement[] => {
    return [
        { id: 'a_first_log', title: 'Первый шаг', description: 'Сделайте первую запись в дневнике', icon: '🌱', color: 'text-green-400' },
        { id: 'a_streak_3', title: 'Разгон', description: 'Держите стрик 3 дня подряд', icon: '🔥', color: 'text-orange-500' },
        { id: 'a_streak_7', title: 'Неделя побед', description: 'Полная неделя без пропусков', icon: '📅', color: 'text-blue-500' },
        { id: 'a_protein_master', title: 'Белковый барон', description: 'Наберите >150г белка за день', icon: '🥩', color: 'text-red-400' },
        { id: 'a_fiber_king', title: 'Клетчатка', description: 'Съешьте >30г клетчатки за день', icon: '🥦', color: 'text-green-600' },
        { id: 'a_omega_lord', title: 'Повелитель морей', description: 'Идеальный баланс Омега-3/6', icon: '🐟', color: 'text-cyan-400' },
        { id: 'a_iron_man', title: 'Железный человек', description: 'Наберите норму железа (100%)', icon: '⚓', color: 'text-gray-400' },
        { id: 'a_perfect_day', title: 'Идеальный день', description: 'Выполните все цели дня', icon: '✨', color: 'text-yellow-400' },
        { id: 'a_photographer', title: 'Фуд-блогер', description: 'Загрузите 10 фото еды', icon: '📸', color: 'text-purple-400' },
    ];
};

// --- CP6: PLATE SCORING ALGORITHM ---

export const calculatePlateRating = (nutrients: NutrientData, userGoals?: UserGoals): PlateRating => {
    let score = 70; // Start with a base score
    const tags: string[] = [];
    
    // 1. Protein Analysis
    const totalCals = nutrients.calories || 1;
    const proteinCals = nutrients.protein * 4;
    const proteinRatio = proteinCals / totalCals;

    if (proteinRatio >= 0.25 || nutrients.protein > 25) {
        score += 15;
        tags.push('Сила белка');
    } else if (proteinRatio >= 0.15) {
        score += 5;
    } else if (proteinRatio < 0.1 && totalCals > 200) {
        score -= 10;
        tags.push('Мало белка');
    }

    // 2. Fiber Analysis
    if (nutrients.fiber >= 8) {
        score += 15;
        tags.push('Клетчатка++');
    } else if (nutrients.fiber >= 4) {
        score += 8;
        tags.push('Есть клетчатка');
    }

    // 3. Fat Analysis (Balance check)
    const fatCals = nutrients.fat * 9;
    const fatRatio = fatCals / totalCals;
    
    if (fatRatio > 0.6) {
        score -= 10;
        tags.push('Жирновато');
    }

    // 4. Sugar check (Simplified: Carbs - Fiber, rough approximation)
    if (nutrients.carbs > 40 && nutrients.fiber < 2) {
        score -= 10;
        tags.push('Сахарный пик');
    }

    // 5. Omega Boost
    if (nutrients.omega3 > 0.5) {
        score += 5;
        tags.push('Омега-3');
    }

    // 6. Calorie Appropriateness
    if (totalCals > 1200) {
        score -= 5; 
    }

    // Clamp Score
    score = Math.min(100, Math.max(0, score));

    // Determine Grade & Color
    let grade: PlateRating['grade'] = 'C';
    let color = 'text-gray-400';

    if (score >= 90) { grade = 'S'; color = 'text-purple-400'; }
    else if (score >= 80) { grade = 'A'; color = 'text-green-400'; }
    else if (score >= 60) { grade = 'B'; color = 'text-blue-400'; }
    else if (score >= 40) { grade = 'C'; color = 'text-yellow-400'; }
    else { grade = 'D'; color = 'text-red-400'; }

    return { score, grade, tags, color };
};

// --- CP7: Daily Checklist Status ---

export const getDailyChecklistStatus = (logs: DailyLogItem[]): DailyChecklistTask[] => {
    const tasks: DailyChecklistTask[] = [];
    
    // 1. Minimum 2 meals
    tasks.push({
        id: 'task_min_meals',
        label: 'Минимум 2 приема пищи',
        isCompleted: logs.length >= 2
    });
    
    // 2. High Quality Meal
    const hasQuality = logs.some(l => l.plateRating && l.plateRating.score >= 80);
    tasks.push({
        id: 'task_quality',
        label: '1 идеальная тарелка (Grade A/S)',
        isCompleted: hasQuality
    });
    
    // 3. Photo Logged (Assuming if we have logs with image/images)
    const hasPhoto = logs.some(l => (l.images && l.images.length > 0) || l.image);
    tasks.push({
        id: 'task_photo',
        label: 'Фото еды',
        isCompleted: hasPhoto
    });
    
    return tasks;
};

// --- CP8: Chest Logic ---

export const checkDailyChestAvailability = (state: UserGamificationState, logs: DailyLogItem[]): boolean => {
    if (state.dailyChestOpened) return false;
    const checklist = getDailyChecklistStatus(logs);
    return checklist.every(t => t.isCompleted);
};

export const openDailyChest = (): { state: UserGamificationState, reward: Partial<Wallet> } => {
    const state = initializeOrGetState();
    
    // Random Reward Logic
    const roll = Math.random();
    const reward: Partial<Wallet> = {};
    
    if (roll < 0.5) {
        reward.energy = 50;
    } else if (roll < 0.8) {
        reward.balance = 30;
    } else {
        reward.mindfulness = 1;
        reward.energy = 20;
    }
    
    state.wallet.energy += (reward.energy || 0);
    state.wallet.balance += (reward.balance || 0);
    state.wallet.mindfulness += (reward.mindfulness || 0);
    state.totalExp += 50; // Bonus XP for chest
    
    state.dailyChestOpened = true;
    saveGamificationState(state);
    
    return { state, reward };
};

// --- CP9: Habit Evaluation ---

const evaluateHabits = (state: UserGamificationState, log: DailyLogItem, allTodayLogs: DailyLogItem[]) => {
    const logTime = new Date(log.timestamp);
    const hour = logTime.getHours();
    const todayStr = logTime.toDateString();

    state.habits.forEach(habit => {
        // Skip if already completed today
        const hasCompletedToday = habit.history.some(h => h.date === todayStr && h.status === 'completed');
        if (hasCompletedToday) return;

        let completed = false;
        
        // 1. Breakfast Rule
        if (habit.id === 'h_breakfast') {
            // Must be the first meal of the day and before 11:00
            if (allTodayLogs.length === 1 && hour < 11) {
                completed = true;
            }
        }
        
        // 2. Protein Rule (Total > 100g)
        if (habit.id === 'h_protein') {
            const totalProtein = allTodayLogs.reduce((acc, l) => acc + l.protein, 0);
            if (totalProtein > 100) completed = true;
        }

        // 3. Veggie Rule (Fiber > 20g)
        if (habit.id === 'h_veggie') {
             const totalFiber = allTodayLogs.reduce((acc, l) => acc + l.fiber, 0);
             if (totalFiber > 20) completed = true;
        }

        if (completed) {
            habit.streak += 1;
            habit.totalCompletions = (habit.totalCompletions || 0) + 1;
            habit.history.push({ date: todayStr, status: 'completed' });
            
            // Calculate new tier
            const tierInfo = getHabitTierInfo(habit.totalCompletions);
            habit.tier = tierInfo.current;

            // Reward for habit
            state.wallet.balance += 5;
            state.totalExp += 10;
        }
    });
};


// --- CP10: Strict Day Completion Logic ---

export const checkDayCompletion = (dailyLogs: DailyLogItem[]): boolean => {
    // 1. Meals count >= 2
    if (dailyLogs.length < 2) return false;
    
    // 2. Has Photo
    const hasPhoto = dailyLogs.some(l => (l.images && l.images.length > 0) || l.image);
    if (!hasPhoto) return false;
    
    // 3. Quality Meal (Score > 70)
    const hasQuality = dailyLogs.some(l => l.plateRating && l.plateRating.score > 70);
    if (!hasQuality) return false;
    
    return true;
};

// --- CP11: Level Calculation ---

export const calculateLevelInfo = (totalExp: number) => {
    // Simple formula: 100 XP per level
    const level = Math.floor(totalExp / 100) + 1;
    const progress = totalExp % 100;
    return { level, progress, nextLevelExp: 100 };
};

// --- Achievements Helper ---
const checkAchievements = (state: UserGamificationState, dailyLogs: DailyLogItem[]) => {
    if (!state.unlockedAchievements) state.unlockedAchievements = [];
    const unlock = (id: string) => {
        if (!state.unlockedAchievements.includes(id)) {
            state.unlockedAchievements.push(id);
        }
    };

    if (dailyLogs.length > 0) unlock('a_first_log');
    if (state.streak.current >= 3) unlock('a_streak_3');
    if (state.streak.current >= 7) unlock('a_streak_7');
    
    // Basic Nutrient checks
    const totalProtein = dailyLogs.reduce((acc, i) => acc + i.protein, 0);
    const totalFiber = dailyLogs.reduce((acc, i) => acc + i.fiber, 0);
    
    if (totalProtein > 150) unlock('a_protein_master');
    if (totalFiber > 30) unlock('a_fiber_king');
};

// --- Core Loop Logic ---

export const processNewLog = (
    newLog: DailyLogItem, 
    dailyLogs: DailyLogItem[], 
    goals: UserGoals
): { state: UserGamificationState, rewards: Partial<Wallet> } => {
    
    const state = initializeOrGetState();
    const rewards: Partial<Wallet> = { energy: 0, balance: 0, mindfulness: 0 };
    const rating = newLog.plateRating || { score: 50, grade: 'C', tags: [], color: '' };
    const todayStr = new Date().toDateString();

    // 0. Update Profile Stats (Active Days)
    const isFirstLogToday = dailyLogs.length === 1; // current log is included
    if (isFirstLogToday) {
        state.profile.totalDaysActive += 1;
    }

    // --- Return Strength Mechanic ---
    if (state.returnMechanic.isActive && state.returnMechanic.lastLogDate !== todayStr) {
        // Increment return streak
        state.returnMechanic.currentDays += 1;
        state.returnMechanic.lastLogDate = todayStr;

        if (state.returnMechanic.currentDays >= 3) {
            // SUCCESS! Grant Bonus
            const bonusEnergy = 150;
            const bonusBalance = 50;
            
            rewards.energy = (rewards.energy || 0) + bonusEnergy;
            rewards.balance = (rewards.balance || 0) + bonusBalance;
            
            // Deactivate mechanic
            state.returnMechanic.isActive = false;
            state.returnMechanic.currentDays = 0;
        }
    }

    // 1. Calculate Energy (Quantity / Calories / Protein)
    let energyGain = 10; 
    if (newLog.protein > 20) energyGain += 10; 
    if (newLog.calories >= 200) energyGain += 5;
    rewards.energy = (rewards.energy || 0) + energyGain;
    
    // 2. Calculate Balance Points (Quality / Score)
    let balanceGain = 0;
    if (rating.grade === 'S') balanceGain += 25;
    else if (rating.grade === 'A') balanceGain += 15;
    else if (rating.grade === 'B') balanceGain += 5;
    if (newLog.fiber > 5) balanceGain += 5;
    rewards.balance = (rewards.balance || 0) + balanceGain;

    // 3. Update Quests (Legacy CP7 Checklist as quests)
    state.activeQuests.forEach(q => {
        if (q.isCompleted) return;
        
        let progressed = false;
        if (q.id === 'q_log_2') {
             q.progress = Math.min(dailyLogs.length, q.target);
             if (dailyLogs.length >= q.target) progressed = true;
        }
        if (q.id === 'q_quality' && rating.score >= 80) { // A or S
            q.progress = 1;
            progressed = true;
        }
        if (q.id === 'q_photo' && ((newLog.images && newLog.images.length > 0) || newLog.image)) {
            q.progress = 1;
            progressed = true;
        }
        
        if (progressed && q.progress >= q.target && !q.isCompleted) {
            q.isCompleted = true;
            if (q.reward.energy) rewards.energy = (rewards.energy || 0) + q.reward.energy;
            if (q.reward.balance) rewards.balance = (rewards.balance || 0) + q.reward.balance;
        }
    });

    // 4. Evaluate Habits (CP9)
    evaluateHabits(state, newLog, dailyLogs);
    
    // 5. Check Achievements
    checkAchievements(state, dailyLogs);

    // 6. Update Wallet & EXP
    state.wallet.energy += (rewards.energy || 0);
    state.wallet.balance += (rewards.balance || 0);
    state.wallet.mindfulness += (rewards.mindfulness || 0);
    state.totalExp += (rewards.energy || 0) + (rewards.balance || 0);

    // 7. Update Map Progress (CP10 Strict Logic)
    const todayNode = state.mapNodes[state.currentDayIndex];
    if (todayNode && todayNode.status !== 'completed') {
        const isDayCompleted = checkDayCompletion(dailyLogs);
        
        if (isDayCompleted) {
            todayNode.status = 'completed';
            
            // Streak Update
            if (state.streak.lastLogDate !== todayStr) {
                state.streak.current += 1;
                state.streak.lastLogDate = todayStr;
                if (state.streak.current > state.streak.best) state.streak.best = state.streak.current;
            }
        }
    }

    saveGamificationState(state);
    return { state, rewards };
};

export const getCurrentRank = (exp: number) => {
    return RANKS.slice().reverse().find(r => exp >= r.minExp) || RANKS[0];
};

export const getNextRank = (exp: number) => {
    const current = getCurrentRank(exp);
    const nextIndex = RANKS.findIndex(r => r.id === current.id) + 1;
    return RANKS[nextIndex] || null;
};
