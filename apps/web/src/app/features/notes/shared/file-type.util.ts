const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp']);
const PDF_EXTENSIONS = new Set(['pdf']);
const DOC_EXTENSIONS = new Set(['doc', 'docx']);

export type FileKind = 'image' | 'pdf' | 'doc' | 'other';

export function fileExtension(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot >= 0 ? fileName.slice(dot + 1).toLowerCase() : '';
}

export function fileKind(fileName: string): FileKind {
  const ext = fileExtension(fileName);
  if (IMAGE_EXTENSIONS.has(ext)) return 'image';
  if (PDF_EXTENSIONS.has(ext)) return 'pdf';
  if (DOC_EXTENSIONS.has(ext)) return 'doc';
  return 'other';
}

export function fileIcon(fileName: string): string {
  switch (fileKind(fileName)) {
    case 'image':
      return 'pi-image';
    case 'pdf':
      return 'pi-file-pdf';
    case 'doc':
      return 'pi-file-word';
    default:
      return 'pi-file';
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
