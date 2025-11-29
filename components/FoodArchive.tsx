
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { DailyLogItem } from '../types';
import { Calendar, Trash2, Clock, Flame, Dumbbell, Droplet, Wheat, Search, X, Filter, Download, MessageSquare, Check, Edit2, Save, Image as ImageIcon } from 'lucide-react';

interface Props {
  logs: DailyLogItem[];
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<DailyLogItem>) => void;
}

const FoodArchive: React.FC<Props> = ({ logs, onDelete, onUpdate }) => {
  const [filterDate, setFilterDate] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState<string>('');
  const [lastAutoSaved, setLastAutoSaved] = useState<Date | null>(null);

  const noteTextRef = useRef(noteText);

  useEffect(() => {
    noteTextRef.current = noteText;
  }, [noteText]);

  // Auto-save Interval
  useEffect(() => {
    let interval: number | undefined;
    
    if (editingId) {
      setLastAutoSaved(null);
      interval = window.setInterval(() => {
        if (editingId && noteTextRef.current) {
          console.log('Auto-saving note...');
          onUpdate(editingId, { note: noteTextRef.current });
          setLastAutoSaved(new Date());
        }
      }, 30000); 
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [editingId, onUpdate]);

  const filteredLogs = useMemo(() => {
    if (!filterDate) return logs;
    return logs.filter(item => {
      const d = new Date(item.timestamp);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      return dateStr === filterDate;
    });
  }, [logs, filterDate]);

  const groupedLogs = useMemo(() => {
    const groups: Record<string, DailyLogItem[]> = {};
    const sorted = [...filteredLogs].sort((a, b) => b.timestamp - a.timestamp);

    // Prepare comparison dates (normalized to midnight)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    sorted.forEach(item => {
      const itemDate = new Date(item.timestamp);
      const itemDateNormalized = new Date(itemDate);
      itemDateNormalized.setHours(0, 0, 0, 0);

      let groupTitle = '';

      if (itemDateNormalized.getTime() === today.getTime()) {
        groupTitle = 'Сегодня';
      } else if (itemDateNormalized.getTime() === yesterday.getTime()) {
        groupTitle = 'Вчера';
      } else {
        groupTitle = itemDate.toLocaleDateString('ru-RU', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
      }

      if (!groups[groupTitle]) {
        groups[groupTitle] = [];
      }
      groups[groupTitle].push(item);
    });
    
    return groups;
  }, [filteredLogs]);

  const dates = Object.keys(groupedLogs);
  
  const summary = useMemo(() => {
    return filteredLogs.reduce((acc, item) => ({
        calories: acc.calories + item.calories,
        protein: acc.protein + item.protein,
        fat: acc.fat + item.fat,
        carbs: acc.carbs + item.carbs
    }), { calories: 0, protein: 0, fat: 0, carbs: 0 });
  }, [filteredLogs]);

  const handleExport = () => {
    if (filteredLogs.length === 0) return;

    const headers = [
        "Дата", 
        "Время", 
        "Название", 
        "Калории (ккал)", 
        "Белки (г)", 
        "Жиры (г)", 
        "Углеводы (г)", 
        "Клетчатка (г)",
        "Омега 3:6",
        "Тип железа",
        "Важные нутриенты",
        "Примечание"
    ];

    const rows = filteredLogs.map(item => {
        const dateObj = new Date(item.timestamp);
        const date = dateObj.toLocaleDateString('ru-RU');
        const time = dateObj.toLocaleTimeString('ru-RU');
        
        const safeName = `"${item.name.replace(/"/g, '""')}"`; 
        const safeIron = `"${item.ironType}"`;
        const safeOmega = `"${item.omega3to6Ratio}"`;
        const safeNote = item.note ? `"${item.note.replace(/"/g, '""')}"` : "";
        const safeNutrients = item.importantNutrients ? `"${item.importantNutrients.join('; ')}"` : "";

        return [
            date,
            time,
            safeName,
            item.calories,
            item.protein,
            item.fat,
            item.carbs,
            item.fiber,
            safeOmega,
            safeIron,
            safeNutrients,
            safeNote
        ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `nutribot_export_${filterDate || 'all'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const startEditing = (id: string, currentNote?: string) => {
    setEditingId(id);
    setNoteText(currentNote || '');
    setLastAutoSaved(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setNoteText('');
    setLastAutoSaved(null);
  };

  const saveNote = (id: string) => {
    onUpdate(id, { note: noteText });
    setEditingId(null);
    setNoteText('');
    setLastAutoSaved(null);
  };

  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    if (e.relatedTarget && (e.relatedTarget as HTMLElement).dataset.action === 'cancel') {
      return;
    }
    if (editingId) {
      saveNote(editingId);
    }
  };

  return (
    <div className="h-full overflow-y-auto pb-24 p-4 space-y-4 bg-gray-900">
      <div className="flex items-center justify-between mb-2">
         <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white shadow-lg">
                <Calendar size={20} />
            </div>
            <div>
                <h2 className="text-xl font-bold text-white">Архив блюд</h2>
                <div className="text-xs text-gray-400">История питания</div>
            </div>
         </div>
         
         <button
            onClick={handleExport}
            disabled={filteredLogs.length === 0}
            className={`p-2.5 rounded-lg border transition-colors flex items-center gap-2 ${
                filteredLogs.length === 0 
                ? 'bg-gray-800 border-gray-700 text-gray-600 cursor-not-allowed' 
                : 'bg-gray-800 border-gray-600 text-blue-400 hover:bg-gray-700 hover:text-white hover:border-blue-500 shadow-sm'
            }`}
         >
            <Download size={20} />
            <span className="hidden sm:inline text-sm font-medium">Экспорт</span>
         </button>
      </div>

      <div className="bg-gray-800 p-3 rounded-xl border border-gray-700 shadow-sm">
        <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-400" />
            <span className="text-sm text-gray-300 font-medium">Фильтр по дате:</span>
        </div>
        <div className="mt-2 flex gap-2">
            <div className="relative flex-1">
                <input 
                    type="date" 
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 [color-scheme:dark]"
                />
            </div>
            {filterDate && (
                <button 
                    onClick={() => setFilterDate('')}
                    className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center justify-center"
                >
                    <X size={18} />
                </button>
            )}
        </div>
      </div>

      {filteredLogs.length > 0 && (
          <div className="grid grid-cols-4 gap-2 bg-gray-800/50 p-3 rounded-xl border border-gray-700/50">
              <div className="text-center">
                  <div className="text-gray-400 text-[10px] uppercase">Ккал</div>
                  <div className="text-white font-bold">{summary.calories.toFixed(0)}</div>
              </div>
              <div className="text-center">
                  <div className="text-gray-400 text-[10px] uppercase">Белки</div>
                  <div className="text-blue-400 font-bold">{summary.protein.toFixed(1)}</div>
              </div>
              <div className="text-center">
                  <div className="text-gray-400 text-[10px] uppercase">Жиры</div>
                  <div className="text-yellow-400 font-bold">{summary.fat.toFixed(1)}</div>
              </div>
              <div className="text-center">
                  <div className="text-gray-400 text-[10px] uppercase">Угл</div>
                  <div className="text-orange-400 font-bold">{summary.carbs.toFixed(1)}</div>
              </div>
          </div>
      )}

      {filteredLogs.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-gray-500 text-center">
          <Search size={48} className="mb-4 opacity-30" />
          <h3 className="text-lg font-medium mb-2">Записей не найдено</h3>
          <p className="text-sm px-6">
            {filterDate ? 'На выбранную дату нет записей.' : 'История пуста.'}
          </p>
          {filterDate && (
              <button 
                onClick={() => setFilterDate('')}
                className="mt-4 text-blue-400 hover:text-blue-300 text-sm"
              >
                  Показать все записи
              </button>
          )}
        </div>
      )}

      {dates.map((date) => {
        const dayItems = groupedLogs[date];
        const dayTotalKcal = dayItems.reduce((sum, i) => sum + i.calories, 0);

        return (
          <div key={date} className="animate-fade-in-up">
            <div className="flex justify-between items-center px-2 mb-2 sticky top-0 bg-gray-900/95 py-2 z-10 backdrop-blur-sm border-b border-gray-800/50">
              <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider">{date}</h3>
              <span className="text-xs font-mono text-gray-400">
                {dayTotalKcal} ккал
              </span>
            </div>
            
            <div className="space-y-3">
              {dayItems.map((item) => (
                <div key={item.id} className="bg-gray-800 rounded-xl p-3 border border-gray-700 shadow-sm relative group hover:border-gray-600 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 pr-8">
                      <div className="flex items-center gap-2">
                         <div className="font-bold text-gray-200 text-base leading-tight">{item.name}</div>
                         {item.imageUrl && (
                           <a href={item.imageUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400">
                             <ImageIcon size={14} />
                           </a>
                         )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                        <Clock size={10} />
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                        <span className={item.ironType.includes('Гемовое') ? 'text-red-400/70' : 'text-gray-500'}>
                            {item.ironType}
                        </span>
                      </div>
                    </div>
                    
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => onDelete(item.id)}
                        className="text-gray-600 hover:text-red-400 p-2"
                        title="Удалить запись"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="mt-2 border-t border-gray-700/50 pt-2">
                    {editingId === item.id ? (
                      <div className="animate-fade-in relative">
                        <textarea
                          value={noteText}
                          onChange={(e) => setNoteText(e.target.value)}
                          onBlur={handleBlur}
                          placeholder="Добавьте описание или заметку..."
                          className="w-full bg-gray-900/50 border border-gray-600 rounded-lg p-2 text-sm text-gray-200 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                          rows={2}
                          autoFocus
                        />
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-[10px] text-gray-500 italic h-4">
                            {lastAutoSaved && `Сохранено ${lastAutoSaved.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}`}
                          </span>
                          <div className="flex gap-2">
                            <button 
                              data-action="cancel"
                              onClick={cancelEdit}
                              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                            >
                              <X size={16} />
                            </button>
                            <button 
                              onClick={() => saveNote(item.id)}
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium flex items-center gap-1 transition-colors"
                            >
                              <Check size={14} /> Сохранить
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div 
                        className="group/note cursor-pointer" 
                        onClick={() => startEditing(item.id, item.note)}
                      >
                        {item.note ? (
                          <div className="flex items-start justify-between gap-2">
                             <p className="text-sm text-gray-400 italic leading-relaxed">{item.note}</p>
                             <span className="text-gray-600 hover:text-blue-400 opacity-0 group-hover/note:opacity-100 transition-opacity p-1">
                               <Edit2 size={12} />
                             </span>
                          </div>
                        ) : (
                          <button 
                            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-400 transition-colors py-1"
                          >
                            <MessageSquare size={12} />
                            Добавить описание
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-4 gap-1 mt-3">
                     <div className="bg-gray-700/30 rounded p-1.5 flex flex-col items-center">
                        <span className="text-[10px] text-gray-400 mb-0.5"><Flame size={10} /></span>
                        <span className="font-bold text-white text-xs">{item.calories}</span>
                     </div>
                     <div className="bg-gray-700/30 rounded p-1.5 flex flex-col items-center">
                        <span className="text-[10px] text-blue-400 mb-0.5"><Dumbbell size={10} /></span>
                        <span className="font-medium text-gray-300 text-xs">{item.protein}</span>
                     </div>
                     <div className="bg-gray-700/30 rounded p-1.5 flex flex-col items-center">
                        <span className="text-[10px] text-yellow-400 mb-0.5"><Droplet size={10} /></span>
                        <span className="font-medium text-gray-300 text-xs">{item.fat}</span>
                     </div>
                     <div className="bg-gray-700/30 rounded p-1.5 flex flex-col items-center">
                        <span className="text-[10px] text-orange-400 mb-0.5"><Wheat size={10} /></span>
                        <span className="font-medium text-gray-300 text-xs">{item.carbs}</span>
                     </div>
                  </div>

                  {item.importantNutrients && item.importantNutrients.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-700/30">
                       <span className="text-[10px] text-gray-500 block mb-1">Важные нутриенты:</span>
                       <div className="flex flex-wrap gap-1">
                         {item.importantNutrients.map((nutrient, idx) => (
                           <span key={idx} className="text-[10px] bg-indigo-900/30 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/20">
                             {nutrient}
                           </span>
                         ))}
                       </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <div className="h-4"></div>
          </div>
        );
      })}
    </div>
  );
};

export default FoodArchive;
