import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { AzureChatOpenAI } from "@langchain/openai";
import "dotenv/config";
import getWeather from "./tools/weatherTool.mts";
import bookHotel from "./tools/bookHotel.mts";
import { MultiServerMCPClient } from "@langchain/mcp-adapters";

const {
    AZURE_OPENAI_API_KEY,
    AZURE_OPENAI_API_DEPLOYMENT_NAME,
    AZURE_OPENAI_API_INSTANCE_NAME,
    AZURE_OPENAI_API_VERSION
} = process.env;

const llm = new AzureChatOpenAI({
    temperature: 0,
    azureOpenAIApiKey: AZURE_OPENAI_API_KEY,
    azureOpenAIApiInstanceName: AZURE_OPENAI_API_INSTANCE_NAME,
    azureOpenAIApiDeploymentName: AZURE_OPENAI_API_DEPLOYMENT_NAME,
    azureOpenAIApiVersion: AZURE_OPENAI_API_VERSION,
});

/*const client1 = new MultiServerMCPClient({
    mcpServers: {
        "demo-server": {
            command: "node",
            // Replace with absolute path to your math_server.py file
            args: ["/Users/abani/code/ai-agents/projects/mcp-server/build/index.js"],
            transport: "stdio",
        }
    }
})*/

const client = new MultiServerMCPClient({
    mcpServers: {
        "my-mcp-server": {
            url: "http://localhost:3000/mcp",
            transport: "http"
        }
    }
});

const serverClient = await client.getClient("my-mcp-server");
if (!serverClient) {
  throw new Error("MCP Server client not found for 'my-mcp-server'");
}
//console.log(serverClient);
// Get and log available tools from MCP server
const mcpTools = await client.getTools();

console.log("🛠️ Available MCP Tools:", mcpTools.map(tool => ({
    name: tool.name,
    description: tool.description
})));

const agent = createReactAgent({
    llm,
    tools: mcpTools,
    prompt: "You are a helpful assistant. You can use the tools available to help the user.",
});


const hotelAssistant = createReactAgent({
    llm,
    tools: [bookHotel],
    prompt: "You are a hotel booking assistant",
    name: "hotel_assistant",
});

// Run the agent
/*const agentResponse = await agent.invoke({
    messages: [{ role: "user", content: "How is the weather at Oslo, Norway?" }],
});
const hotelAgentResponse = await hotelAssistant.invoke({
    messages: [{ role: "user", content: "Book a stay at McKittrick Hotel" }],
});
console.log(agentResponse.messages[agentResponse.messages.length - 1].content);
console.log(hotelAgentResponse.messages[hotelAgentResponse.messages.length - 1].content);
*/

console.log("\n🤖 Testing MCP Tool Integration...");
console.log("📝 Question: What is the sum of 4 + 49?");

const result1 = await agent.invoke({
    messages: [{ role: "user", content: "What is the sum of 4 + 49?" },
        { role: "user", content: "Greet Abani" }
    ]
});
const prompt = await serverClient.getPrompt({
    name: "simple-summary",
    arguments: {
        text: "function test() { return 42; }"
    }
});
//console.log("Got prompt:", prompt);
//console.log("Prompt messages structure:", JSON.stringify(prompt.messages, null, 2));

// Convert MCP prompt format to LangGraph format
const langGraphMessages = prompt.messages.map((msg: any) => ({
    role: msg.role,
    content: typeof msg.content === 'string' ? msg.content : msg.content.text
}));

const reviewResult = await agent.invoke({
    messages: langGraphMessages
});
console.log("\n📝 Prompt-based Agent Response:");
console.log(reviewResult.messages[reviewResult.messages.length - 1].content);

console.log("\n🔗 Advanced Integration Example:\n");
    
const complexQuery = `
    I need to:
    1. Search for API documentation 
    2. Get Alice's contact information
    3. Create a project status report for "API Modernization" project for Q3 2025
    
    Please help me with all of these tasks.
`;

console.log("7️⃣ Complex multi-step task:");
const complexResult = await agent.invoke({
    messages: [{ role: "user", content: complexQuery }]
});
console.log(complexResult.messages[complexResult.messages.length - 1].content);

console.log("3️⃣ Available resources:");
// Note: Resource API methods not yet available in LangChain MCP adapter
console.log("  - Resources available on server but API access pending");

// Read a specific resource  
console.log("\n4️⃣ Reading project overview:");
console.log("  - Resource reading API not yet available in LangChain adapter");

/*
const resources = await serverClient.request({ method: "resources/list" });
resources.resources.forEach((resource: any) => {
    console.log(`  - ${resource.name}: ${resource.uri}`);
});

const projectDoc = await serverClient.request({ 
    method: "resources/read", 
    params: { uri: "doc://project-overview" } 
});
console.log(projectDoc);
*/

await client.close();
console.log("\n📋 Agent Response:");
console.log(result1.messages[result1.messages.length - 1].content);

console.log("\n🔍 All Messages in Conversation:");
result1.messages.forEach((msg, i) => {
    const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
    const role = msg.constructor.name;
    
    console.log(`\n${i + 1}. [${role}]`);
    if (role === 'ToolMessage') {
        console.log(`   📦 Raw Tool Output: ${content}`);
    } else if (role === 'AIMessage' && i === result1.messages.length - 1) {
        console.log(`   🎯 Final AI Response: ${content}`);
    } else {
        console.log(`   💬 Content: ${content?.substring(0, 200)}`);
    }
});