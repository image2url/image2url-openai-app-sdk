import express from 'express';
import { spawn } from 'child_process';
import path from 'path';

const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT) : 3001;

// Middleware for JSON parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.raw({ type: 'application/vnd.openai.mcp.v1+json', limit: '50mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    services: {
      http_server: 'online',
      mcp_server: 'ready'
    }
  });
});

// MCP endpoint - proxy requests to the MCP server
app.post('/mcp', async (req, res) => {
  try {
    // Spawn MCP server process
    const mcpServer = spawn('node', [path.join(__dirname, '../dist/index.js')], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let responseReceived = false;
    let responseData = '';

    // Set up timeout
    const timeout = setTimeout(() => {
      if (!responseReceived) {
        mcpServer.kill();
        if (!res.headersSent) {
          res.status(408).json({
            error: 'Request timeout',
            message: 'MCP server did not respond in time'
          });
        }
      }
    }, 30000); // 30 seconds timeout

    // Send request to MCP server
    const requestJson = JSON.stringify(req.body);
    mcpServer.stdin.write(requestJson);
    mcpServer.stdin.end();

    // Collect response
    mcpServer.stdout.on('data', (data) => {
      responseData += data.toString();

      // Try to parse complete JSON response
      try {
        const lines = responseData.trim().split('\n');
        for (const line of lines) {
          if (line.trim()) {
            const parsed = JSON.parse(line);
            if (!responseReceived) {
              responseReceived = true;
              clearTimeout(timeout);
              mcpServer.kill();

              if (!res.headersSent) {
                res.json(parsed);
              }
              return;
            }
          }
        }
      } catch (e) {
        // Incomplete JSON, continue waiting
      }
    });

    // Handle errors
    mcpServer.stderr.on('data', (data) => {
      console.error('MCP Server Error:', data.toString());
    });

    mcpServer.on('close', (code) => {
      clearTimeout(timeout);
      if (!responseReceived && !res.headersSent) {
        res.status(500).json({
          error: 'MCP server error',
          message: 'Server process exited without response',
          code
        });
      }
    });

  } catch (error) {
    console.error('HTTP Server Error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
});

// Root endpoint with server info
app.get('/', (req, res) => {
  res.json({
    name: 'Image2URL MCP Server',
    version: '1.0.0',
    description: 'Convert images to permanent shareable URLs using Cloudflare R2 storage',
    endpoints: {
      health: '/health',
      mcp: '/mcp'
    },
    documentation: 'https://github.com/your-org/image2url-openai-app-sdk'
  });
});

// Start HTTP server
app.listen(port, '0.0.0.0', () => {
  console.log('🚀 Image2URL HTTP Server started successfully');
  console.log(`📡 Server running on 0.0.0.0:${port}`);
  console.log(`🔗 Health check: http://0.0.0.0:${port}/health`);
  console.log(`🔗 MCP endpoint: http://0.0.0.0:${port}/mcp`);
  console.log(`🌐 Public URL: https://${process.env.MCP_DOMAIN || 'localhost'}/mcp`);
});

export default app;