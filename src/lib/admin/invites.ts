export type InviteMessageInput = {
  circleName: string;
  inviteUrl: string;
  email: string;
  personalNote?: string | null;
  template?: string | null;
};

export const DEFAULT_INVITE_TEMPLATE = `You're invited to {circle}, a private circle for Scripture and care.

1. Open {link}
2. Use the email {email}
3. Choose a password when you join.

If you weren't expecting this, you can ignore it.`;

export function buildInviteMessage({
  circleName,
  inviteUrl,
  email,
  personalNote,
  template,
}: InviteMessageInput): string {
  const source = template?.trim() || DEFAULT_INVITE_TEMPLATE;
  const message = source
    .replaceAll("{circle}", circleName)
    .replaceAll("{link}", inviteUrl)
    .replaceAll("{email}", email)
    .trim();

  if (!personalNote?.trim()) return message;

  return `${message}\n\n${personalNote.trim()}`;
}
