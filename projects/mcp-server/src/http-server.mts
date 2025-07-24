import express, { Request, Response } from 'express';
import { randomUUID } from "crypto";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import cors from 'cors';

const app = express();
app.use(express.json());

// Configure CORS to expose Mcp-Session-Id header for browser-based clients
app.use(cors({
  origin: '*', // Allow all origins - adjust as needed for production
  exposedHeaders: ['Mcp-Session-Id']
}));

// === Active transports (by session)
const transports: Record<string, StreamableHTTPServerTransport> = {};

// === POST /mcp endpoint (initial + request handler)
app.post('/mcp', async (req: Request, res: Response) => {
  console.log('POST /mcp');
  const sessionId = req.headers['mcp-session-id'] as string;
  
  let transport: StreamableHTTPServerTransport;
  
  if (sessionId && transports[sessionId]) {
    // Existing session
    transport = transports[sessionId];
  } else if (!sessionId && isInitializeRequest(req.body)) {
    // New session: Create transport
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (actualId: string) => {
        transports[actualId] = transport;
      }
    });
    
    transport.onclose = () => {
      if (transport.sessionId) {
        delete transports[transport.sessionId];
      }
    };
    
    // === Set up MCP server + register tools
    const mcpServer = new McpServer({
      name: 'demo-mcp-server',
      version: '1.0.0',
    });
    
    // === Tool: calculate_sum
    mcpServer.registerTool('calculate_sum', {
      title: 'Calculator Tool',
      description: 'Adds two numbers together',
      inputSchema: {
        a: z.number().describe('First number'),
        b: z.number().describe('Second number')
      }
    }, async ({ a, b }: { a: number; b: number }) => ({
      content: [{ type: 'text', text: `The sum of ${a} and ${b} is ${a + b}` }]
    }));
    
    // === Tool: greet_user
    mcpServer.registerTool('greet_user', {
      title: 'Greeting Tool',
      description: 'Greets a user by name',
      inputSchema: {
        name: z.string().describe('Name of the person to greet')
      }
    }, async ({ name }: { name: string }) => ({
      content: [{ type: 'text', text: `Hello, ${name}! Welcome to the MCP demo server.` }]
    }));
    
    // === Tool: generate_uuid
    mcpServer.registerTool('generate_uuid', {
      title: 'UUID Generator',
      description: 'Generates a random UUID',
      inputSchema: {}
    }, async () => ({
      content: [{ type: 'text', text: randomUUID() }]
    }));
    
    await mcpServer.connect(transport);
  } else {
    return res.status(400).json({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'No valid session or initialization' },
      id: null
    });
  }
  
  // Stream response
  await transport.handleRequest(req, res, req.body);
});

// === GET /mcp for streaming APIs (optional)
app.get('/mcp', async (req: Request, res: Response) => {
  console.log('GET /mcp');
  const sessionId = req.headers['mcp-session-id'] as string;
  const transport = sessionId && transports[sessionId];
  
  if (!transport) {
    res.status(400).send('Missing or invalid session ID');
    return;
  }
  
  await transport.handleRequest(req, res);
});

// === DELETE /mcp for session cleanup
app.delete('/mcp', async (req: Request, res: Response) => {
  console.log('DELETE /mcp');
  const sessionId = req.headers['mcp-session-id'] as string;
  const transport = sessionId && transports[sessionId];
  
  if (transport) {
    transport.close();
    delete transports[sessionId];
    res.status(200).json({ success: true });
  } else {
    res.status(404).json({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Session not found' },
      id: null
    });
  }
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`✅ MCP server listening on http://localhost:3000/mcp (Streamable HTTP)`);
});

// Handle server shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down server...');
  
  // Close all active transports
  for (const transport of Object.values(transports)) {
    transport.close();
  }
  
  process.exit(0);
});