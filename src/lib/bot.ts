export const BOT_URL = `https://t.me/${import.meta.env.VITE_BOT_USERNAME}`;

export function generateTelegramBookUrl(isbn: string): string {
  return `${BOT_URL}?text=/book${isbn}`;
}
