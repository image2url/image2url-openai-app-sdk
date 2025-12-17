import { v4 as uuidv4 } from "uuid";

export function generateFilename(originalFilename?: string): string {
  const timestamp = Date.now();
  const uniqueId = uuidv4();
  const cleanFilename = originalFilename
    ? originalFilename.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase()
    : uniqueId.slice(0, 8);

  return `${timestamp}-${uniqueId}-${cleanFilename}`;
}

export function getFileExtension(contentType: string): string {
  const mimeToExt: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
    'image/bmp': 'bmp',
    'image/tiff': 'tiff',
    'image/x-icon': 'ico',
  };

  return mimeToExt[contentType] || 'jpg';
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function validateImageContentType(contentType?: string): boolean {
  if (!contentType) return false;

  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/bmp',
    'image/tiff',
    'image/x-icon'
  ];

  return allowedTypes.includes(contentType);
}

export async function fetchImageBuffer(url: string): Promise<{ buffer: Buffer; contentType: string; size: number }> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Image2URL-MCP-Server/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';

    if (!validateImageContentType(contentType)) {
      throw new Error(`Unsupported content type: ${contentType}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const size = buffer.length;

    return { buffer, contentType, size };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to fetch image from URL');
  }
}