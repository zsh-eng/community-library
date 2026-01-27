import type { TelegramUser } from "@/hooks/use-telegram-user";

export function UserProfile({ user }: { user: TelegramUser }) {
  const initials = [user.firstName[0], user.lastName?.[0]]
    .filter(Boolean)
    .join("")
    .toUpperCase();

  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ");

  return (
    <div className="flex flex-col items-center py-4">
      {user.photoUrl ? (
        <img
          src={user.photoUrl}
          alt={displayName}
          className="h-20 w-20 rounded-full object-cover"
        />
      ) : (
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--tg-theme-button-color,#5288c1)] text-[var(--tg-theme-button-text-color,#fff)] text-2xl font-semibold">
          {initials}
        </div>
      )}
      <p className="mt-3 font-semibold text-[var(--tg-theme-text-color,#000)]">
        {displayName}
      </p>
      {user.username && (
        <p className="text-sm text-[var(--tg-theme-hint-color,#999)]">
          @{user.username}
        </p>
      )}
    </div>
  );
}
