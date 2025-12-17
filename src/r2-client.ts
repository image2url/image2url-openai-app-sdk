import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { ServerConfig } from "./types";

export class R2Client {
  private client: S3Client;
  private bucketName: string;
  private publicUrl: string;

  constructor(config: ServerConfig) {
    this.client = new S3Client({
      region: "auto",
      endpoint: `https://${config.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.R2_ACCESS_KEY_ID,
        secretAccessKey: config.R2_SECRET_ACCESS_KEY,
      },
    });
    this.bucketName = config.R2_BUCKET_NAME;
    this.publicUrl = config.R2_PUBLIC_URL;
  }

  async uploadImage(
    buffer: Buffer,
    filename: string,
    contentType: string,
    metadata?: Record<string, string>
  ): Promise<{ url: string; filename: string }> {
    try {
      const uploadCommand = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: filename,
        Body: buffer,
        ContentType: contentType,
        ContentLength: buffer.length,
        CacheControl: 'public, max-age=31536000',
        Metadata: {
          'upload-time': new Date().toISOString(),
          ...metadata,
        },
      });

      await this.client.send(uploadCommand);

      const url = `${this.publicUrl}/${filename}`;

      return { url, filename };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`R2 upload failed: ${error.message}`);
      }
      throw new Error('R2 upload failed: Unknown error');
    }
  }

  async getFileInfo(filename: string): Promise<{
    size?: number;
    contentType?: string;
    lastModified?: Date;
    metadata?: Record<string, string>;
  }> {
    try {
      const headCommand = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: filename,
      });

      const response = await this.client.send(headCommand);

      return {
        size: response.ContentLength,
        contentType: response.ContentType,
        lastModified: response.LastModified,
        metadata: response.Metadata,
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'NotFound') {
        throw new Error('File not found');
      }
      if (error instanceof Error) {
        throw new Error(`Failed to get file info: ${error.message}`);
      }
      throw new Error('Failed to get file info: Unknown error');
    }
  }

  getPublicUrl(filename: string): string {
    return `${this.publicUrl}/${filename}`;
  }
}