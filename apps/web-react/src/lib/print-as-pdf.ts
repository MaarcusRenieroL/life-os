function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Opens the browser's native print dialog scoped to just this text, formatted for reading -
 * "Save as PDF" there produces a real PDF with no server-side rendering or extra dependency.
 */
export function printAsPdf(text: string, title: string) {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  if (!doc) {
    document.body.removeChild(iframe);
    return;
  }

  doc.open();
  doc.write(`<!DOCTYPE html>
<html>
<head>
<title>${escapeHtml(title)}</title>
<style>
  @page { margin: 0.75in; }
  body { font-family: Georgia, 'Times New Roman', serif; font-size: 11pt; line-height: 1.5; white-space: pre-wrap; }
</style>
</head>
<body>${escapeHtml(text)}</body>
</html>`);
  doc.close();

  iframe.onload = () => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => document.body.removeChild(iframe), 1000);
  };
}
