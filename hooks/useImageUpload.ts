import { useCallback } from 'react';
import { ChatMessage } from '../types';

interface UseImageUploadOptions {
  onSend: (text?: string, imageFile?: File, imagePreview?: string) => void;
  pushMessage: (message: ChatMessage) => void;
}

export const useImageUpload = ({ onSend, pushMessage }: UseImageUploadOptions) => {
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      pushMessage({
        id: crypto.randomUUID(),
        role: 'model',
        text: "⚠️ Пожалуйста, загрузите изображение.",
        timestamp: Date.now(),
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      pushMessage({
        id: crypto.randomUUID(),
        role: 'model',
        text: "⚠️ Размер файла не должен превышать 10MB.",
        timestamp: Date.now(),
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      onSend("Проанализируй это изображение", file, base64);
    };
    reader.readAsDataURL(file);
  }, [onSend, pushMessage]);

  return { handleFileUpload };
};
