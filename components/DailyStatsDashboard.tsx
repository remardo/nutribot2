import React, { useMemo, useState } from 'react';
import { DailyLogItem, DailyStats, DayStats } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { Activity, Flame, Wheat, Droplet, Dumbbell, Target, BarChart2 } from 'lucide-react';

interface Props {
  log: DailyLogItem[];
  weeklyData?: DayStats[];
  dailyGoal?: number; // Калорийная цель дня
}

const COLORS = ['#3b82f6', '#eab308', '#f97316']; // Protein (Blue), Fat (Yellow), Carbs (Orange)

const DailyStatsDashboard: React.FC<Props> = ({ log, weeklyData = [], dailyGoal = 2200 }) => {
  const [chartMode, setChartMode] = useState<'all' | 'calories' | 'macros' | 'fiber'>('all');
  
  const stats: DailyStats = useMemo(() => {
    return log.reduce((acc, item) => ({
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
    });
  }, [log]);

  const macroData = [
    { name: 'Белки', value: stats.totalProtein },
    { name: 'Жиры', value: stats.totalFat },
    { name: 'Углеводы', value: stats.totalCarbs },
  ];

  return (
    <div className="h-full overflow-y-auto pb-24 p-4 space-y-6">
      
      {/* User Profile Header */}
      <div className="flex items-center gap-4 mb-2">
         <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg border-2 border-gray-800">
            U
         </div>
         <div>
            <h2 className="text-xl font-bold text-white">Личный кабинет</h2>
            <div className="flex items-center gap-2 text-sm text-gray-400">
                <span>Цель: {dailyGoal} ккал</span>
               <Target size={14} className="text-green-400" />
               <span>Цель: 2200 ккал</span>
            </div>
         </div>
      </div>

      {log.length === 0 && weeklyData.every(d => d.calories === 0) ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-500 text-center bg-gray-800 rounded-2xl border border-gray-700">
          <Activity size={48} className="mb-4 opacity-30" />
          <h3 className="text-xl font-medium mb-2">Нет данных</h3>
          <p className="text-sm px-4">Отправьте фото еды в чат, чтобы начать вести дневник.</p>
        </div>
      ) : (
        <>
            {/* Header Summary */}
            <div className="bg-gray-800 rounded-2xl p-5 border border-gray-700 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-100 flex items-center gap-2">
                    <Flame className="text-orange-500" size={20} />
                    Итоги дня
                </h2>
                <span className="text-2xl font-black text-white">{Math.round(stats.totalCalories)} <span className="text-sm font-normal text-gray-400">ккал</span></span>
                </div>
                
                {/* Fiber Progress - Simple Bar */}
                <div className="mb-4">
                    <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">Клетчатка</span>
                        <span className="text-green-400">{stats.totalFiber.toFixed(1)} / 30г</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                            className="bg-green-500 h-2 rounded-full transition-all duration-500" 
                            style={{ width: `${Math.min((stats.totalFiber / 30) * 100, 100)}%` }}
                        ></div>
                    </div>
                </div>
            </div>

            {/* Macros Chart */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-800 rounded-2xl p-4 border border-gray-700 shadow-sm min-h-[250px] flex flex-col">
                <h3 className="text-sm font-medium text-gray-400 mb-2 text-center">Баланс БЖУ</h3>
                <div className="flex-1 w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                        data={macroData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                        >
                        {macroData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                        </Pie>
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '8px' }}
                            itemStyle={{ color: '#fff' }}
                        />
                    </PieChart>
                    </ResponsiveContainer>
                    {/* Center Text Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                        <div className="text-xs text-gray-500">Всего</div>
                        <div className="font-bold text-white">{(stats.totalProtein + stats.totalFat + stats.totalCarbs).toFixed(0)}г</div>
                    </div>
                    </div>
                </div>
                
                {/* Legend */}
                <div className="flex justify-center gap-4 text-xs mt-2">
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span>Белки</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <span>Жиры</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                        <span>Угл.</span>
                    </div>
                </div>
                </div>

                {/* Detailed Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-1 gap-3">
                    <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex items-center justify-between">
                        <div>
                            <div className="text-gray-400 text-xs flex items-center gap-1"><Dumbbell size={12}/> Белки</div>
                            <div className="text-xl font-bold text-blue-400">{stats.totalProtein.toFixed(1)}г</div>
                        </div>
                        <div className="h-10 w-1 bg-blue-500/20 rounded-full">
                            <div className="bg-blue-500 w-full rounded-full" style={{ height: '40%' }}></div>
                        </div>
                    </div>
                    <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex items-center justify-between">
                        <div>
                            <div className="text-gray-400 text-xs flex items-center gap-1"><Droplet size={12}/> Жиры</div>
                            <div className="text-xl font-bold text-yellow-400">{stats.totalFat.toFixed(1)}г</div>
                        </div>
                        <div className="h-10 w-1 bg-yellow-500/20 rounded-full">
                            <div className="bg-yellow-500 w-full rounded-full" style={{ height: '60%' }}></div>
                        </div>
                    </div>
                    <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex items-center justify-between col-span-2 md:col-span-1">
                        <div>
                            <div className="text-gray-400 text-xs flex items-center gap-1"><Wheat size={12}/> Углеводы</div>
                            <div className="text-xl font-bold text-orange-400">{stats.totalCarbs.toFixed(1)}г</div>
                        </div>
                        <div className="h-10 w-1 bg-orange-500/20 rounded-full">
                            <div className="bg-orange-500 w-full rounded-full" style={{ height: '50%' }}></div>
                        </div>
                    </div>
                </div>
            </div>

             {/* Weekly Trend Chart */}
            <div className="bg-gray-800 rounded-2xl p-4 border border-gray-700 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
                <h3 className="text-sm font-bold text-gray-300 flex items-center gap-2">
                  <BarChart2 size={16} />
                  Динамика (7 дней)
                </h3>
                <div className="flex bg-gray-900/50 p-1 rounded-lg self-start sm:self-auto">
                    <button 
                        onClick={() => setChartMode('all')}
                        className={`px-3 py-1 text-xs rounded-md transition-all ${chartMode === 'all' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-gray-300'}`}
                    >
                        Все
                    </button>
                    <button 
                        onClick={() => setChartMode('calories')}
                        className={`px-3 py-1 text-xs rounded-md transition-all ${chartMode === 'calories' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-gray-300'}`}
                    >
                        Ккал
                    </button>
                    <button 
                        onClick={() => setChartMode('macros')}
                        className={`px-3 py-1 text-xs rounded-md transition-all ${chartMode === 'macros' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-gray-300'}`}
                    >
                        БЖУ
                    </button>
                    <button 
                        onClick={() => setChartMode('fiber')}
                        className={`px-3 py-1 text-xs rounded-md transition-all ${chartMode === 'fiber' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-gray-300'}`}
                    >
                        Клетч
                    </button>
                </div>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={weeklyData} margin={{ top: 20, right: -20, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#9ca3af', fontSize: 10 }} 
                      dy={10}
                    />
                    {/* Left Axis for Macros (Grams) */}
                    {(chartMode === 'all' || chartMode === 'macros' || chartMode === 'fiber') && (
                        <YAxis 
                        yAxisId="left" 
                        orientation="left"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#9ca3af', fontSize: 10 }}
                        width={30}
                        />
                    )}
                    {/* Right Axis for Calories */}
                    {(chartMode === 'all' || chartMode === 'calories') && (
                        <YAxis 
                        yAxisId="right" 
                        orientation="right" 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#f87171', fontSize: 10 }}
                        width={35}
                        />
                    )}
                    <Tooltip 
                      cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                      contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                      formatter={(value: number, name: string) => {
                          const labels: Record<string, string> = {
                              calories: 'Ккал',
                              protein: 'Белки (г)',
                              fat: 'Жиры (г)',
                              carbs: 'Угл (г)',
                              fiber: 'Клетч (г)'
                          };
                          return [value.toFixed(0), labels[name] || name];
                      }}
                    />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                    
                    {/* Stacked Bars for Macros */}
                    {(chartMode === 'all' || chartMode === 'macros') && (
                        <>
                            <Bar dataKey="protein" name="Белки" stackId="macros" fill="#3b82f6" yAxisId="left" radius={[0, 0, 0, 0]} />
                            <Bar dataKey="fat" name="Жиры" stackId="macros" fill="#eab308" yAxisId="left" radius={[0, 0, 0, 0]} />
                            <Bar dataKey="carbs" name="Угл" stackId="macros" fill="#f97316" yAxisId="left" radius={[4, 4, 0, 0]} />
                        </>
                    )}
                    
                    {/* Line for Fiber */}
                    {(chartMode === 'all' || chartMode === 'fiber') && (
                        <Line type="monotone" dataKey="fiber" name="Клетч" stroke="#22c55e" strokeWidth={2} dot={false} yAxisId="left" />
                    )}
                    
                    {/* Line for Calories */}
                    {(chartMode === 'all' || chartMode === 'calories') && (
                        <Line type="monotone" dataKey="calories" name="Ккал" stroke="#f87171" strokeWidth={2} dot={{r: 3}} yAxisId="right" />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent Log Items */}
            <div className="bg-gray-800 rounded-2xl p-4 border border-gray-700">
                <h3 className="text-sm font-bold text-gray-300 mb-3">История сегодня</h3>
                <div className="space-y-3">
                    {log.map((item) => (
                        <div key={item.id} className="flex justify-between items-center text-sm p-2 hover:bg-gray-700/50 rounded-lg transition-colors">
                            <div className="flex-1">
                                <div className="font-medium text-gray-200">{item.name}</div>
                                <div className="text-xs text-gray-500">
                                    {new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • {item.ironType}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="font-bold text-white">{item.calories}</div>
                                <div className="text-xs text-gray-500">ккал</div>
                            </div>
                        </div>
                    ))}
                    {log.length === 0 && (
                        <div className="text-center text-xs text-gray-500 py-2">
                            Записей пока нет
                        </div>
                    )}
                </div>
            </div>
        </>
      )}
    </div>
  );
};

export default DailyStatsDashboard;
