import React, { useState, useEffect } from 'react';
import { Target, Save, Settings } from 'lucide-react';
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

interface NutritionGoalsSettingsProps {
  onClose: () => void;
}

const NutritionGoalsSettings: React.FC<NutritionGoalsSettingsProps> = ({ onClose }) => {
  const settings = useQuery(api.food.getUserSettings);
  const updateSettingsMutation = useMutation(api.food.updateUserSettings);
  
  const [formData, setFormData] = useState({
    dailyCaloriesGoal: 2000,
    dailyProteinGoal: 100,
    dailyFiberGoal: 25,
    isTrackingEnabled: false,
  });

  const [isSaving, setIsSaving] = useState(false);

  // Обновляем форму когда загружаются настройки
  useEffect(() => {
    if (settings) {
      setFormData({
        dailyCaloriesGoal: settings.dailyCaloriesGoal,
        dailyProteinGoal: settings.dailyProteinGoal,
        dailyFiberGoal: settings.dailyFiberGoal,
        isTrackingEnabled: settings.isTrackingEnabled,
      });
    }
  }, [settings]);

  const handleInputChange = (field: string, value: number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSettingsMutation(formData);
      console.log('Настройки успешно сохранены');
      onClose();
    } catch (error) {
      console.error('Ошибка при сохранении настроек:', error);
      alert('Ошибка при сохранении настроек');
    } finally {
      setIsSaving(false);
    }
  };

  if (settings === undefined) {
    return (
      <div className="absolute inset-0 bg-gray-900/95 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4">
          <div className="animate-pulse text-center">
            <div className="h-6 bg-gray-700 rounded mb-4"></div>
            <div className="h-4 bg-gray-700 rounded mb-2"></div>
            <div className="h-4 bg-gray-700 rounded w-3/4 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 bg-gray-900/95 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4 border border-gray-700 shadow-2xl">
        {/* Заголовок */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-green-400 to-blue-500 rounded-full flex items-center justify-center">
              <Settings size={20} className="text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">Цели питания</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Переключатель отслеживания */}
        <div className="mb-6 p-4 bg-gray-700/30 rounded-lg border border-gray-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Settings size={20} className="text-blue-400" />
              <div>
                <h3 className="text-white font-medium">Отслеживание прогресса</h3>
                <p className="text-gray-400 text-sm">Показывать прогресс-бары на главном экране</p>
              </div>
            </div>
            <button
              onClick={() => handleInputChange('isTrackingEnabled', !formData.isTrackingEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                formData.isTrackingEnabled ? 'bg-blue-600' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  formData.isTrackingEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Поля настроек */}
        <div className="space-y-4">
          {/* Калории */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Target size={16} className="inline mr-2 text-orange-400" />
              Дневная цель по калориям (ккал)
            </label>
            <input
              type="number"
              value={formData.dailyCaloriesGoal}
              onChange={(e) => handleInputChange('dailyCaloriesGoal', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="2000"
              min="1000"
              max="5000"
              step="50"
            />
            <p className="text-xs text-gray-400 mt-1">Рекомендуется: 1500-2500 ккал</p>
          </div>

          {/* Белки */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Target size={16} className="inline mr-2 text-red-400" />
              Дневная цель по белкам (г)
            </label>
            <input
              type="number"
              value={formData.dailyProteinGoal}
              onChange={(e) => handleInputChange('dailyProteinGoal', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="100"
              min="30"
              max="300"
              step="5"
            />
            <p className="text-xs text-gray-400 mt-1">Рекомендуется: 0.8-2.2г на кг веса</p>
          </div>

          {/* Клетчатка */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Target size={16} className="inline mr-2 text-green-400" />
              Дневная цель по клетчатке (г)
            </label>
            <input
              type="number"
              value={formData.dailyFiberGoal}
              onChange={(e) => handleInputChange('dailyFiberGoal', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="25"
              min="10"
              max="50"
              step="1"
            />
            <p className="text-xs text-gray-400 mt-1">Рекомендуется: 25-35г в день</p>
          </div>
        </div>

        {/* Кнопки */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-gray-400 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Save size={16} />
            {isSaving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NutritionGoalsSettings;