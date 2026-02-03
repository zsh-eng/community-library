import { Api } from "grammy";

/**
 * Check if a user is an admin by verifying their membership in the admin group.
 * Uses Telegram's getChatMember API to check membership status.
 *
 * A user is considered an admin if they are a member, admin, or creator of the group.
 */
export async function isUserAdmin(
  botToken: string,
  adminGroupId: string,
  userId: number,
): Promise<boolean> {
  if (!adminGroupId) {
    return false;
  }

  try {
    const api = new Api(botToken);
    const member = await api.getChatMember(adminGroupId, userId);

    // User is admin if they're a member of the group (any status except "left" or "kicked")
    return ["member", "administrator", "creator"].includes(member.status);
  } catch {
    // If we can't check membership (user never interacted with group, etc.), they're not an admin
    return false;
  }
}
