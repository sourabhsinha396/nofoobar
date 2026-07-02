// Lab lessons embed the interactive-labs service via iframe. Only its domain
// may be iframed into learner pages - mirrors LabContent validation on the
// backend (app/schemas/lesson.py).
export const LAB_EMBED_HOST = "algoholia.com";

export function isAllowedLabEmbedUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  return (
    url.protocol === "https:" &&
    (url.hostname === LAB_EMBED_HOST || url.hostname.endsWith(`.${LAB_EMBED_HOST}`))
  );
}

// Creators copy the full `<iframe src="..." ...>` snippet from the labs
// service. Accept either that snippet or a bare URL and return the URL.
export function extractLabEmbedUrl(value: string): string {
  const match = /<iframe[^>]*\ssrc=["']([^"']+)["']/i.exec(value);
  return (match ? match[1] : value).trim();
}
