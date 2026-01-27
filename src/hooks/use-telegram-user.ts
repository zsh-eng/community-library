import { initData, useSignal } from "@telegram-apps/sdk-react";

export type TelegramUser = {
  id: number;
  firstName: string;
  lastName?: string;
  username?: string;
  photoUrl?: string;
  languageCode?: string;
  isPremium?: boolean;
};

export function useTelegramUser(): TelegramUser | undefined {
  const user = useSignal(initData.user);
  if (!user) return undefined;
  return {
    id: user.id,
    firstName: user.first_name,
    lastName: user.last_name,
    username: user.username,
    photoUrl: user.photo_url,
    languageCode: user.language_code,
    isPremium: user.is_premium,
  };
}
