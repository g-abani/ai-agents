// index.js
import { Agent, Runner, setDefaultOpenAIClient, OpenAIChatCompletionsModel, tool } from "@openai/agents";
import { AzureOpenAI } from "openai";
import { z } from "zod";
import dotenv from 'dotenv';
import { RECOMMENDED_PROMPT_PREFIX } from '@openai/agents-core/extensions';
dotenv.config();
console.log(RECOMMENDED_PROMPT_PREFIX);
const {
    AZURE_OPENAI_API_KEY,
    AZURE_OPENAI_ENDPOINT,
    AZURE_OPENAI_DEPLOYMENT_NAME,
    AZURE_OPENAI_API_VERSION
  } = process.env;

if (!AZURE_OPENAI_API_KEY || !AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_DEPLOYMENT_NAME) {
    console.error("Please set AZURE_OPENAI_API_KEY, AZURE_OPENAI_ENDPOINT, and AZURE_OPENAI_DEPLOYMENT_NAME environment variables.");
    process.exit(1);
}

// 1. Initialize Azure OpenAI Client

const client = new AzureOpenAI({
    endpoint: AZURE_OPENAI_ENDPOINT,
    apiKey: AZURE_OPENAI_API_KEY,
    apiVersion: AZURE_OPENAI_API_VERSION,
    deployment: AZURE_OPENAI_DEPLOYMENT_NAME,
});

setDefaultOpenAIClient(client);
const modelName = "gpt-4o-mini";
// 2. Define a simple tool
// This tool will simulate getting the current time.
const getCurrentTimeTool = {
    type: "function",
    name: "getCurrentTime",
    description: "Gets the current date and time.",
    parameters: {
        type: "object",
        properties: {}, // No parameters needed for this tool
        required: []
    },
    needsApproval: () => false,
    async call() {
        const now = new Date();
        return `The current time is ${now.toLocaleTimeString()} on ${now.toLocaleDateString()}.`;
    }
};
const getWeather = tool({
    name: 'get_weather',
    description: 'Return the weather for a given city.',
    parameters: z.object({ city: z.string() }),
    async execute({ city }) {
      return `The weather in ${city} is sunny.`;
    },
  });
// 3. Create the Agent
// The agent will use the Azure OpenAI model and be able to call the defined tool.
const agent = Agent.create({
    name: 'Weather Agent',
    tools: [getWeather], // Register the tool with the agent
    // Uncomment the line below for verbose logging to see agent's thought process
    // verbose: true,
    model: new OpenAIChatCompletionsModel(client, modelName),
});

// 4. Run the Agent
async function runAgent() {
    console.log("Agent is ready. Asking a question...");
    const runner = new Runner();
    const result = await runner.run(
        agent,
        'How is the weather in Tokyo?',
    );
    console.log("\nAgent Response for 'How is the weather in Tokyo?':");
    console.log(result.finalOutput);
    // Example 2: A general question that doesn't require a tool
}

// Execute the agent
runAgent().catch(console.error);

