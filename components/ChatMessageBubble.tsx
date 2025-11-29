import React from 'react';
import { ChatMessage, NutrientData } from '../types';
import { ChefHat, Database, Flame, Dumbbell, Droplet, Wheat, Sprout, Scale, Magnet } from 'lucide-react';

interface Props {
  message: ChatMessage;
  onAddLog?: (data: NutrientData & { imageStorageId?: string }) => void;
  isAdded?: boolean;
  autoSaved?: boolean; // Новый prop для индикации автосохранения
}

const ChatMessageBubble: React.FC<Props> = ({ message, onAddLog, isAdded, autoSaved }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex w-full mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[85%] md:max-w-[70%] flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        
        {/* Message Bubble */}
        <div
          className={`p-3 rounded-2xl shadow-sm text-sm md:text-base leading-relaxed whitespace-pre-wrap ${
            isUser
              ? 'bg-blue-600 text-white rounded-br-none'
              : 'bg-gray-800 text-gray-100 rounded-bl-none border border-gray-700'
          }`}
        >
          {message.image && (
            <img 
              src={message.image} 
              alt="User upload" 
              className="mb-2 rounded-lg max-h-48 object-cover w-full border border-gray-600" 
            />
          )}
          {message.text}
        </div>

        {/* Structured Data Card (Bot Only) */}
        {!isUser && message.data && (
          <div className="mt-2 w-full bg-gray-800 border border-gray-700 rounded-xl p-3 shadow-lg">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-bold text-green-400 flex items-center gap-2">
                <ChefHat size={16} />
                {message.data.name}
              </h3>
              <span className="text-xs bg-gray-700 px-2 py-1 rounded text-gray-300 flex items-center gap-1">
                <Flame size={12} className="text-orange-500" />
                {message.data.calories} ккал
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center text-xs mb-3">
              <div className="bg-gray-900/50 p-1 rounded">
                <div className="text-blue-400 font-bold">{message.data.protein}г</div>
                <div className="text-gray-500 flex items-center justify-center gap-1"><Dumbbell size={10}/> Белки</div>
              </div>
              <div className="bg-gray-900/50 p-1 rounded">
                <div className="text-yellow-400 font-bold">{message.data.fat}г</div>
                <div className="text-gray-500 flex items-center justify-center gap-1"><Droplet size={10}/> Жиры</div>
              </div>
              <div className="bg-gray-900/50 p-1 rounded">
                <div className="text-orange-400 font-bold">{message.data.carbs}г</div>
                <div className="text-gray-500 flex items-center justify-center gap-1"><Wheat size={10}/> Угл</div>
              </div>
              <div className="bg-gray-900/50 p-1 rounded">
                <div className="text-green-500 font-bold">{message.data.fiber}г</div>
                <div className="text-gray-500 flex items-center justify-center gap-1"><Sprout size={10}/> Клетч</div>
              </div>
            </div>

            <div className="text-xs text-gray-400 space-y-1 mb-3">
               <div className="flex justify-between border-b border-gray-700 pb-1">
                 <span className="flex items-center gap-1"><Scale size={12} className="text-blue-300"/> Омега 3:6</span>
                 <span className="text-white">{message.data.omega3to6Ratio}</span>
               </div>
               <div className="flex justify-between border-b border-gray-700 pb-1">
                 <span className="flex items-center gap-1"><Magnet size={12} className="text-red-400"/> Тип железа</span>
                 <span className="text-white">{message.data.ironType}</span>
               </div>
               {message.data.importantNutrients.length > 0 && (
                 <div className="pt-1">
                   <span className="block mb-1 text-gray-500">Важные нутриенты:</span>
                   <div className="flex flex-wrap gap-1">
                     {message.data.importantNutrients.map((n, i) => (
                       <span key={i} className="bg-indigo-900/50 text-indigo-300 px-1.5 py-0.5 rounded text-[10px]">
                         {n}
                       </span>
                     ))}
                   </div>
                 </div>
               )}
            </div>

            {/* Автосохранение индикация */}
            <div className="flex items-center justify-center py-2">
              {autoSaved || isAdded ? (
                <div className="flex items-center gap-2 text-green-400 text-sm">
                  <Database size={14} />
                  ✓ Автоматически сохранено в дневник
                </div>
              ) : onAddLog ? (
                <button
                  onClick={() => onAddLog(message.data!)}
                  className="w-full py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors bg-blue-600 hover:bg-blue-500 text-white"
                >
                  <Database size={14} /> Добавить в дневник
                </button>
              ) : null}
            </div>
          </div>
        )}

        <div className="text-[10px] text-gray-500 mt-1 px-1">
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
};

export default ChatMessageBubble;
