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

export function parseBase64ImageData(imageData: string, mimeType?: string): { buffer: Buffer; contentType: string; size: number } {
  try {
    // Remove data URL prefix if present
    let base64Data = imageData;
    let contentType = mimeType;

    if (imageData.startsWith('data:')) {
      const matches = imageData.match(/^data:(.+?);base64,(.+)$/);
      if (!matches) {
        throw new Error('Invalid data URL format');
      }
      contentType = matches[1];
      base64Data = matches[2];
    }

    if (!contentType) {
      throw new Error('Content type is required for base64 image data');
    }

    if (!validateImageContentType(contentType)) {
      throw new Error(`Unsupported content type: ${contentType}`);
    }

    const buffer = Buffer.from(base64Data, 'base64');
    const size = buffer.length;

    // Validate that the base64 data is actually valid
    if (buffer.length === 0) {
      throw new Error('Empty image data');
    }

    // File size validation (max 10MB for direct uploads)
    const maxSize = 10 * 1024 * 1024;
    if (size > maxSize) {
      throw new Error(`File size exceeds ${formatFileSize(maxSize)} limit`);
    }

    return { buffer, contentType, size };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to parse base64 image data');
  }
}

export function getContentTypeFromExtension(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop();
  const extToMime: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'bmp': 'image/bmp',
    'tiff': 'image/tiff',
    'tif': 'image/tiff',
    'ico': 'image/x-icon',
  };

  return extToMime[ext || ''] || 'image/jpeg';
}