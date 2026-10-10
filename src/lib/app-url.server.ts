/**
 * Canonical public application URL, configured as the APP_PUBLIC_URL server setting.
 * Returns null when unset or invalid — callers must never guess a public URL.
 */
export function canonicalAppUrl(): string | null {
  const raw = process.env["APP_PUBLIC_URL"]?.trim();
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" && u.hostname !== "localhost") return null;
    return u.origin;
  } catch {
    return null;
  }
}

const isLocal = (host: string) =>
  host === "localhost" || host.startsWith("127.") || host === "0.0.0.0" || host.endsWith(".local");

/** Private editor previews require a Lovable workspace sign-in, so invitees can never open them. */
const isPrivatePreview = (host: string) =>
  /^id-preview--/.test(host) || /^preview--/.test(host) || host.endsWith(".lovableproject.com");

/**
 * Origin for links sent by email (invitations, resets): the canonical URL when configured,
 * otherwise the admin's current origin — unless it is local-only or a private editor preview.
 */
export function emailLinkOrigin(requestOrigin: string): string | null {
  const canonical = canonicalAppUrl();
  if (canonical) return canonical;
  try {
    const u = new URL(requestOrigin);
    return isLocal(u.hostname) || isPrivatePreview(u.hostname) ? null : u.origin;
  } catch {
    return null;
  }
}
