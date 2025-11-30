import React, { useMemo, useState, useEffect } from 'react';
import { Target, Save, Settings, Brain, Ruler, Weight } from 'lucide-react';
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

type GoalsMode = "auto" | "manual";

interface NutritionGoalsSettingsProps {
  onClose: () => void;
  mode?: "modal" | "embedded";
}

const computeAutoGoals = (weightKg: number, heightCm: number) => {
  if (!weightKg || !heightCm) {
    return {
      dailyCaloriesGoal: 2000,
      dailyProteinGoal: 100,
      dailyFatGoal: 70,
      dailyCarbGoal: 250,
      dailyFiberGoal: 25,
    };
  }

  const calories = Math.round(weightKg * 30);
  const protein = Math.round(weightKg * 1.6);
  const fat = Math.round(weightKg * 0.9);
  const remainingKcal = Math.max(calories - protein * 4 - fat * 9, 0);
  const carbs = Math.round(remainingKcal / 4);
  const fiber = Math.max(20, Math.round((calories / 1000) * 14));

  return {
    dailyCaloriesGoal: calories,
    dailyProteinGoal: protein,
    dailyFatGoal: fat,
    dailyCarbGoal: carbs,
    dailyFiberGoal: fiber,
  };
};

const NutritionGoalsSettings: React.FC<NutritionGoalsSettingsProps> = ({ onClose, mode = "modal" }) => {
  const settings = useQuery(api.food.getUserSettings);
  const updateSettingsMutation = useMutation(api.food.updateUserSettings);
  
  const [formData, setFormData] = useState({
    dailyCaloriesGoal: 2000,
    dailyProteinGoal: 100,
    dailyFatGoal: 70,
    dailyCarbGoal: 250,
    dailyFiberGoal: 25,
    weightKg: undefined as number | undefined,
    heightCm: undefined as number | undefined,
    goalsMode: "manual" as GoalsMode,
    isTrackingEnabled: false,
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData(prev => ({
        ...prev,
        dailyCaloriesGoal: settings.dailyCaloriesGoal,
        dailyProteinGoal: settings.dailyProteinGoal,
        dailyFatGoal: settings.dailyFatGoal,
        dailyCarbGoal: settings.dailyCarbGoal,
        dailyFiberGoal: settings.dailyFiberGoal,
        weightKg: settings.weightKg,
        heightCm: settings.heightCm,
        goalsMode: (settings.goalsMode as GoalsMode) || "manual",
        isTrackingEnabled: settings.isTrackingEnabled,
      }));
    }
  }, [settings]);

  const handleInputChange = (field: string, value: number | boolean | GoalsMode | undefined) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const applyAutoGoals = (weight?: number, height?: number) => {
    const w = weight ?? formData.weightKg ?? 70;
    const h = height ?? formData.heightCm ?? 170;
    const goals = computeAutoGoals(w, h);
    setFormData(prev => ({
      ...prev,
      ...goals,
      weightKg: w,
      heightCm: h,
      goalsMode: "auto",
    }));
  };

  const autoGoals = useMemo(() => computeAutoGoals(formData.weightKg || 0, formData.heightCm || 0), [formData.weightKg, formData.heightCm]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = formData.goalsMode === "auto" ? { ...formData, ...autoGoals } : formData;
      await updateSettingsMutation(payload);
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
      <div className={mode === "modal" ? "absolute inset-0 bg-gray-900/95 backdrop-blur-sm flex items-center justify-center z-50" : "w-full"}>
        <div className="bg-gray-800 rounded-xl p-6 w-full max-w-xl mx-4">
          <div className="animate-pulse text-center space-y-3">
            <div className="h-6 bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-700 rounded w-3/4 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  const Wrapper = ({ children }: { children: React.ReactNode }) => mode === "modal"
    ? <div className="absolute inset-0 bg-gray-900/95 backdrop-blur-sm flex items-center justify-center z-50">{children}</div>
    : <div className="w-full">{children}</div>;

  return (
    <Wrapper>
      <div className="bg-gray-800 rounded-2xl p-5 w-full max-w-3xl mx-auto border border-gray-700 shadow-xl space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-green-400 to-blue-500 rounded-xl flex items-center justify-center">
              <Settings size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Цели питания</h2>
              <p className="text-gray-400 text-sm">Калории и макросы на день</p>
            </div>
          </div>
          {mode === "modal" && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white p-1 transition-colors"
              aria-label="Закрыть"
            >
              ✕
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 flex items-center justify-between p-3 bg-gray-700/30 border border-gray-600 rounded-xl">
            <div className="flex items-center gap-2">
              <Brain size={18} className="text-blue-400" />
              <div>
                <p className="text-white text-sm font-medium">Режим целей</p>
                <p className="text-gray-400 text-xs">Авто — рассчитать по росту и весу</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleInputChange('goalsMode', 'manual')}
                className={`px-3 py-1 rounded-lg text-sm border ${formData.goalsMode === 'manual' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-700 border-gray-600 text-gray-300'}`}
              >
                Ручной
              </button>
              <button
                onClick={() => applyAutoGoals()}
                className={`px-3 py-1 rounded-lg text-sm border ${formData.goalsMode === 'auto' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-700 border-gray-600 text-gray-300'}`}
              >
                Авто
              </button>
            </div>
          </div>

          <div className="p-3 bg-gray-700/30 border border-gray-600 rounded-xl">
            <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
              <Weight size={16} className="text-orange-400" />
              Вес (кг)
            </label>
            <input
              type="number"
              inputMode="decimal"
              pattern="[0-9]*"
              value={formData.weightKg ?? ''}
              onChange={(e) => {
                const value = e.target.value ? parseFloat(e.target.value) : undefined;
                handleInputChange('weightKg', value);
                if (formData.goalsMode === "auto") {
                  applyAutoGoals(value, formData.heightCm);
                }
              }}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="70"
              min="30"
              max="200"
              step="0.1"
            />
          </div>

          <div className="p-3 bg-gray-700/30 border border-gray-600 rounded-xl">
            <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
              <Ruler size={16} className="text-purple-400" />
              Рост (см)
            </label>
            <input
              type="number"
              inputMode="decimal"
              pattern="[0-9]*"
              value={formData.heightCm ?? ''}
              onChange={(e) => {
                const value = e.target.value ? parseFloat(e.target.value) : undefined;
                handleInputChange('heightCm', value);
                if (formData.goalsMode === "auto") {
                  applyAutoGoals(formData.weightKg, value);
                }
              }}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="175"
              min="120"
              max="230"
              step="0.5"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { key: 'dailyCaloriesGoal', label: 'Калории', color: 'text-orange-400', placeholder: '2000', unit: 'ккал' },
            { key: 'dailyProteinGoal', label: 'Белки', color: 'text-red-400', placeholder: '100', unit: 'г' },
            { key: 'dailyFatGoal', label: 'Жиры', color: 'text-yellow-400', placeholder: '70', unit: 'г' },
            { key: 'dailyCarbGoal', label: 'Углеводы', color: 'text-blue-400', placeholder: '250', unit: 'г' },
            { key: 'dailyFiberGoal', label: 'Клетчатка', color: 'text-green-400', placeholder: '25', unit: 'г' },
          ].map((item) => (
            <div key={item.key} className="p-3 bg-gray-700/30 border border-gray-600 rounded-lg">
              <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                <Target size={16} className={item.color} />
                {item.label}
              </label>
              <input
                type="number"
                inputMode="decimal"
                pattern="[0-9]*"
                value={(formData as any)[item.key]}
                disabled={formData.goalsMode === "auto"}
                onChange={(e) => handleInputChange(item.key, parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-70"
                placeholder={item.placeholder}
                min="0"
                step="1"
              />
              {formData.goalsMode === "auto" && (
                <p className="text-xs text-gray-400 mt-1">Авто: {(autoGoals as any)[item.key]} {item.unit}</p>
              )}
            </div>
          ))}
        </div>

        <div className="p-4 bg-gray-700/30 border border-gray-600 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-white text-sm font-medium">Отслеживание</p>
            <p className="text-gray-400 text-xs">Включить прогресс-бар и цели</p>
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

        <div className="flex gap-3">
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
    </Wrapper>
  );
};

export default NutritionGoalsSettings;
