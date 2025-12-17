import { Server } from "@openai/apps-sdk";
import { z } from "zod";
import { R2Client } from "./r2-client";
import {
  generateFilename,
  getFileExtension,
  fetchImageBuffer,
  formatFileSize
} from "./utils";
import {
  ServerConfig,
  ImageUploadResponse,
  ImageInfoResponse,
  UploadToolArgs,
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
  description: "Upload an image and convert it to a permanent URL",
  parameters: {
    type: "object",
    properties: {
      image_url: {
        type: "string",
        format: "uri",
        description: "The URL of the image to upload"
      },
      filename: {
        type: "string",
        description: "Optional custom filename (without extension)"
      }
    },
    required: ["image_url"]
  }
}, async (args: UploadToolArgs): Promise<ImageUploadResponse> => {
  try {
    const { image_url, filename } = args;

    // Fetch and validate image
    const { buffer, contentType, size } = await fetchImageBuffer(image_url);
    const fileExtension = getFileExtension(contentType);
    const baseFilename = generateFilename(filename);

    // Generate final filename
    const finalFilename = `images/${baseFilename}.${fileExtension}`;

    // Upload to R2
    const result = await r2Client.uploadImage(
      buffer,
      finalFilename,
      contentType,
      {
        'original-url': image_url,
        'custom-filename': filename || '',
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

// Start server
server.start({
  port: parseInt(process.env.PORT || "3001"),
  host: process.env.HOST || "localhost"
}).then(() => {
  console.log("=� Image2URL MCP Server started successfully");
  console.log(`=� Server running on ${process.env.HOST || "localhost"}:${process.env.PORT || "3001"}`);
}).catch((error) => {
  console.error("L Failed to start server:", error);
  process.exit(1);
});

export { server };