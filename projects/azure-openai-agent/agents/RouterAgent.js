import { Agent, OpenAIChatCompletionsModel } from "@openai/agents";
import { getWeather } from "../tools/weatherTool.js";
import { calculatorTool } from "../tools/calculatorTool.js";

export function createRouterAgent(client, modelName, weatherAgent, calculatorAgent) {
    return Agent.create({
        name: 'Router Agent',
        description: 'A router agent that decides which specialist agent to use for a given task.',
        tools: [getWeather, calculatorTool],
        handoffs: [weatherAgent, calculatorAgent],
        model: new OpenAIChatCompletionsModel(client, modelName),
        instructions: `You are a router agent. Your purpose is to analyze the user's request and decide which specialized agent is best suited to handle it.

- If the request is about weather, hand off to the "Weather Agent".
- If the request involves a calculation, hand off to the "Calculator Agent".
- If you can answer the question yourself using your available tools, do so.
- For general conversation, you can respond directly.`,
    });
} 