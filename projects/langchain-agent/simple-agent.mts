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