import type { TelegramUser } from "@/hooks/use-telegram-user";

export function UserProfile({ user }: { user: TelegramUser }) {
  const initials = [user.firstName[0], user.lastName?.[0]]
    .filter(Boolean)
    .join("")
    .toUpperCase();

  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ");

  return (
    <div className="flex items-center gap-3 rounded-xl bg-[var(--tg-theme-section-bg-color,#f4f4f5)] p-4">
      {user.photoUrl ? (
        <img
          src={user.photoUrl}
          alt={displayName}
          className="h-12 w-12 rounded-full object-cover"
        />
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--tg-theme-button-color,#5288c1)] text-[var(--tg-theme-button-text-color,#fff)] text-lg font-semibold">
          {initials}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-[var(--tg-theme-text-color,#000)]">
          {displayName}
        </p>
        {user.username && (
          <p className="truncate text-sm text-[var(--tg-theme-hint-color,#999)]">
            @{user.username}
          </p>
        )}
      </div>
    </div>
  );
}
