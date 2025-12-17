export interface ImageUploadResponse {
  success: boolean;
  url: string;
  filename: string;
  size: number;
  type: string;
  uploaded_at: string;
}

export interface ImageInfoResponse {
  url: string;
  size?: string | null;
  type?: string | null;
  cache_control?: string | null;
  last_modified?: string | null;
}

export interface UploadToolArgs {
  image_url?: string;
  image_data?: string; // Base64 encoded image data
  filename?: string;
}

export interface FileUploadToolArgs {
  image_data: string; // Base64 encoded image data
  filename: string;   // Original filename with extension
  mime_type?: string; // MIME type of the image
}

export interface ImageInfoToolArgs {
  image_url: string;
}

export interface ServerConfig {
  R2_ACCOUNT_ID: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  R2_BUCKET_NAME: string;
  R2_PUBLIC_URL: string;
}

export interface MCPToolResponse {
  content: Array<{
    type: string;
    text?: string;
    data?: any;
  }>;
  isError?: boolean;
}