import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Camera, Send, PieChart as ChartIcon, MessageSquare, Plus, Menu, X, User, Settings, Book, Trash2, Mic, MicOff } from 'lucide-react';
import { ChatMessage, DailyLogItem, NutrientData, DailyStats, DayStats, UserGoals, Wallet } from './types';
import ChatMessageBubble from './components/ChatMessageBubble';
import DailyStatsDashboard from './components/DailyStatsDashboard';
import FoodArchive from './components/FoodArchive';
import TypingIndicator from './components/TypingIndicator';
import SettingsModal from './components/SettingsModal';
import { sendMessageToGemini } from './services/geminiService';
import * as db from './services/dbService';
import { processNewLog, calculatePlateRating } from './services/gamificationService';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'chat' | 'stats' | 'archive'>('chat');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Notification State
  const [rewardNotification, setRewardNotification] = useState<{show: boolean, rewards: Partial<Wallet>}>({show: false, rewards: {}});
  
  const [allLogs, setAllLogs] = useState<DailyLogItem[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<DayStats[]>([]);
  const [userGoals, setUserGoals] = useState<UserGoals>(db.getUserGoals());
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Hook for Speech Recognition
  const { isListening, toggleListening } = useSpeechRecognition((transcript) => {
    setInputText(prev => {
      const spacer = prev && !prev.endsWith(' ') ? ' ' : '';
      return prev + spacer + transcript;
    });
  });

  // Derived state for today's log (for Stats and Context)
  const todayLog = useMemo(() => {
    const today = new Date().toDateString();
    return allLogs.filter(item => new Date(item.timestamp).toDateString() === today);
  }, [allLogs]);

  // Initial load
  useEffect(() => {
    setAllLogs(db.getAllLogs());
    setWeeklyStats(db.getLast7DaysStats());
    
    const savedChat = db.getChatHistory();
    if (savedChat.length > 0) {
      setMessages(savedChat);
    } else {
      setMessages([
        {
          id: 'init',
          role: 'model',
          text: "👋 Привет! Я NutriBot. Отправь мне фото еды или напиши, что ты съел, и я рассчитаю КБЖУ и нутриенты.",
          timestamp: Date.now()
        }
      ]);
    }
  }, []);

  // Save Chat History whenever it changes
  useEffect(() => {
    if (messages.length > 0) {
      db.saveChatHistory(messages);
    }
  }, [messages]);

  // Scroll to bottom
  useEffect(() => {
    if (activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab, isLoading]);

  // Hide notification after 3s
  useEffect(() => {
      if (rewardNotification.show) {
          const timer = setTimeout(() => {
              setRewardNotification(prev => ({...prev, show: false}));
          }, 4000);
          return () => clearTimeout(timer);
      }
  }, [rewardNotification.show]);

  const handleSendMessage = async (text?: string, images?: string[]) => {
    const content = text || inputText;
    const hasImages = images && images.length > 0;
    
    if ((!content.trim() && !hasImages) || isLoading) return;

    setInputText('');
    
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text: content,
      images: images,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      // Calculate current stats to give context to Gemini
      const stats = todayLog.reduce((acc, item) => ({
        totalCalories: acc.totalCalories + item.calories,
        totalProtein: acc.totalProtein + item.protein,
        totalFat: acc.totalFat + item.fat,
        totalCarbs: acc.totalCarbs + item.carbs,
        totalFiber: acc.totalFiber + item.fiber,
        totalOmega3: acc.totalOmega3 + (item.omega3 || 0),
        totalOmega6: acc.totalOmega6 + (item.omega6 || 0),
        totalIron: acc.totalIron + (item.ironTotal || 0),
        totalHemeIron: acc.totalHemeIron + (item.hemeIron || 0),
      }), {
         totalCalories: 0,
         totalProtein: 0,
         totalFat: 0,
         totalCarbs: 0,
         totalFiber: 0,
         totalOmega3: 0,
         totalOmega6: 0,
         totalIron: 0,
         totalHemeIron: 0
      } as DailyStats);

      const response = await sendMessageToGemini(messages, content, images, stats);

      const botMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'model',
        text: response.text,
        data: response.data,
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, botMsg]);

    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setIsLoading(true); 
      
      const promises = Array.from(files).map(file => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve(reader.result as string); 
          };
          reader.readAsDataURL(file as Blob);
        });
      });

      try {
        const base64Images = await Promise.all(promises);
        const msgText = files.length > 1 
          ? `Проанализируй эти ${files.length} фото` 
          : "Проанализируй это изображение";
          
        setIsLoading(false); 
        handleSendMessage(msgText, base64Images);
      } catch (err) {
        console.error("Error reading files", err);
        setIsLoading(false);
      }
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAddToLog = (data: NutrientData, aiText?: string) => {
    const plateRating = calculatePlateRating(data, userGoals);

    const newItem = db.addToDailyLog({
      ...data,
      aiAnalysis: aiText,
      plateRating: plateRating 
    });
    
    const updatedLogs = [newItem, ...allLogs].sort((a,b) => b.timestamp - a.timestamp);
    setAllLogs(updatedLogs);
    setWeeklyStats(db.getLast7DaysStats());
    
    const currentTodayLogs = updatedLogs.filter(item => 
        new Date(item.timestamp).toDateString() === new Date().toDateString()
    );
    
    const { rewards } = processNewLog(newItem, currentTodayLogs, userGoals);
    
    if (rewards.energy || rewards.balance || rewards.mindfulness) {
        setRewardNotification({ show: true, rewards });
    }
    
    setActiveTab('stats');
  };

  const handleUpdateLog = (id: string, updates: Partial<DailyLogItem>) => {
    const updatedLogs = db.updateLogItem(id, updates);
    setAllLogs(updatedLogs.sort((a, b) => b.timestamp - a.timestamp));
    setWeeklyStats(db.getLast7DaysStats());
  };

  const handleDeleteLog = (id: string) => {
    if (window.confirm('Вы уверены, что хотите удалить эту запись?')) {
      db.deleteLogItem(id);
      setAllLogs(prev => prev.filter(item => item.id !== id));
      setWeeklyStats(db.getLast7DaysStats());
    }
  };

  const handleClearChat = () => {
    if (window.confirm('Очистить историю чата?')) {
        db.clearChatHistory();
        setMessages([
            {
              id: 'init',
              role: 'model',
              text: "Чат очищен. Чем я могу помочь?",
              timestamp: Date.now()
            }
        ]);
        setIsMenuOpen(false);
    }
  };

  const handleOpenSettings = () => {
    setIsMenuOpen(false);
    setIsSettingsOpen(true);
  };

  const handleSaveGoals = (newGoals: UserGoals) => {
    db.saveUserGoals(newGoals);
    setUserGoals(newGoals);
  };

  const handleQuickGoalUpdate = (key: keyof UserGoals, delta: number) => {
      const currentVal = userGoals[key];
      const newVal = Math.max(0, parseFloat((currentVal + delta).toFixed(1)));
      const newGoals = { ...userGoals, [key]: newVal };
      handleSaveGoals(newGoals);
  };

  const handleNavigate = (tab: 'chat' | 'stats' | 'archive') => {
    setActiveTab(tab);
    setIsMenuOpen(false);
  };

  const getHeaderTitle = () => {
    switch(activeTab) {
      case 'chat': return 'Чат';
      case 'stats': return 'Экспедиция'; 
      case 'archive': return 'Архив блюд';
      default: return 'NutriBot';
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-gray-100 font-sans relative overflow-hidden">
      
      {rewardNotification.show && (
          <div className="absolute top-16 left-1/2 transform -translate-x-1/2 bg-gray-800 border border-green-500/50 shadow-2xl rounded-xl px-6 py-4 z-50 animate-fade-in-up flex items-center gap-4">
              <div className="text-green-400 font-bold">Награда получена!</div>
              <div className="flex gap-3">
                  {rewardNotification.rewards.energy && (
                      <span className="text-yellow-400 font-bold text-sm">+{rewardNotification.rewards.energy} Energy</span>
                  )}
                  {rewardNotification.rewards.balance && (
                      <span className="text-blue-400 font-bold text-sm">+{rewardNotification.rewards.balance} Balance</span>
                  )}
              </div>
          </div>
      )}

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        currentGoals={userGoals} 
        onSave={handleSaveGoals} 
      />

      {isMenuOpen && (
        <div className="absolute inset-0 z-50 flex">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsMenuOpen(false)}
          />
          
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
                  <User size={20} />
                  Нутри-Экспедиция
                </button>
                <button 
                  onClick={() => handleNavigate('archive')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'archive' ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20' : 'text-gray-300 hover:bg-gray-700/50'}`}
                >
                  <Book size={20} />
                  Архив блюд
                </button>
                <div className="pt-4 mt-4 border-t border-gray-700/50">
                  <button 
                    onClick={handleClearChat}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-900/20 transition-colors"
                  >
                    <Trash2 size={20} />
                    Очистить чат
                  </button>
                  <button 
                    onClick={handleOpenSettings}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-700/30 transition-colors"
                  >
                    <Settings size={20} />
                    Настройки
                  </button>
                </div>
              </nav>
            </div>
            
            <div className="mt-auto p-5 text-xs text-center text-gray-500 border-t border-gray-700">
              NutriBot AI v2.0
            </div>
          </div>
        </div>
      )}

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

      <main className="flex-1 overflow-hidden relative">
        
        <div className={`absolute inset-0 flex flex-col transition-transform duration-300 ${activeTab === 'chat' ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {messages.map((msg) => (
                    <ChatMessageBubble 
                        key={msg.id} 
                        message={msg} 
                        onAddLog={handleAddToLog} 
                        isAdded={msg.data && allLogs.some(log => log.name === msg.data?.name && Math.abs(log.timestamp - msg.timestamp) < 60000)} 
                    />
                ))}
                {isLoading && (
                   <TypingIndicator />
                )}
                <div ref={messagesEndRef} />
            </div>

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
                        multiple 
                        className="hidden" 
                    />
                    
                    <button
                        onClick={toggleListening}
                        className={`p-3 rounded-full transition-all duration-300 ${
                            isListening 
                            ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30 animate-pulse ring-1 ring-red-500/50' 
                            : 'text-gray-400 hover:text-blue-400 bg-gray-700/50 hover:bg-gray-700'
                        }`}
                    >
                        {isListening ? <MicOff size={22} /> : <Mic size={22} />}
                    </button>

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
                            placeholder={isListening ? "Слушаю..." : "Сообщение..."}
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

        <div className={`absolute inset-0 bg-gray-900 transition-transform duration-300 ${activeTab === 'stats' ? 'translate-x-0' : (activeTab === 'archive' ? '-translate-x-full' : 'translate-x-full')}`}>
             {activeTab === 'stats' && (
                <>
                    <DailyStatsDashboard 
                        log={todayLog} 
                        weeklyData={weeklyStats} 
                        allLogs={allLogs}
                        userGoals={userGoals}
                        onUpdateGoal={handleQuickGoalUpdate}
                    />
                    <button 
                        onClick={() => setActiveTab('chat')}
                        className="absolute bottom-6 right-6 bg-blue-600 hover:bg-blue-500 text-white p-4 rounded-full shadow-lg shadow-blue-900/40 transition-transform hover:scale-110 z-20"
                    >
                        <Plus size={24} />
                    </button>
                </>
             )}
        </div>

        <div className={`absolute inset-0 bg-gray-900 transition-transform duration-300 ${activeTab === 'archive' ? 'translate-x-0' : 'translate-x-full'}`}>
             {activeTab === 'archive' && (
                <FoodArchive 
                  logs={allLogs} 
                  onDelete={handleDeleteLog} 
                  onUpdate={handleUpdateLog}
                />
             )}
        </div>

      </main>
    </div>
  );
};

export default App;