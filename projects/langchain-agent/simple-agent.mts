import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { AzureChatOpenAI } from "@langchain/openai";
import "dotenv/config";
import getWeather from "./tools/weatherTool.mts";
import bookHotel from "./tools/bookHotel.mts";

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

const agent = createReactAgent({
    llm,
    tools: [getWeather],
    prompt: "You are a helpful assistant",
});


const hotelAssistant = createReactAgent({
    llm,
    tools: [bookHotel],
    prompt: "You are a hotel booking assistant",
    name: "hotel_assistant",
});

// Run the agent
const agentResponse = await agent.invoke({
    messages: [{ role: "user", content: "How is the weather at Oslo, Norway?" }],
});
const hotelAgentResponse = await hotelAssistant.invoke({
    messages: [{ role: "user", content: "Book a stay at McKittrick Hotel" }],
});
console.log(agentResponse.messages[agentResponse.messages.length - 1].content);
console.log(hotelAgentResponse.messages[hotelAgentResponse.messages.length - 1].content);
