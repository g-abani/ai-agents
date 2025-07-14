import { AzureOpenAI } from "openai";
import { Agent, tool, OpenAIChatCompletionsModel, Runner, setTracingDisabled } from "@openai/agents";
import { tavily } from "@tavily/core";
import { Transform } from 'stream';
import dotenv from 'dotenv';
dotenv.config();

// Disable OpenAI tracing to suppress API key messages
setTracingDisabled(true);
// 🔑 Setup clients
const {
    AZURE_OPENAI_API_KEY,
    AZURE_OPENAI_ENDPOINT,
    AZURE_OPENAI_DEPLOYMENT_NAME,
    AZURE_OPENAI_API_VERSION,
    TAVILY_API_KEY
} = process.env;

const tvly = tavily({ apiKey: TAVILY_API_KEY });
const modelName = "gpt-4o-mini";
const client = new AzureOpenAI({
    endpoint: AZURE_OPENAI_ENDPOINT,
    apiKey: AZURE_OPENAI_API_KEY,
    apiVersion: AZURE_OPENAI_API_VERSION,
    deployment: AZURE_OPENAI_DEPLOYMENT_NAME,
});

// 🌐 SearchAgent using Tavily core
const SearchAgent = new Agent({
    name: "SearchAgent",
    model: new OpenAIChatCompletionsModel(client, modelName),
    instructions: `You are a search agent. Use the web_search tool to retrieve real-time information using Tavily.`,
    tools: [
        tool({
            name: "web_search",
            description: "Search the web for current information",
            parameters: {
                type: "object",
                properties: {
                    query: { type: "string", description: "Search query" },
                },
                required: ["query"],
            },
            async execute({ query }) {
                const result = await tvly.search(query);
                return JSON.stringify(result);
            },
        }),
    ],
});

// ➗ MathAgent
const MathAgent = new Agent({
    name: "MathAgent",
    model: new OpenAIChatCompletionsModel(client, modelName),
    instructions: `You are a calculator. Respond to math problems with accurate results.`,
});

// 🌤️ WeatherAgent
const WeatherAgent = new Agent({
    name: "WeatherAgent",
    model: new OpenAIChatCompletionsModel(client, modelName),
    instructions: `You are a weather specialist. Use the get_weather tool to retrieve real-time weather information for any city.`,
    tools: [
        tool({
            name: "get_weather",
            description: "Get current weather information for a specific city",
            parameters: {
                type: "object",
                properties: {
                    city: { type: "string", description: "The city name to get weather for" },
                    country: { type: "string", description: "Country code (optional)" }
                },
                required: ["city"],
            },
            async execute({ city, country }) {
                // Simulate weather API call - in production, you'd use a real weather API like OpenWeatherMap
                const weatherConditions = ['sunny', 'cloudy', 'rainy', 'partly cloudy', 'snowy', 'stormy'];
                const temperatures = [15, 18, 22, 25, 28, 32, 35];
                const humidity = [30, 45, 60, 75, 80, 85];
                
                const condition = weatherConditions[Math.floor(Math.random() * weatherConditions.length)];
                const temp = temperatures[Math.floor(Math.random() * temperatures.length)];
                const hum = humidity[Math.floor(Math.random() * humidity.length)];
                const windSpeed = Math.floor(Math.random() * 20) + 5;
                
                const weather = {
                    city: city,
                    country: country || "Unknown",
                    temperature: `${temp}°C`,
                    condition: condition,
                    humidity: `${hum}%`,
                    windSpeed: `${windSpeed} km/h`,
                    timestamp: new Date().toISOString()
                };
                
                return JSON.stringify({
                    current_weather: weather,
                    message: `Current weather in ${city}${country ? ', ' + country : ''}: ${temp}°C, ${condition}, humidity ${hum}%, wind ${windSpeed} km/h`
                });
            },
        }),
    ],
});

// 🧭 OrchestratorAgent
const orchestratorAgent = new Agent({
    name: "Orchestrator",
    model: new OpenAIChatCompletionsModel(client, modelName),
    instructions: `
You are a task orchestrator. Route the user's query to:
- Hand off to 'SearchAgent' for news or general information questions.
- Hand off to 'MathAgent' for calculations and mathematical problems.
- Hand off to 'WeatherAgent' for weather information, forecasts, or climate queries.
Always use a handoff. Do not answer directly.`,
    handoffs: [SearchAgent, MathAgent, WeatherAgent],
});

// 🚀 Execute streaming conversation with history using proper threading pattern
const run = async () => {
    const runner = new Runner();
    console.log("🚀 Running orchestrator with streaming conversation history...\n");
    
    // Simple conversation history as strings
    const conversationHistory = [];
    
    // Helper function to send user message and get streaming response
    async function userSays(text) {
        console.log(`\n👤 User: ${text}`);
        console.log(`🤖 Assistant [Orchestrator]: `);
        
        try {
            // Create input with conversation context
            const contextualInput = conversationHistory.length > 0 
                ? `Previous conversation:\n${conversationHistory.join('\n')}\n\nCurrent question: ${text}`
                : text;
            
            // Enable streaming
            const stream = await runner.run(
                orchestratorAgent,
                contextualInput,
                { 
                    stream: true,
                    verbose: true 
                }
            );
            
            // Capture streamed text and agent information
            let streamedText = '';
            let currentAgent = 'Orchestrator';
            let agentSwitches = ['Orchestrator']; // Start with orchestrator
            
            // Process streaming events to capture both text and agent info
            for await (const event of stream) {
                if (event.type === 'agent_updated_stream_event') {
                    // We track agent switches through handoff_output_item for accuracy
                }
                
                if (event.type === 'run_item_stream_event') {
                    const item = event.item;
                    
                    if (item.type === 'handoff_call_item') {
                        const handoffTarget = item.rawItem?.name?.replace('transfer_to_', '') || 'Unknown';
                        console.log(`\n🤝 [${currentAgent}] Initiating handoff to: ${handoffTarget}`);
                    }
                    
                    if (item.type === 'handoff_output_item') {
                        // Update current agent based on the actual handoff target
                        if (item.targetAgent && item.targetAgent.name) {
                            currentAgent = item.targetAgent.name;
                            agentSwitches.push(currentAgent);
                            console.log(`\n🔄 [${currentAgent}] Agent taking over after handoff...`);
                        }
                    }
                    
                    if (item.type === 'tool_call_item') {
                        console.log(`\n🔧 [${currentAgent}] Using tool: ${item.rawItem?.name || 'Unknown'}`);
                    }
                }
                
                // Capture text from raw model events
                if (event.type === 'raw_model_stream_event' && event.data?.type === 'output_text_delta') {
                    const textDelta = event.data.delta;
                    if (textDelta) {
                        process.stdout.write(textDelta);
                        streamedText += textDelta;
                    }
                }
            }
            
            // Wait for streaming completion
            const result = await stream.completed;
            
            // Determine final agent
            const finalAgent = result?.finalAgent ? result.finalAgent.name : currentAgent;
            
            // Add to conversation history with agent information
            conversationHistory.push(`Human: ${text}`);
            if (streamedText.trim()) {
                conversationHistory.push(`Assistant [${finalAgent}]: ${streamedText.trim()}`);
                console.log(`\n📚 Conversation updated (${conversationHistory.length} entries)`);
            }
            
            console.log(`\n📍 Final Response by: [${finalAgent}]`);
            if (agentSwitches.length > 0) {
                console.log(`🔄 Agent switches: ${agentSwitches.join(' → ')}`);
            }
            console.log(`⚡ Streaming completed successfully`);
            
            return streamedText.trim() || "No output received";
            
        } catch (error) {
            console.error(`❌ Error: ${error.message}`);
            return `Error: ${error.message}`;
        }
    }
    
    // Simulate a multi-turn conversation with streaming
    console.log("=".repeat(60));
    console.log("🗣️  STREAMING CONVERSATION THREAD");
    console.log("=".repeat(60));
    
    // First message - asking about Leo Messi
    console.log("\n📡 Streaming real-time search results...");
    await userSays("Who is Leo Messi and where does he play currently?");
    
    // Add a small delay to show streaming effect
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Second message - asking for calculation
    console.log("\n🔢 Streaming mathematical calculation...");
    await userSays("Also, can you calculate what 25 * 48 equals?");
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Third message - mixed request with context
    console.log("\n🔄 Streaming complex multi-agent request...");
    await userSays("Thanks! Now tell me about recent AI developments and calculate 15 + 27 * 3");
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Fourth message - follow-up question that relies on conversation context
    console.log("\n🧠 Streaming context-aware response...");
    await userSays("What was the math result from the first calculation you did?");
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Fifth message - weather query
    console.log("\n🌤️ Streaming weather information...");
    await userSays("What's the current weather like in Bangalore?");
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Sixth message - multiple weather cities
    console.log("\n🌍 Streaming multi-city weather comparison...");
    await userSays("Can you tell me the weather in London and New York?");
    
    console.log("\n" + "=".repeat(60));
    console.log("📋 STREAMING CONVERSATION SUMMARY");
    console.log("=".repeat(60));
    console.log("✅ All responses were streamed in real-time!");
    console.log("🔄 Agent handoffs were tracked and displayed");
    console.log("📡 Context was maintained across streaming turns");
    console.log("⚡ Events were captured for each streaming response");
    console.log("🤖 Agent execution details were shown for each message");
    console.log("🌤️ Weather queries routed to specialized WeatherAgent");
    
    console.log("\n" + "=".repeat(60));
    console.log("📜 COMPLETE CONVERSATION HISTORY");
    console.log("=".repeat(60));
    
    // Display the conversation history
    conversationHistory.forEach((entry, index) => {
        const truncated = entry.length > 100 ? entry.substring(0, 100) + '...' : entry;
        console.log(`\n${index + 1}. ${truncated}`);
    });
};

run();