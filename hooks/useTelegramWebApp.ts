import { useEffect, useState } from 'react';

export type AppTab = 'chat' | 'stats' | 'archive' | 'profile';

export const useTelegramUser = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [telegramAvailable, setTelegramAvailable] = useState(false);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) {
      setTelegramAvailable(false);
      return;
    }

    setTelegramAvailable(true);
    tg.ready();
    tg.expand();

    const userData = tg.initDataUnsafe?.user;
    if (userData) {
      setUserId(userData.id?.toString() || null);
      const fullName = [userData.first_name, userData.last_name].filter(Boolean).join(' ').trim();
      setUserName(fullName || userData.username || null);
    }
  }, []);

  return {
    userId,
    userName,
    isAuthenticated: Boolean(userId),
    telegramAvailable,
  };
};

export const useTelegramBackButton = (activeTab: AppTab, isMenuOpen: boolean, onBack: () => void) => {
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;

    const handleBack = () => onBack();

    if (activeTab !== 'chat' || isMenuOpen) {
      tg.BackButton.show();
      tg.BackButton.onClick(handleBack);
    } else {
      tg.BackButton.hide();
    }

    return () => {
      tg.BackButton.offClick(handleBack);
    };
  }, [activeTab, isMenuOpen, onBack]);
};
