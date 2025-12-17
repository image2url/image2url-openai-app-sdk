import express, { Request, Response } from 'express';
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { R2Client } from "./r2-client";
import {
  generateFilename,
  getFileExtension,
  fetchImageBuffer,
  parseBase64ImageData,
  getContentTypeFromExtension,
} from "./utils";
import {
  ServerConfig,
  ImageUploadResponse,
  ImageInfoResponse,
  UploadToolArgs,
  FileUploadToolArgs,
  ImageInfoToolArgs
} from "./types";

const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT) : 3001;

// Middleware for JSON parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.raw({ type: 'application/vnd.openai.mcp.v1+json', limit: '50mb' }));

// Initialize configuration with fallbacks for development
const config: ServerConfig = {
  R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID || 'dev_account_id',
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID || 'dev_access_key',
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY || 'dev_secret_key',
  R2_BUCKET_NAME: process.env.R2_BUCKET_NAME || 'dev_bucket',
  R2_PUBLIC_URL: process.env.R2_PUBLIC_URL || 'https://dev.r2.dev',
};

// Initialize R2 client
const r2Client = new R2Client(config);

// Create MCP Server
const server = new Server(
  {
    name: "image2url",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "upload_image",
        description: "Upload an image from URL or base64 data and convert it to a permanent URL",
        inputSchema: {
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
      },
      {
        name: "upload_file",
        description: "Upload a file directly using base64 data and convert it to a permanent URL",
        inputSchema: {
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
      },
      {
        name: "get_image_info",
        description: "Get information about an uploaded image",
        inputSchema: {
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
      },
      {
        name: "health_check",
        description: "Check MCP server health and configuration",
        inputSchema: {
          type: "object",
          properties: {},
          required: []
        }
      }
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "upload_image":
        return await handleUploadImage(args as UploadToolArgs);

      case "upload_file":
        return await handleUploadFile(args as FileUploadToolArgs);

      case "get_image_info":
        return await handleGetImageInfo(args as ImageInfoToolArgs);

      case "health_check":
        return await handleHealthCheck();

      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${name}`
        );
    }
  } catch (error) {
    if (error instanceof McpError) {
      throw error;
    }
    throw new McpError(
      ErrorCode.InternalError,
      `Tool execution failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
});

// Create streamable transport for HTTP
const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: undefined, // Stateless mode
});

// Connect server to transport
server.connect(transport);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    services: {
      http_server: 'online',
      mcp_server: 'ready',
      transport: 'streamable_http'
    }
  });
});

// MCP endpoint - use the streamable transport
app.post('/mcp', async (req: Request, res: Response) => {
  try {
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('MCP Transport Error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
});

// Root endpoint with server info
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'Image2URL MCP Server',
    version: '1.0.0',
    description: 'Convert images to permanent shareable URLs using Cloudflare R2 storage',
    endpoints: {
      health: '/health',
      mcp: '/mcp'
    },
    transport: 'StreamableHTTP',
    documentation: 'https://github.com/your-org/image2url-openai-app-sdk'
  });
});

// Tool handlers (reuse the same implementations from index.ts)
async function handleUploadImage(args: UploadToolArgs) {
  const { image_url, image_data, filename } = args;

  let buffer: Buffer;
  let contentType: string;
  let size: number;
  let finalFilename: string;
  let fileExtension: string;
  let baseFilename: string;

  if (image_url) {
    const imageInfo = await fetchImageBuffer(image_url);
    buffer = imageInfo.buffer;
    contentType = imageInfo.contentType;
    size = imageInfo.size;
    fileExtension = getFileExtension(contentType);
    baseFilename = generateFilename(filename);

    finalFilename = `images/${baseFilename}.${fileExtension}`;

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
      content: [
        {
          type: "text",
          text: JSON.stringify({
            success: true,
            url: result.url,
            filename: result.filename,
            size,
            type: contentType,
            uploaded_at: new Date().toISOString()
          } as ImageUploadResponse, null, 2)
        }
      ]
    };

  } else if (image_data && filename) {
    const parsedContentType = getContentTypeFromExtension(filename);
    const imageInfo = parseBase64ImageData(image_data, parsedContentType);
    buffer = imageInfo.buffer;
    contentType = imageInfo.contentType;
    size = imageInfo.size;
    fileExtension = getFileExtension(contentType);
    baseFilename = generateFilename(filename.replace(/\.[^/.]+$/, ""));

    finalFilename = `images/${baseFilename}.${fileExtension}`;

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
      content: [
        {
          type: "text",
          text: JSON.stringify({
            success: true,
            url: result.url,
            filename: result.filename,
            size,
            type: contentType,
            uploaded_at: new Date().toISOString()
          } as ImageUploadResponse, null, 2)
        }
      ]
    };

  } else {
    throw new McpError(
      ErrorCode.InvalidParams,
      "Either image_url or (image_data and filename) must be provided"
    );
  }
}

async function handleUploadFile(args: FileUploadToolArgs) {
  const { image_data, filename } = args;

  const parsedContentType = getContentTypeFromExtension(filename);
  const { buffer, contentType, size } = parseBase64ImageData(image_data, parsedContentType);
  const fileExtension = getFileExtension(contentType);
  const baseFilename = generateFilename(filename.replace(/\.[^/.]+$/, ""));

  const finalFilename = `images/${baseFilename}.${fileExtension}`;

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
    content: [
      {
        type: "text",
        text: JSON.stringify({
          success: true,
          url: result.url,
          filename: result.filename,
          size,
          type: contentType,
          uploaded_at: new Date().toISOString()
        } as ImageUploadResponse, null, 2)
      }
    ]
  };
}

async function handleGetImageInfo(args: ImageInfoToolArgs) {
  const { image_url } = args;

  const url = new URL(image_url);
  const filename = url.pathname.substring(1);

  const fileInfo = await r2Client.getFileInfo(filename);

  const response = await fetch(image_url, { method: 'HEAD' });

  const result: ImageInfoResponse = {
    url: image_url,
    size: response.headers.get('content-length') || fileInfo.size?.toString(),
    type: response.headers.get('content-type') || fileInfo.contentType,
    cache_control: response.headers.get('cache-control') || undefined,
    last_modified: response.headers.get('last-modified') || fileInfo.lastModified?.toUTCString(),
  };

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(result, null, 2)
      }
    ]
  };
}

async function handleHealthCheck() {
  try {
    const testFilename = `health-check-${Date.now()}.txt`;
    await r2Client.uploadImage(
      Buffer.from('health check'),
      `temp/${testFilename}`,
      'text/plain',
      { 'health-check': 'true' }
    );

    const result = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      services: {
        mcp_server: "online",
        r2_storage: "connected",
        upload_capability: "functional",
        transport: "streamable_http"
      },
      uptime: process.uptime(),
      memory_usage: process.memoryUsage(),
      domain: process.env.MCP_DOMAIN || "localhost"
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  } catch (error) {
    const result = {
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Unknown error",
      services: {
        mcp_server: "online",
        r2_storage: "disconnected",
        upload_capability: "failed",
        transport: "streamable_http"
      }
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  }
}

// Start HTTP server
app.listen(port, '0.0.0.0', () => {
  console.log('🚀 Image2URL HTTP Server started successfully');
  console.log(`📡 Server running on 0.0.0.0:${port}`);
  console.log(`🔗 Health check: http://0.0.0.0:${port}/health`);
  console.log(`🔗 MCP endpoint: http://0.0.0.0:${port}/mcp`);
  console.log(`🌐 Public URL: https://${process.env.MCP_DOMAIN || 'localhost'}/mcp`);
  console.log(`🔄 Using StreamableHTTP transport (supports SSE)`);
});

export default app;