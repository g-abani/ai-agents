import "dotenv/config";

import { TavilySearch } from "@langchain/tavily";
import { AzureChatOpenAI } from "@langchain/openai";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { StateGraph, END, MessagesAnnotation } from "@langchain/langgraph";

// Define the tools for the agent to use
const tools = [new TavilySearch({ maxResults: 3 })];
const toolNode = new ToolNode(tools);

// Create Azure OpenAI model and give it access to the tools
const model = new AzureChatOpenAI({
  temperature: 0,
  azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
  azureOpenAIApiInstanceName: "beher-maaweqv1-eastus2",
  azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME,
  azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION,
}).bindTools(tools);

// Define the function that determines whether to continue or not
function shouldContinue({ messages }: typeof MessagesAnnotation.State) {
  const lastMessage = messages[messages.length - 1] as AIMessage;
  
  // If the LLM makes a tool call, then we route to the "tools" node
  if (lastMessage.tool_calls?.length) {
    console.log("🔧 Agent is calling tools...");
    return "tools";
  }
  
  // Otherwise, we stop (reply to the user) using the special "END" node
  console.log("✅ Agent is ready to respond");
  return END;
}

// Define the function that calls the model
async function callModel(state: typeof MessagesAnnotation.State) {
  console.log("🧠 Calling Azure OpenAI model...");
  const response = await model.invoke(state.messages);
  
  // We return a list, because this will get added to the existing list
  return { messages: [response] };
}

// Define a new graph
const workflow = new StateGraph(MessagesAnnotation)
  .addNode("agent", callModel)
  .addEdge("__start__", "agent") // __start__ is a special name for the entrypoint
  .addNode("tools", toolNode)
  .addEdge("tools", "agent")
  .addConditionalEdges("agent", shouldContinue);

// Finally, we compile it into a LangChain Runnable
const app = workflow.compile();

// Advanced usage function with better logging
async function runAdvancedAgent() {
  try {
    console.log("🚀 Starting advanced agent with Azure OpenAI...\n");

    // First query
    console.log("📝 Query 1: What is the weather in San Francisco?");
    const finalState = await app.invoke({
      messages: [new HumanMessage("what is the weather in San Francisco?")],
    });

    console.log("\n🌤️ Response:");
    console.log(finalState.messages[finalState.messages.length - 1].content);
    console.log("\n" + "=".repeat(100) + "\n");

    // Follow-up query with context
    console.log("📝 Query 2: What about New York? (with context from previous conversation)");
    const nextState = await app.invoke({
      // Including the messages from the previous run gives the LLM context
      // This way it knows we're asking about the weather in NY
      messages: [...finalState.messages, new HumanMessage("what about New York?")],
    });

    console.log("\n🏙️ Response:");
    console.log(nextState.messages[nextState.messages.length - 1].content);

    // Demonstrate agent memory and reasoning
    console.log("\n" + "=".repeat(100) + "\n");
    console.log("📝 Query 3: Compare the temperatures (testing reasoning capabilities)");
    const comparisonState = await app.invoke({
      messages: [...nextState.messages, new HumanMessage("Can you compare the temperatures between these two cities?")],
    });

    console.log("\n📊 Response:");
    console.log(comparisonState.messages[comparisonState.messages.length - 1].content);

  } catch (error: any) {
    console.error("❌ Error running advanced agent:", error);
    
    // More detailed error handling for Azure OpenAI specific issues
    if (error.message?.includes("azure")) {
      console.error("💡 Tip: Check your Azure OpenAI configuration:");
      console.error("   - API Key is correct");
      console.error("   - Endpoint URL is correct");
      console.error("   - Deployment name matches your Azure deployment");
      console.error("   - API version is supported");
    }
  }
}

// Optional: Function to save the graph visualization
async function saveGraphVisualization() {
  try {
    const { writeFileSync } = await import("node:fs");
    const graph = app.getGraph();
    const image = await graph.drawMermaidPng();
    const arrayBuffer = await image.arrayBuffer();
    writeFileSync("./agent-graph.png", new Uint8Array(arrayBuffer));
    console.log("📊 Graph visualization saved as 'agent-graph.png'");
  } catch (error) {
    console.log("ℹ️ Could not save graph visualization (optional feature)");
  }
}

// Run the advanced agent
console.log("🎯 Azure OpenAI LangGraph Agent Starting...\n");
runAdvancedAgent().then(() => {
  console.log("\n✨ Agent execution completed!");
  saveGraphVisualization();
}); 