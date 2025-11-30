import React, { useState, useEffect, useRef, useMemo, useCallback, Suspense, lazy } from 'react';
import { Camera, Send, PieChart as ChartIcon, MessageSquare, Plus, Menu, X, User, Book, Settings } from 'lucide-react';
import { ChatMessage, DailyLogItem, DayStats, NutritionProgress } from './types';
import ChatMessageBubble from './components/ChatMessageBubble';
import NutritionProgressBar from './components/NutritionProgressBar';
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "./convex/_generated/api";
import { Id } from "./convex/_generated/dataModel";
import { addDays, formatWeekdayShort, isSameDay, startOfDay } from './utils/date';
import { useImageUpload } from './hooks/useImageUpload';
import { AppTab, useTelegramBackButton, useTelegramUser } from './hooks/useTelegramWebApp';

const DailyStatsDashboard = lazy(() => import('./components/DailyStatsDashboard'));
const FoodArchive = lazy(() => import('./components/FoodArchive'));
const NutritionGoalsSettings = lazy(() => import('./components/NutritionGoalsSettings'));

const BUILD_VERSION = '1.1.0';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>('chat');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showNutritionSettings, setShowNutritionSettings] = useState(false); // Показывать настройки питания
  const { userId, userName, isAuthenticated } = useTelegramUser();
  
  // Convex Hooks
  const logs = useQuery(api.food.getLogs) || [];
  const userSettings = useQuery(api.food.getUserSettings);
  const addLogMutation = useMutation(api.food.addLog);
  const updateLogMutation = useMutation(api.food.updateLog);
  const updateLogFullMutation = useMutation(api.food.updateLogFull);
  const deleteLogMutation = useMutation(api.food.deleteLog);
  const deleteImageMutation = useMutation(api.food.deleteImage);
  const generateUploadUrl = useMutation(api.food.generateUploadUrl);
  const analyzeFoodAction = useAction(api.gemini.analyzeFood);

  // Map Convex logs to App types (handling ID conversion)
  const allLogs: DailyLogItem[] = useMemo(() => logs.map(log => ({
    ...log,
    id: log._id, // Map Convex _id to id
  })), [logs]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calculate Weekly Stats on Client side from allLogs
  const weeklyStats: DayStats[] = useMemo(() => {
    const today = startOfDay(new Date());

    return Array.from({ length: 7 }, (_, index) => {
      const date = addDays(today, index - 6);
      const dayLogs = allLogs.filter(item => isSameDay(item.timestamp, date));

      const dayStats = dayLogs.reduce((acc, item) => ({
        calories: acc.calories + item.calories,
        protein: acc.protein + item.protein,
        fat: acc.fat + item.fat,
        carbs: acc.carbs + item.carbs,
        fiber: acc.fiber + item.fiber
      }), { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 });

      return {
        date: formatWeekdayShort(date),
        ...dayStats
      };
    });
  }, [allLogs]);

  // Derived state for today's log
  const todayLog = useMemo(() => {
    const today = startOfDay(new Date());
    return allLogs.filter(item => isSameDay(item.timestamp, today));
  }, [allLogs]);

  // Calculate nutrition progress
  const nutritionProgress: NutritionProgress = useMemo(() => {
    const defaults = {
      calories: { current: 0, goal: 2000, percentage: 0 },
      protein: { current: 0, goal: 100, percentage: 0 },
      fat: { current: 0, goal: 70, percentage: 0 },
      carbs: { current: 0, goal: 250, percentage: 0 },
      fiber: { current: 0, goal: 25, percentage: 0 },
    };

    if (!userSettings) {
      return defaults;
    }

    const currentStats = todayLog.reduce((acc, item) => ({
      calories: acc.calories + (typeof item.calories === 'number' ? item.calories : 0),
      protein: acc.protein + (typeof item.protein === 'number' ? item.protein : 0),
      fat: acc.fat + (typeof item.fat === 'number' ? item.fat : 0),
      carbs: acc.carbs + (typeof item.carbs === 'number' ? item.carbs : 0),
      fiber: acc.fiber + (typeof item.fiber === 'number' ? item.fiber : 0),
    }), { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 });

    const goal = userSettings.dailyCaloriesGoal;
    const proteinGoal = userSettings.dailyProteinGoal;
    const fatGoal = userSettings.dailyFatGoal ?? defaults.fat.goal;
    const carbGoal = userSettings.dailyCarbGoal ?? defaults.carbs.goal;
    const fiberGoal = userSettings.dailyFiberGoal;

    return {
      calories: {
        current: currentStats.calories,
        goal: goal,
        percentage: goal > 0 ? (currentStats.calories / goal) * 100 : 0,
      },
      protein: {
        current: currentStats.protein,
        goal: proteinGoal,
        percentage: proteinGoal > 0 ? (currentStats.protein / proteinGoal) * 100 : 0,
      },
      fat: {
        current: currentStats.fat,
        goal: fatGoal,
        percentage: fatGoal > 0 ? (currentStats.fat / fatGoal) * 100 : 0,
      },
      carbs: {
        current: currentStats.carbs,
        goal: carbGoal,
        percentage: carbGoal > 0 ? (currentStats.carbs / carbGoal) * 100 : 0,
      },
      fiber: {
        current: currentStats.fiber,
        goal: fiberGoal,
        percentage: fiberGoal > 0 ? (currentStats.fiber / fiberGoal) * 100 : 0,
      },
    };
  }, [todayLog, userSettings]);

  // Initial bot message
  useEffect(() => {
    setMessages([
      {
        id: 'init',
        role: 'model',
        text: "👋 Привет! Я NutriBot. Отправь мне фото еды или напиши, что ты съел, и я рассчитаю КБЖУ и нутриенты.",
        timestamp: Date.now()
      }
    ]);
  }, []);

  // Debug logs for Convex data
  useEffect(() => {
    console.log('Convex logs updated:', logs?.length || 0, 'items');
    console.log('Today log items:', todayLog?.length || 0);
    console.log('All logs:', allLogs);
    console.log('Current userId:', userId);
  }, [logs, todayLog, allLogs, userId]);

  const handleBackNavigation = useCallback(() => {
    if (isMenuOpen) {
      setIsMenuOpen(false);
    } else if (activeTab !== 'chat') {
      setActiveTab('chat');
    }
  }, [activeTab, isMenuOpen]);

  useTelegramBackButton(activeTab, isMenuOpen, handleBackNavigation);

  // Scroll to bottom
  useEffect(() => {
    if (activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  const pushMessage = useCallback((message: ChatMessage) => {
    setMessages(prev => [...prev, message]);
  }, []);

  const handleSendMessage = async (text?: string, imageFile?: File, imagePreview?: string) => {
    const content = text || inputText;
    if ((!content.trim() && !imageFile) || isLoading) return;

    setInputText('');
    
    // Optimistic User Message
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text: content,
      image: imagePreview, // For display only
      timestamp: Date.now()
    };

    pushMessage(userMsg);
    setIsLoading(true);

    try {
      let imageStorageId: Id<"_storage"> | undefined = undefined;

      // 1. Upload Image to Convex Storage if exists
      if (imageFile) {
        try {
          const postUrl = await generateUploadUrl();
          const result = await fetch(postUrl, {
            method: "POST",
            headers: { "Content-Type": imageFile.type },
            body: imageFile,
          });
          
          if (!result.ok) {
            throw new Error(`Upload failed: ${result.status}`);
          }
          
          const { storageId } = await result.json();
          imageStorageId = storageId;
          console.log('Image uploaded successfully:', storageId);
        } catch (uploadError) {
          console.error('Image upload error:', uploadError);
          // Continue without image - not critical for analysis
        }
      }

      // 2. Prepare context stats with validation
      const currentStats = todayLog.reduce((acc, item) => ({
        totalCalories: acc.totalCalories + (typeof item.calories === 'number' ? item.calories : 0),
        totalProtein: acc.totalProtein + (typeof item.protein === 'number' ? item.protein : 0),
        totalFat: acc.totalFat + (typeof item.fat === 'number' ? item.fat : 0),
        totalCarbs: acc.totalCarbs + (typeof item.carbs === 'number' ? item.carbs : 0),
        totalFiber: acc.totalFiber + (typeof item.fiber === 'number' ? item.fiber : 0)
      }), { totalCalories: 0, totalProtein: 0, totalFat: 0, totalCarbs: 0, totalFiber: 0 });

      const statsString = `[Текущие итоги дня: ${Math.round(currentStats.totalCalories)}ккал, Б:${currentStats.totalProtein.toFixed(1)}г, Ж:${currentStats.totalFat.toFixed(1)}г, У:${currentStats.totalCarbs.toFixed(1)}г]`;
      
      // 3. Call Server Action
      const response = await analyzeFoodAction({
        message: content,
        imageStorageId,
        history: messages.slice(-6).map(m => ({ role: m.role, text: m.text })),
        currentStats: statsString,
      });

      const botMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'model',
        text: response.text,
        data: response.data ? { ...response.data, imageStorageId } : undefined, // Attach storageId to data for saving later
        timestamp: Date.now()
      };

      pushMessage(botMsg);

      // Auto-save to log if analysis is successful and has valid data (also works in demo mode)
      if (response.data && response.data.name && response.data.calories > 0) {
        try {
          // Check if this is a correction of an existing entry
          if (response.data.isCorrection) {
            // Find the most recent entry with similar name (within last hour)
            const oneHourAgo = Date.now() - 60 * 60 * 1000;
            const recentEntries = allLogs.filter(item => 
              item.timestamp > oneHourAgo && 
              (item.name.toLowerCase().includes(response.data!.originalName?.toLowerCase() || '') ||
               response.data!.originalName?.toLowerCase().includes(item.name.toLowerCase()))
            );
            
            if (recentEntries.length > 0) {
              // Update the most recent matching entry
              const entryToUpdate = recentEntries.sort((a, b) => b.timestamp - a.timestamp)[0];
              await updateLogFullMutation({
                id: entryToUpdate.id as Id<"dailyLogs">,
                name: response.data.name,
                calories: response.data.calories,
                protein: response.data.protein,
                fat: response.data.fat,
                carbs: response.data.carbs,
                fiber: response.data.fiber,
                omega3to6Ratio: response.data.omega3to6Ratio,
                ironType: response.data.ironType,
                importantNutrients: response.data.importantNutrients,
                imageId: imageStorageId as Id<"_storage"> | undefined,
              });
              
              console.log('Successfully updated existing entry:', response.data.name);
            
            // Удаляем изображение из хранилища после успешного обновления
            if (imageStorageId) {
              try {
                await deleteImageMutation({ storageId: imageStorageId });
                console.log('Image deleted from storage after successful update');
              } catch (deleteError) {
                console.error('Failed to delete image after update:', deleteError);
                // Не прерываем процесс при ошибке удаления изображения
              }
            }
            } else {
              // If no matching entry found, create new one as fallback
              await addLogMutation({
                userId: userId!, // Обязательно должен быть установлен
                name: response.data.name,
                calories: response.data.calories,
                protein: response.data.protein,
                fat: response.data.fat,
                carbs: response.data.carbs,
                fiber: response.data.fiber,
                omega3to6Ratio: response.data.omega3to6Ratio,
                ironType: response.data.ironType,
                importantNutrients: response.data.importantNutrients,
                timestamp: Date.now(),
                imageId: imageStorageId as Id<"_storage"> | undefined,
              });
              
              console.log('No matching entry found, created new entry:', response.data.name);
              
              // Удаляем изображение из хранилища после успешного создания записи
              if (imageStorageId) {
                try {
                  await deleteImageMutation({ storageId: imageStorageId });
                  console.log('Image deleted from storage after successful creation');
                } catch (deleteError) {
                  console.error('Failed to delete image after creation:', deleteError);
                  // Не прерываем процесс при ошибке удаления изображения
                }
              }
            }
          } else {
            // This is a new entry, create it normally
            await addLogMutation({
              userId: userId!, // Обязательно должен быть установлен
              name: response.data.name,
              calories: response.data.calories,
              protein: response.data.protein,
              fat: response.data.fat,
              carbs: response.data.carbs,
              fiber: response.data.fiber,
              omega3to6Ratio: response.data.omega3to6Ratio,
              ironType: response.data.ironType,
              importantNutrients: response.data.importantNutrients,
              timestamp: Date.now(),
              imageId: imageStorageId as Id<"_storage"> | undefined,
            });
            
            console.log('Successfully saved new analysis to log:', response.data.name);
            
            // Удаляем изображение из хранилища после успешного создания записи
            if (imageStorageId) {
              try {
                await deleteImageMutation({ storageId: imageStorageId });
                console.log('Image deleted from storage after successful creation');
              } catch (deleteError) {
                console.error('Failed to delete image after creation:', deleteError);
                // Не прерываем процесс при ошибке удаления изображения
              }
            }
          }
        } catch (saveError) {
          console.error('Failed to save to log:', saveError);
          // Don't show error to user, just log it
        }
      }

    } catch (error) {
      console.error("Food analysis error:", error);
      
      let errorMessage = "Произошла ошибка при обращении к серверу.";
      
      // Более детальная обработка ошибок
      if (error instanceof Error) {
        if (error.message.includes('API Key') || error.message.includes('Unauthorized')) {
          errorMessage = "❌ Ошибка конфигурации API ключа. Обратитесь к администратору.";
        } else if (error.message.includes('network') || error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
          errorMessage = "❌ Проблема с сетевым подключением. Проверьте интернет.";
        } else if (error.message.includes('timeout')) {
          errorMessage = "❌ Запрос занял слишком много времени. Попробуйте позже.";
        } else if (error.message.includes('413') || error.message.includes('payload too large')) {
          errorMessage = "❌ Файл слишком большой. Попробуйте меньшее изображение.";
        } else if (error.message.includes('CORS') || error.message.includes('cross-origin')) {
          errorMessage = "❌ Ошибка CORS. Проверьте настройки домена.";
        }
        
        // Логируем детали ошибки для отладки
        console.log("Error details:", {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
      }
      
      pushMessage({
        id: crypto.randomUUID(),
        role: 'model',
        text: errorMessage,
        timestamp: Date.now()
      });
    } finally {
      setIsLoading(false);
    }
  };

  const { handleFileUpload } = useImageUpload({
    onSend: handleSendMessage,
    pushMessage,
  });

  const handleUpdateLog = async (id: string, updates: Partial<DailyLogItem>) => {
    // Only pass fields that allow updating. Currently 'note' is the main one.
    await updateLogMutation({
        id: id as Id<"dailyLogs">,
        note: updates.note,
    });
  };

  const handleDeleteLog = async (id: string) => {
    if (window.confirm('Вы уверены, что хотите удалить эту запись?')) {
      await deleteLogMutation({ id: id as Id<"dailyLogs"> });
    }
  };

  const handleNavigate = (tab: AppTab) => {
    setActiveTab(tab);
    setIsMenuOpen(false);
  };

  const getHeaderTitle = () => {
    switch(activeTab) {
      case 'chat': return 'Чат';
      case 'stats': return 'Статистика';
      case 'archive': return 'Архив блюд';
      case 'profile': return 'Профиль';
      default: return 'NutriBot';
    }
  };

  const handleProfileSettingsClose = () => {
    // В профиле просто обновляем данные, не закрываем экран
    console.log('Настройки профиля обновлены');
  };

  // Предупреждение об аутентификации (не блокирующее)

  return (
    <div className="flex flex-col h-full bg-gray-900 text-gray-100 font-sans relative overflow-hidden">
      
      {/* Side Menu Drawer */}
      {isMenuOpen && (
        <div className="absolute inset-0 z-50 flex">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsMenuOpen(false)}
          />
          
          {/* Menu Content */}
          <div className="relative w-72 bg-gray-800 h-full shadow-2xl flex flex-col transform transition-transform duration-300 ease-out border-r border-gray-700">
            <div className="p-5 border-b border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <div className="bg-gradient-to-tr from-green-400 to-blue-500 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-sm shadow-lg">
                  NB
                </div>
                NutriBot
              </h2>
              <button onClick={() => setIsMenuOpen(false)} className="text-gray-400 hover:text-white p-1">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-4">
              {/* Пользователь */}
              <div className="mb-4 p-3 bg-gray-700/30 rounded-lg border border-gray-600">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-tr from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                    <User size={20} className="text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">
                      {userName || 'Пользователь'}
                    </p>
                    <p className="text-xs text-gray-400">
                      ID: {userId || 'Не определен'}
                    </p>
                  </div>
                </div>
              </div>
              
              <nav className="space-y-1">
                <button 
                  onClick={() => handleNavigate('chat')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'chat' ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20' : 'text-gray-300 hover:bg-gray-700/50'}`}
                >
                  <MessageSquare size={20} />
                  Чат
                </button>
                <button 
                  onClick={() => handleNavigate('stats')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'stats' ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20' : 'text-gray-300 hover:bg-gray-700/50'}`}
                >
                  <ChartIcon size={20} />
                  Статистика
                </button>
                <button 
                  onClick={() => handleNavigate('archive')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'archive' ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20' : 'text-gray-300 hover:bg-gray-700/50'}`}
                >
                  <Book size={20} />
                  Архив блюд
                </button>
                <button 
                  onClick={() => handleNavigate('profile')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'profile' ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20' : 'text-gray-300 hover:bg-gray-700/50'}`}
                >
                  <User size={20} />
                  Профиль
                </button>
                
                {/* Кнопка настроек питания */}
                <button 
                  onClick={() => {
                    setShowNutritionSettings(true);
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-gray-300 hover:bg-gray-700/50"
                >
                  <Settings size={20} />
                  Настройки питания
                </button>
              </nav>
            </div>
            
            <div className="mt-auto p-5 text-xs text-center text-gray-500 border-t border-gray-700">
              <div>NutriBot AI (Convex Backend)</div>
              <div className="text-gray-600">Версия {BUILD_VERSION}</div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex-none h-14 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-4 z-10 shadow-md">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsMenuOpen(true)}
            className="p-1 text-gray-300 hover:text-white transition-colors"
          >
            <Menu size={24} />
          </button>
          <h1 className="font-semibold text-lg tracking-tight">
            {getHeaderTitle()}
          </h1>
        </div>
        
        {/* Toggle Stats/Chat */}
        <div className="flex bg-gray-700 rounded-lg p-1">
            <button 
                onClick={() => setActiveTab('chat')}
                className={`p-1.5 rounded-md transition-all ${activeTab === 'chat' ? 'bg-gray-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
            >
                <MessageSquare size={18} />
            </button>
            <button 
                onClick={() => setActiveTab('stats')}
                className={`p-1.5 rounded-md transition-all ${activeTab === 'stats' ? 'bg-gray-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
            >
                <ChartIcon size={18} />
            </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative">
        
        {/* Chat View */}
        <div className={`absolute inset-0 flex flex-col transition-transform duration-300 ${activeTab === 'chat' ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {/* Прогресс-бар питания */}
                <NutritionProgressBar 
                  progress={nutritionProgress} 
                  isEnabled={userSettings?.isTrackingEnabled || false} 
                />
                
                {messages.map((msg) => (
                    <ChatMessageBubble 
                        key={msg.id} 
                        message={msg} 
                        onAddLog={undefined} // Автосохранение - кнопка не нужна
                        isAdded={msg.data && allLogs.some(log => log.name === msg.data?.name && Math.abs(log.timestamp - msg.timestamp) < 60000)} 
                        autoSaved={msg.data && allLogs.some(log => log.name === msg.data?.name && Math.abs(log.timestamp - msg.timestamp) < 60000)}
                    />
                ))}
                {isLoading && (
                    <div className="flex w-full mb-4 justify-start">
                        <div className="bg-gray-800 p-3 rounded-2xl rounded-bl-none border border-gray-700 flex items-center gap-2 text-gray-400 text-sm">
                            <div className="animate-pulse flex gap-1">
                                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full"></span>
                                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animation-delay-200"></span>
                                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animation-delay-400"></span>
                            </div>
                            Анализирую (на сервере)...
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="flex-none p-3 bg-gray-800 border-t border-gray-700 pb-safe">
                <div className="max-w-4xl mx-auto flex items-end gap-2">
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="p-3 text-gray-400 hover:text-blue-400 transition-colors bg-gray-700/50 rounded-full hover:bg-gray-700"
                    >
                        <Camera size={22} />
                    </button>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileUpload} 
                        accept="image/*" 
                        className="hidden" 
                    />
                    
                    <div className="flex-1 bg-gray-900 rounded-2xl border border-gray-700 flex items-center px-4 py-2 focus-within:border-blue-500 transition-colors">
                        <textarea
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage();
                                }
                            }}
                            placeholder="Сообщение..."
                            className="w-full bg-transparent border-none focus:ring-0 text-gray-100 resize-none max-h-24 py-1"
                            rows={1}
                            style={{ minHeight: '24px' }}
                        />
                    </div>
                    
                    <button 
                        onClick={() => handleSendMessage()}
                        disabled={!inputText.trim() && !isLoading}
                        className={`p-3 rounded-full transition-all ${
                            inputText.trim() 
                             ? 'bg-blue-600 text-white shadow-lg hover:bg-blue-500 transform hover:scale-105' 
                             : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        }`}
                    >
                        <Send size={20} />
                    </button>
                </div>
            </div>
        </div>

        {/* Stats View */}
        <div className={`absolute inset-0 bg-gray-900 transition-transform duration-300 ${activeTab === 'stats' ? 'translate-x-0' : (activeTab === 'archive' || activeTab === 'profile' ? '-translate-x-full' : 'translate-x-full')}`}>
             {activeTab === 'stats' && (
                <>
                    <Suspense fallback={<div className="p-4 text-gray-400">Загрузка статистики...</div>}>
                      <DailyStatsDashboard log={todayLog} weeklyData={weeklyStats} />
                    </Suspense>
                    <button 
                        onClick={() => setActiveTab('chat')}
                        className="absolute bottom-6 right-6 bg-blue-600 hover:bg-blue-500 text-white p-4 rounded-full shadow-lg shadow-blue-900/40 transition-transform hover:scale-110 z-20"
                    >
                        <Plus size={24} />
                    </button>
                </>
             )}
        </div>

        {/* Archive View */}
        <div className={`absolute inset-0 bg-gray-900 transition-transform duration-300 ${activeTab === 'archive' ? 'translate-x-0' : (activeTab === 'profile' ? '-translate-x-full' : 'translate-x-full')}`}>
             {activeTab === 'archive' && (
                <Suspense fallback={<div className="p-4 text-gray-400">Загрузка архива...</div>}>
                  <FoodArchive 
                    logs={allLogs} 
                    onDelete={handleDeleteLog} 
                    onUpdate={handleUpdateLog}
                  />
                </Suspense>
             )}
        </div>

        {/* Profile View */}
        <div className={`absolute inset-0 bg-gray-900 transition-transform duration-300 ${activeTab === 'profile' ? 'translate-x-0' : 'translate-x-full'}`}>
             {activeTab === 'profile' && (
                <div className="h-full overflow-y-auto p-4">
                  <div className="max-w-2xl mx-auto space-y-6">
                    {/* Заголовок профиля */}
                    <div className="text-center mb-8">
                      <div className="w-20 h-20 bg-gradient-to-tr from-blue-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <User size={32} className="text-white" />
                      </div>
                      <h2 className="text-2xl font-bold text-white mb-2">
                        {userName || 'Пользователь'}
                      </h2>
                      <p className="text-gray-400">ID: {userId || 'Не определен'}</p>
                      {!isAuthenticated && (
                        <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                          <p className="text-yellow-400 text-sm">
                            ⚠️ Аутентификация через Telegram недоступна. Данные не будут сохраняться.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Информация о прогрессе */}
                    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <ChartIcon size={20} className="text-blue-400" />
                        Прогресс на сегодня
                      </h3>
                      <NutritionProgressBar 
                        progress={nutritionProgress} 
                        isEnabled={userSettings?.isTrackingEnabled || false} 
                      />
                    </div>

                    {/* Настройки целей */}
                    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                      <Suspense fallback={<div className="text-gray-400">Загрузка настроек...</div>}>
                        <NutritionGoalsSettings 
                          onClose={handleProfileSettingsClose}
                        />
                      </Suspense>
                    </div>
                  </div>
                </div>
             )}
        </div>

      </main>
      
      {/* Модальное окно настроек питания */}
      {showNutritionSettings && (
        <Suspense fallback={<div className="absolute inset-0 bg-gray-900/80 text-gray-300 flex items-center justify-center">Загрузка настроек...</div>}>
          <NutritionGoalsSettings 
            onClose={() => setShowNutritionSettings(false)} 
          />
        </Suspense>
      )}
    </div>
  );
};

export default App;
