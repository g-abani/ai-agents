import "dotenv/config";

import { TavilySearch } from "@langchain/tavily";
import { AzureChatOpenAI, ChatOpenAI } from "@langchain/openai";
import { MemorySaver } from "@langchain/langgraph";
import { HumanMessage } from "@langchain/core/messages";
import { createReactAgent } from "@langchain/langgraph/prebuilt";

// Define the tools for the agent to use
const agentTools = [new TavilySearch({ maxResults: 3 })];

// Create a model and give it access to the tools
const agentModel = new AzureChatOpenAI({
  temperature: 0,
  azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
  azureOpenAIApiInstanceName: process.env.AZURE_OPENAI_API_INSTANCE_NAME,
  azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME,
  azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION
});

// Initialize memory to persist state between graph runs
const agentCheckpointer = new MemorySaver();
const agent = createReactAgent({
  llm: agentModel,
  tools: agentTools,
  checkpointSaver: agentCheckpointer,
});

async function main() {
    // Now it's time to use!
    const agentFinalState = await agent.invoke(
      { messages: [new HumanMessage("what is the current weather in sf")] },
      { configurable: { thread_id: "42" } },
    );
    
    console.log(
      agentFinalState.messages[agentFinalState.messages.length - 1].content,
    );
    
    const agentNextState = await agent.invoke(
      { messages: [new HumanMessage("what about ny")] },
      { configurable: { thread_id: "42" } },
    );
    
    console.log(
      agentNextState.messages[agentNextState.messages.length - 1].content,
    );
}

main(); 