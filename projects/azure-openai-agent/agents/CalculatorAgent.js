import { Agent, OpenAIChatCompletionsModel } from "@openai/agents";
import { calculatorTool } from "../tools/calculatorTool.js";

export function createCalculatorAgent(client, modelName) {
    return Agent.create({
        name: 'Calculator Agent',
        description: 'An agent that can perform mathematical calculations.',
        tools: [calculatorTool],
        model: new OpenAIChatCompletionsModel(client, modelName),
    });
} 