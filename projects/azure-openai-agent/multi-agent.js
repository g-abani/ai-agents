import { Runner, setDefaultOpenAIClient, setTracingDisabled } from "@openai/agents";
import { AzureOpenAI } from "openai";
import dotenv from 'dotenv';

import { createWeatherAgent } from "./agents/WeatherAgent.js";
import { createCalculatorAgent } from "./agents/CalculatorAgent.js";
import { createRouterAgent } from "./agents/RouterAgent.js";

dotenv.config();
setTracingDisabled(true);

// Set a dummy key to avoid authentication errors with the OpenAI SDK
process.env.OPENAI_API_KEY = "dummy-key";

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

const client = new AzureOpenAI({
    endpoint: AZURE_OPENAI_ENDPOINT,
    apiKey: AZURE_OPENAI_API_KEY,
    apiVersion: AZURE_OPENAI_API_VERSION,
    deployment: AZURE_OPENAI_DEPLOYMENT_NAME,
});

setDefaultOpenAIClient(client);
const modelName = "gpt-4o-mini";

// Create the agents
const weatherAgent = createWeatherAgent(client, modelName);
const calculatorAgent = createCalculatorAgent(client, modelName);
const routerAgent = createRouterAgent(client, modelName, weatherAgent, calculatorAgent);

async function run(prompt) {
    console.log(`\n--- Running for prompt: "${prompt}" ---`);
    const runner = new Runner();
    const result = await runner.run(routerAgent, prompt, {
        // Log intermediate steps for clarity
        verbose: true,
    });

    console.log(`\nFinal response for "${prompt}":`);
    console.log(result.finalOutput);
    
    const finalAgentName = result.finalAgent ? result.finalAgent.name : routerAgent.name;
    console.log(`\nFinal agent: ${finalAgentName}`);
}

async function main() {
    await run("What is the weather like in San Francisco?");
    await run("What is 2 + 2?");
    await run("What is the weather in London and also what is 5 * 5?");
    await run("What is the capital of Odisha?");
}

main().catch(console.error); 