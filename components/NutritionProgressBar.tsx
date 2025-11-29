import React from 'react';
import { TrendingUp, Activity } from 'lucide-react';
import { NutritionProgress } from '../types';

interface NutritionProgressBarProps {
  progress: NutritionProgress;
  isEnabled: boolean;
}

const NutritionProgressBar: React.FC<NutritionProgressBarProps> = ({ progress, isEnabled }) => {
  if (!isEnabled) return null;

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-green-500';
    if (percentage >= 80) return 'bg-yellow-500';
    if (percentage >= 60) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getProgressTextColor = (percentage: number) => {
    if (percentage >= 100) return 'text-green-400';
    if (percentage >= 80) return 'text-yellow-400';
    if (percentage >= 60) return 'text-orange-400';
    return 'text-red-400';
  };

  const formatValue = (value: number, unit: string) => {
    return `${Math.round(value)}${unit}`;
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp size={18} className="text-blue-400" />
        <h3 className="text-white font-medium">Прогресс дня</h3>
      </div>
      
      <div className="space-y-3">
        {/* Калории */}
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-gray-300 text-sm flex items-center gap-2">
              🔥 Калории
              <span className="text-gray-500">
                {formatValue(progress.calories.current, '')} / {formatValue(progress.calories.goal, ' ккал')}
              </span>
            </span>
            <span className={`text-sm font-medium ${getProgressTextColor(progress.calories.percentage)}`}>
              {Math.round(progress.calories.percentage)}%
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(progress.calories.percentage)}`}
              style={{ width: `${Math.min(progress.calories.percentage, 100)}%` }}
            />
          </div>
        </div>

        {/* Белки */}
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-gray-300 text-sm flex items-center gap-2">
              🥩 Белки
              <span className="text-gray-500">
                {formatValue(progress.protein.current, 'г')} / {formatValue(progress.protein.goal, 'г')}
              </span>
            </span>
            <span className={`text-sm font-medium ${getProgressTextColor(progress.protein.percentage)}`}>
              {Math.round(progress.protein.percentage)}%
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(progress.protein.percentage)}`}
              style={{ width: `${Math.min(progress.protein.percentage, 100)}%` }}
            />
          </div>
        </div>

        {/* Клетчатка */}
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-gray-300 text-sm flex items-center gap-2">
              🌾 Клетчатка
              <span className="text-gray-500">
                {formatValue(progress.fiber.current, 'г')} / {formatValue(progress.fiber.goal, 'г')}
              </span>
            </span>
            <span className={`text-sm font-medium ${getProgressTextColor(progress.fiber.percentage)}`}>
              {Math.round(progress.fiber.percentage)}%
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(progress.fiber.percentage)}`}
              style={{ width: `${Math.min(progress.fiber.percentage, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Общий прогресс */}
      <div className="mt-4 pt-3 border-t border-gray-700">
        <div className="flex items-center justify-between">
          <span className="text-gray-400 text-xs flex items-center gap-1">
            <Activity size={12} />
            Общий прогресс
          </span>
          <div className="flex items-center gap-1">
            {progress.calories.percentage >= 100 && progress.protein.percentage >= 100 && progress.fiber.percentage >= 100 ? (
              <span className="text-green-400 text-xs font-medium flex items-center gap-1">
                🎯 Цели достигнуты!
              </span>
            ) : (
              <span className="text-gray-400 text-xs">
                В процессе...
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NutritionProgressBar;