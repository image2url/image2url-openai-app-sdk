import { Server } from "@openai/apps-sdk";
import { z } from "zod";
import { R2Client } from "./r2-client";
import {
  generateFilename,
  getFileExtension,
  fetchImageBuffer,
  parseBase64ImageData,
  getContentTypeFromExtension,
  formatFileSize
} from "./utils";
import {
  ServerConfig,
  ImageUploadResponse,
  ImageInfoResponse,
  UploadToolArgs,
  FileUploadToolArgs,
  ImageInfoToolArgs
} from "./types";

// Configuration schema
const ConfigSchema = z.object({
  R2_ACCOUNT_ID: z.string(),
  R2_ACCESS_KEY_ID: z.string(),
  R2_SECRET_ACCESS_KEY: z.string(),
  R2_BUCKET_NAME: z.string(),
  R2_PUBLIC_URL: z.string().url(),
});

// Initialize configuration
const config: ServerConfig = ConfigSchema.parse({
  R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME: process.env.R2_BUCKET_NAME,
  R2_PUBLIC_URL: process.env.R2_PUBLIC_URL,
});

// Initialize R2 client
const r2Client = new R2Client(config);

// Create MCP Server
const server = new Server({
  name: "image2url",
  version: "1.0.0",
  description: "Convert images to permanent shareable URLs using Cloudflare R2 storage"
});

// Tool: Upload Image
server.addTool({
  name: "upload_image",
  description: "Upload an image from URL or base64 data and convert it to a permanent URL",
  parameters: {
    type: "object",
    properties: {
      image_url: {
        type: "string",
        format: "uri",
        description: "The URL of the image to upload (alternative to image_data)"
      },
      image_data: {
        type: "string",
        description: "Base64 encoded image data (alternative to image_url). Can be data URL format or raw base64."
      },
      filename: {
        type: "string",
        description: "Optional custom filename (without extension). Required when using image_data."
      }
    },
    anyOf: [
      { required: ["image_url"] },
      { required: ["image_data", "filename"] }
    ]
  }
}, async (args: UploadToolArgs): Promise<ImageUploadResponse> => {
  try {
    const { image_url, image_data, filename } = args;

    let buffer: Buffer;
    let contentType: string;
    let size: number;
    let finalFilename: string;
    let fileExtension: string;
    let baseFilename: string;

    if (image_url) {
      // Handle URL upload
      const imageInfo = await fetchImageBuffer(image_url);
      buffer = imageInfo.buffer;
      contentType = imageInfo.contentType;
      size = imageInfo.size;
      fileExtension = getFileExtension(contentType);
      baseFilename = generateFilename(filename);

      finalFilename = `images/${baseFilename}.${fileExtension}`;

      // Upload to R2
      const result = await r2Client.uploadImage(
        buffer,
        finalFilename,
        contentType,
        {
          'original-url': image_url,
          'custom-filename': filename || '',
          'upload-source': 'url'
        }
      );

      return {
        success: true,
        url: result.url,
        filename: result.filename,
        size,
        type: contentType,
        uploaded_at: new Date().toISOString()
      };

    } else if (image_data && filename) {
      // Handle base64 data upload
      const parsedContentType = getContentTypeFromExtension(filename);
      const imageInfo = parseBase64ImageData(image_data, parsedContentType);
      buffer = imageInfo.buffer;
      contentType = imageInfo.contentType;
      size = imageInfo.size;
      fileExtension = getFileExtension(contentType);
      baseFilename = generateFilename(filename.replace(/\.[^/.]+$/, "")); // Remove extension

      finalFilename = `images/${baseFilename}.${fileExtension}`;

      // Upload to R2
      const result = await r2Client.uploadImage(
        buffer,
        finalFilename,
        contentType,
        {
          'original-filename': filename,
          'custom-filename': baseFilename,
          'upload-source': 'base64'
        }
      );

      return {
        success: true,
        url: result.url,
        filename: result.filename,
        size,
        type: contentType,
        uploaded_at: new Date().toISOString()
      };

    } else {
      throw new Error("Either image_url or (image_data and filename) must be provided");
    }

  } catch (error) {
    throw new Error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

// Tool: Get Image Info
server.addTool({
  name: "get_image_info",
  description: "Get information about an uploaded image",
  parameters: {
    type: "object",
    properties: {
      image_url: {
        type: "string",
        format: "uri",
        description: "The URL of the uploaded image"
      }
    },
    required: ["image_url"]
  }
}, async (args: ImageInfoToolArgs): Promise<ImageInfoResponse> => {
  try {
    const { image_url } = args;

    // Extract filename from URL
    const url = new URL(image_url);
    const filename = url.pathname.substring(1); // Remove leading slash

    // Get file info from R2
    const fileInfo = await r2Client.getFileInfo(filename);

    // Get additional info via HEAD request
    const response = await fetch(image_url, { method: 'HEAD' });

    return {
      url: image_url,
      size: response.headers.get('content-length') || fileInfo.size?.toString(),
      type: response.headers.get('content-type') || fileInfo.contentType,
      cache_control: response.headers.get('cache-control'),
      last_modified: response.headers.get('last-modified') || fileInfo.lastModified?.toUTCString(),
    };

  } catch (error) {
    throw new Error(`Failed to get image info: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

// Tool: Upload File (direct file upload)
server.addTool({
  name: "upload_file",
  description: "Upload a file directly using base64 data and convert it to a permanent URL",
  parameters: {
    type: "object",
    properties: {
      image_data: {
        type: "string",
        description: "Base64 encoded image data. Can be data URL format (data:image/png;base64,xxxx) or raw base64 string."
      },
      filename: {
        type: "string",
        description: "Original filename with extension (e.g., 'photo.jpg', 'image.png')"
      }
    },
    required: ["image_data", "filename"]
  }
}, async (args: FileUploadToolArgs): Promise<ImageUploadResponse> => {
  try {
    const { image_data, filename } = args;

    // Parse base64 data
    const parsedContentType = getContentTypeFromExtension(filename);
    const { buffer, contentType, size } = parseBase64ImageData(image_data, parsedContentType);
    const fileExtension = getFileExtension(contentType);
    const baseFilename = generateFilename(filename.replace(/\.[^/.]+$/, "")); // Remove extension

    // Generate final filename
    const finalFilename = `images/${baseFilename}.${fileExtension}`;

    // Upload to R2
    const result = await r2Client.uploadImage(
      buffer,
      finalFilename,
      contentType,
      {
        'original-filename': filename,
        'custom-filename': baseFilename,
        'upload-source': 'direct_file'
      }
    );

    return {
      success: true,
      url: result.url,
      filename: result.filename,
      size,
      type: contentType,
      uploaded_at: new Date().toISOString()
    };

  } catch (error) {
    throw new Error(`File upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

// Health check endpoint
server.addTool({
  name: "health_check",
  description: "Check MCP server health and configuration",
  parameters: {
    type: "object",
    properties: {},
    required: []
  }
}, async () => {
  try {
    // Check R2 connection by testing a simple operation
    const testFilename = `health-check-${Date.now()}.txt`;
    await r2Client.uploadImage(
      Buffer.from('health check'),
      `temp/${testFilename}`,
      'text/plain',
      { 'health-check': 'true' }
    );

    return {
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      services: {
        mcp_server: "online",
        r2_storage: "connected",
        upload_capability: "functional"
      },
      uptime: process.uptime(),
      memory_usage: process.memoryUsage(),
      domain: process.env.MCP_DOMAIN || "localhost"
    };
  } catch (error) {
    return {
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Unknown error",
      services: {
        mcp_server: "online",
        r2_storage: "disconnected",
        upload_capability: "failed"
      }
    };
  }
});

// Start server
const port = parseInt(process.env.PORT || "3001");
const host = process.env.HOST || "0.0.0.0"; // Listen on all interfaces for production

server.start({
  port,
  host
}).then(() => {
  console.log("🚀 Image2URL MCP Server started successfully");
  console.log(`📡 Server running on ${host}:${port}`);
  console.log(`🌐 MCP Server URL: https://${process.env.MCP_DOMAIN || 'mcp.image2url.com'}`);
  console.log(`🔗 Health check: https://${process.env.MCP_DOMAIN || 'mcp.image2url.com'}/health`);
}).catch((error) => {
  console.error("❌ Failed to start server:", error);
  process.exit(1);
});

export { server };