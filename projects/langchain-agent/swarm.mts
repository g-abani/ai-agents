import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { createSwarm, createHandoffTool } from "@langchain/langgraph-swarm";
import { AzureChatOpenAI } from "@langchain/openai";
import "dotenv/config";
import { AzureUtils } from "./utils/AzureUtils.mts";
import getWeather from "./tools/weatherTool.mts";
import bookHotel from "./tools/bookHotel.mts";
import bookFlight from "./tools/bookFlight.mts";

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

const transferToHotelAssistant = createHandoffTool({
  agentName: "hotel_assistant",
  description: "Transfer user to the hotel-booking assistant.",
});

const transferToFlightAssistant = createHandoffTool({
  agentName: "flight_assistant",
  description: "Transfer user to the flight-booking assistant.",
});


const flightAssistant = createReactAgent({
  llm,
  tools: [bookFlight, transferToHotelAssistant],
  prompt: "You are a flight booking assistant",
  name: "flight_assistant",
});

const hotelAssistant = createReactAgent({
  llm,
  tools: [bookHotel, transferToFlightAssistant],
  prompt: "You are a hotel booking assistant",
  name: "hotel_assistant",
});

const swarm = createSwarm({
  agents: [flightAssistant, hotelAssistant],
  defaultActiveAgent: "flight_assistant",
}).compile();

const result = await swarm.invoke({
  messages: [{
    role: "user",
    content: "first book a flight from BOS to JFK and then book a stay at McKittrick Hotel"
  }]
});

console.log(result.messages[result.messages.length - 1].content);