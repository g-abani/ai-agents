import { Agent, OpenAIChatCompletionsModel } from "@openai/agents";
import { getWeather } from "../tools/weatherTool.js";

export function createWeatherAgent(client, modelName) {
    return Agent.create({
        name: 'Weather Agent',
        description: 'An agent that can get the current weather for a specific city.',
        tools: [getWeather],
        model: new OpenAIChatCompletionsModel(client, modelName),
    });
} 