import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { 
  ListToolsRequestSchema,
  CallToolRequestSchema 
} from "@modelcontextprotocol/sdk/types.js";
import crypto from "crypto";

// Create the MCP server
const server = new Server(
  {
    name: "demo-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define tools that the server provides
const tools = [
  {
    name: "calculate_sum",
    description: "Add two numbers together",
    inputSchema: {
      type: "object",
      properties: {
        a: { type: "number", description: "First number" },
        b: { type: "number", description: "Second number" }
      },
      required: ["a", "b"]
    }
  },
  {
    name: "greet_user",
    description: "Generate a personalized greeting message",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Name of the person to greet" }
      },
      required: ["name"]
    }
  },
  {
    name: "generate_uuid",
    description: "Generate a random universally unique identifier (UUID)",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false
    }
  }
];

// Handle tools/list requests
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: tools
  };
});

// Handle tools/call requests
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  // Add logging to see when tools are called
  console.error(`🔧 MCP Tool Called: ${name} with args:`, JSON.stringify(args, null, 2));

  switch (name) {
    case "calculate_sum": {
      console.log("calculate_sum", args);
      const { a, b } = args;
      const result = a + b;
      return {
        content: [
          {
            type: "text",
            text: `The sum of ${a} and ${b} is: ${result}`
          }
        ]
      };
    }

    case "greet_user": {
      const { name } = args;
      return {
        content: [
          {
            type: "text", 
            text: `Hello, ${name}! Welcome to the MCP demo server.`
          }
        ]
      };
    }

    case "generate_uuid": {
      const uuid = crypto.randomUUID();
      return {
        content: [
          {
            type: "text",
            text: uuid
          }
        ]
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// Create stdio transport
const transport = new StdioServerTransport();

// Start the server
async function main() {
  try {
    await server.connect(transport);
    console.error("MCP Demo Server running on stdio");
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  await server.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await server.close();
  process.exit(0);
});

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
