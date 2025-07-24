import { promises as fs } from 'fs';
import { dirname } from 'path';

interface FileArgs {
  path: string;
  content?: string;
}

export async function fileManagerTool(operation: string, args: FileArgs) {
  const { path, content } = args;
  
  try {
    switch (operation) {
      case 'read_file':
        const fileContent = await fs.readFile(path, 'utf-8');
        return {
          content: [
            {
              type: "text" as const,
              text: `📄 File Content (${path}):
\`\`\`
${fileContent}
\`\`\``,
            },
          ],
        };
      
      case 'write_file':
        if (!content) {
          throw new Error('Content is required for write_file operation');
        }
        
        // Ensure directory exists
        await fs.mkdir(dirname(path), { recursive: true });
        
        // Write file
        await fs.writeFile(path, content, 'utf-8');
        
        return {
          content: [
            {
              type: "text" as const,
              text: `✅ File written successfully to: ${path}
Content length: ${content.length} characters`,
            },
          ],
        };
      
      default:
        throw new Error(`Unknown file operation: ${operation}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text" as const,
          text: `❌ File operation failed: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
    };
  }
}
