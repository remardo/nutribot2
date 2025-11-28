
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Camera, Send, PieChart as ChartIcon, MessageSquare, Plus, ArrowLeft, Menu, X, User, Settings, FileText, Calendar, Book } from 'lucide-react';
import { ChatMessage, DailyLogItem, NutrientData, DailyStats, DayStats } from './types';
import ChatMessageBubble from './components/ChatMessageBubble';
import DailyStatsDashboard from './components/DailyStatsDashboard';
import FoodArchive from './components/FoodArchive';
import { sendMessageToGemini } from './services/geminiService';
import * as db from './services/dbService';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'chat' | 'stats' | 'archive'>('chat');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // We now store ALL logs in state to support the Archive view
  const [allLogs, setAllLogs] = useState<DailyLogItem[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<DayStats[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Derived state for today's log (for Stats and Context)
  const todayLog = useMemo(() => {
    const today = new Date().toDateString();
    return allLogs.filter(item => new Date(item.timestamp).toDateString() === today);
  }, [allLogs]);

  // Initial load and Telegram Init
  useEffect(() => {
    // Initialize Telegram Web App
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
    }

    // Load all logs
    setAllLogs(db.getAllLogs());
    setWeeklyStats(db.getLast7DaysStats());
    
    // Initial bot message
    setMessages([
      {
        id: 'init',
        role: 'model',
        text: "👋 Привет! Я NutriBot. Отправь мне фото еды или напиши, что ты съел, и я рассчитаю КБЖУ и нутриенты.",
        timestamp: Date.now()
      }
    ]);
  }, []);

  // Handle Telegram Back Button
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;

    const handleBack = () => {
      if (isMenuOpen) {
        setIsMenuOpen(false);
      } else if (activeTab !== 'chat') {
        setActiveTab('chat');
      }
    };

    if (activeTab !== 'chat' || isMenuOpen) {
      tg.BackButton.show();
      tg.BackButton.onClick(handleBack);
    } else {
      tg.BackButton.hide();
    }

    return () => {
      tg.BackButton.offClick(handleBack);
    };
  }, [activeTab, isMenuOpen]);

  // Scroll to bottom
  useEffect(() => {
    if (activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  const handleSendMessage = async (text?: string, image?: string) => {
    const content = text || inputText;
    if ((!content.trim() && !image) || isLoading) return;

    setInputText('');
    
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text: content,
      image: image,
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
        totalFiber: acc.totalFiber + item.fiber
      }), {
         totalCalories: 0,
         totalProtein: 0,
         totalFat: 0,
         totalCarbs: 0,
         totalFiber: 0
      } as DailyStats);

      const response = await sendMessageToGemini(messages, content, image, stats);

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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        handleSendMessage("Проанализируй это изображение", base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddToLog = (data: NutrientData) => {
    const newItem = db.addToDailyLog(data);
    
    // Update local state by adding new item at the beginning (assuming descending order) or just reload
    // Since we are sorting descending in getAllLogs, let's prepend
    setAllLogs(prev => [newItem, ...prev].sort((a,b) => b.timestamp - a.timestamp));
    setWeeklyStats(db.getLast7DaysStats()); // Update chart data
    
    // Switch to stats to show progress
    setActiveTab('stats');
  };

  const handleUpdateLog = (id: string, updates: Partial<DailyLogItem>) => {
    const updatedLogs = db.updateLogItem(id, updates);
    setAllLogs(updatedLogs.sort((a, b) => b.timestamp - a.timestamp));
    // Usually stats don't change if we only edit the note, but good to keep consistent
    setWeeklyStats(db.getLast7DaysStats());
  };

  const handleDeleteLog = (id: string) => {
    if (window.confirm('Вы уверены, что хотите удалить эту запись?')) {
      db.deleteLogItem(id);
      // Update state
      setAllLogs(prev => prev.filter(item => item.id !== id));
      setWeeklyStats(db.getLast7DaysStats()); // Recalculate stats
    }
  };

  const handleNavigate = (tab: 'chat' | 'stats' | 'archive') => {
    setActiveTab(tab);
    setIsMenuOpen(false);
  };

  const getHeaderTitle = () => {
    switch(activeTab) {
      case 'chat': return 'Чат';
      case 'stats': return 'Личный кабинет';
      case 'archive': return 'Архив блюд';
      default: return 'NutriBot';
    }
  };

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
              <div className="flex items-center gap-3 p-3 bg-gray-700/30 rounded-xl mb-6 border border-gray-700">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-lg font-bold shadow-inner text-white">
                  U
                </div>
                <div>
                  <div className="font-semibold text-white">Пользователь</div>
                  <div className="text-xs text-gray-400">user@example.com</div>
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
                  <User size={20} />
                  Личный кабинет
                </button>
                <button 
                  onClick={() => handleNavigate('archive')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'archive' ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20' : 'text-gray-300 hover:bg-gray-700/50'}`}
                >
                  <Book size={20} />
                  Архив блюд
                </button>
                <div className="pt-4 mt-4 border-t border-gray-700/50">
                  <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-700/30 transition-colors">
                    <Settings size={20} />
                    Настройки
                  </button>
                </div>
              </nav>
            </div>
            
            <div className="mt-auto p-5 text-xs text-center text-gray-500 border-t border-gray-700">
              NutriBot AI v1.0.0
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
                {messages.map((msg) => (
                    <ChatMessageBubble 
                        key={msg.id} 
                        message={msg} 
                        onAddLog={handleAddToLog} 
                        isAdded={msg.data && allLogs.some(log => log.name === msg.data?.name && Math.abs(log.timestamp - msg.timestamp) < 60000)} 
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
                            Анализирую...
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
        <div className={`absolute inset-0 bg-gray-900 transition-transform duration-300 ${activeTab === 'stats' ? 'translate-x-0' : (activeTab === 'archive' ? '-translate-x-full' : 'translate-x-full')}`}>
             {activeTab === 'stats' && (
                <>
                    <DailyStatsDashboard log={todayLog} weeklyData={weeklyStats} />
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