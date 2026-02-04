export const BOOK_QR_PREFIX = "COPY-";
export const BOOK_QR_CODE_LENGTH = 6;
export const BOOK_QR_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const BOOK_QR_CODE_REGEX = new RegExp(
  `^${BOOK_QR_PREFIX}[${BOOK_QR_CHARSET}]{${BOOK_QR_CODE_LENGTH}}$`,
);

export function isValidBookCode(text: string): boolean {
  return BOOK_QR_CODE_REGEX.test(text.trim());
}

export function extractBookQrParam(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";

  try {
    const url = new URL(
      trimmed.startsWith("http") ? trimmed : `https://${trimmed}`,
    );
    const startapp = url.searchParams.get("startapp");
    if (!startapp) return "";
    const trimmedStartapp = startapp.trim();
    return isValidBookCode(trimmedStartapp) ? trimmedStartapp : "";
  } catch {
    const queryIndex = trimmed.indexOf("?");
    const query = queryIndex >= 0 ? trimmed.slice(queryIndex + 1) : trimmed;
    const params = new URLSearchParams(query);
    const startapp = params.get("startapp");
    if (!startapp) return "";
    const trimmedStartapp = startapp.trim();
    return isValidBookCode(trimmedStartapp) ? trimmedStartapp : "";
  }
}

export function parseBookQrLink(
  text: string,
): { raw: string; code: string } | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const code = extractBookQrParam(trimmed);
  if (!code) return null;

  const hasTelegramLink = /(^|\/\/)t\.me\//i.test(trimmed);
  if (!hasTelegramLink) return null;

  return { raw: trimmed, code };
}

export function extractBookCodeFromLink(text: string): string | null {
  const parsed = parseBookQrLink(text);
  return parsed ? parsed.code : null;
}
