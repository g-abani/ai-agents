/**
 * Utility class for Azure OpenAI related patches and helpers
 */
export class AzureUtils {
    /**
     * Patches Azure OpenAI LLM instance to ensure bindTools method works correctly
     * @param llm - The Azure OpenAI LLM instance to patch
     * @returns The patched LLM instance
     */
    static patchAzure(llm: any): any {
      // Ensure bindTools method exists
      if (typeof llm.bindTools !== "function") {
        llm.bindTools = () => llm;
      }
  
      // Store the original bindTools method
      const original = llm.bindTools;
      
      // Override bindTools with logging and enhanced functionality
      llm.bindTools = function (tools: any, opts?: any) {
        console.log(
          "[AzureUtils.patchAzure] bindTools called:",
          Array.isArray(tools) 
            ? tools.map((t: any) => t.name || t).join(", ") 
            : Object.keys(tools || {}),
          opts ?? "-"
        );
        
        const out = original.call(this, tools, opts);
        out.bindTools = llm.bindTools;
        return out;
      };
  
      return llm;
    }
  }