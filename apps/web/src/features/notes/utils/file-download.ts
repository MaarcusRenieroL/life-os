import { api } from '@/lib/api-client';

// A bare `<a href={apiUrl}>` or `window.open(apiUrl)` bypasses the axios
// instance's auth interceptor, so it hits the API with no Authorization
// header. Every "download this file" action goes through `api` (which
// attaches the JWT) and saves the resulting blob manually instead.
export async function downloadViaBlob(url: string, fallbackFilename: string): Promise<void> {
  const response = await api.get(url, { responseType: 'blob' });
  const blob = response.data as Blob;

  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filenameFrom(response.headers['content-disposition']) ?? fallbackFilename;
  link.click();

  URL.revokeObjectURL(objectUrl);
}

function filenameFrom(disposition: string | undefined): string | null {
  if (!disposition) return null;
  const match = /filename="?([^";]+)"?/i.exec(disposition);
  return match ? match[1] : null;
}
