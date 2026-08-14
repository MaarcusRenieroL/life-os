import { HttpClient, HttpResponse } from '@angular/common/http';

// `window.open(apiUrl)` bypasses Angular's HttpClient auth interceptor, so it
// hits the API with no Authorization header and the browser navigates to a
// bare 401. Every "download this file" action needs to go through HttpClient
// (which attaches the JWT) and save the resulting blob manually instead.
export function downloadViaBlob(http: HttpClient, url: string, fallbackFilename: string): void {
  http
    .get(url, { responseType: 'blob', observe: 'response' })
    .subscribe((response: HttpResponse<Blob>) => {
      const blob = response.body;
      if (!blob) return;

      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filenameFrom(response) ?? fallbackFilename;
      link.click();

      URL.revokeObjectURL(objectUrl);
    });
}

function filenameFrom(response: HttpResponse<Blob>): string | null {
  const disposition = response.headers.get('content-disposition');
  if (!disposition) return null;

  const match = /filename="?([^";]+)"?/i.exec(disposition);
  return match ? match[1] : null;
}
