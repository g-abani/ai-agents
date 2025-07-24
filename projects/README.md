# AI Agents MCP Server

A Model Context Protocol (MCP) server that provides various tools for AI agents including weather information, calculations, and file management.

## Features

This MCP server provides the following tools:

- **🌤️ Weather Tool**: Get weather information for any location (simulated data for demo)
- **🧮 Calculator Tool**: Perform mathematical calculations safely
- **📁 File Manager**: Read and write files securely

## Installation

```bash
npm install
```

## Development

```bash
# Run in development mode
npm run dev

# Build for production
npm run build

# Run built version
npm start
```

## Available Tools

### get_weather
Get current weather information for a location.
- **Input**: `{ location: string }`
- **Example**: `{ "location": "Paris, France" }`

### calculate
Perform mathematical calculations.
- **Input**: `{ expression: string }`
- **Example**: `{ "expression": "2 + 2 * 3" }`

### read_file
Read contents of a file.
- **Input**: `{ path: string }`
- **Example**: `{ "path": "./example.txt" }`

### write_file
Write content to a file.
- **Input**: `{ path: string, content: string }`
- **Example**: `{ "path": "./output.txt", "content": "Hello World" }`

## Integration with LangChain Agents

To use this MCP server with your LangChain agents, you can create an MCP tool wrapper:

```typescript
import { DynamicStructuredTool } from "@langchain/core/tools";
import { spawn } from "child_process";
import { z } from "zod";

// Create an MCP client tool
export function createMCPTool() {
  return new DynamicStructuredTool({
    name: "mcp_tool",
    description: "Execute tools via MCP server",
    schema: z.object({
      tool_name: z.string().describe("Name of the tool to execute"),
      args: z.object({}).passthrough().describe("Arguments for the tool"),
    }),
    func: async ({ tool_name, args }) => {
      // Communication with MCP server would go here
      // This is a simplified example - real implementation would use MCP client
      return `MCP tool ${tool_name} executed with args: ${JSON.stringify(args)}`;
    },
  });
}
```

## Configuration

Create a `.env` file in your project root:

```env
# MCP Server Configuration
MCP_SERVER_PORT=3000
MCP_SERVER_HOST=localhost
```

## Security Notes

- File operations are restricted to the server's working directory
- Calculator only allows basic mathematical operations
- All inputs are validated and sanitized

## Architecture

```
src/
├── index.ts           # Main MCP server
├── tools/
│   ├── weather.ts     # Weather tool implementation
│   ├── calculator.ts  # Calculator tool implementation
│   └── fileManager.ts # File management tools
└── resources/         # Static resources (if needed)
```

## Testing

You can test the MCP server using the MCP client tools or by integrating it with your AI agents.

```bash
# Build and start the server
npm run build
npm start
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License 