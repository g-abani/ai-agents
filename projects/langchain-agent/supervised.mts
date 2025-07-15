import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { createSupervisor } from "@langchain/langgraph-supervisor";
import { AzureChatOpenAI } from "@langchain/openai";
import "dotenv/config";
import { AzureUtils } from "./utils/AzureUtils.mts";
import { MemorySaver, InMemoryStore } from "@langchain/langgraph";
import bookHotel from "./tools/bookHotel.mts";
import bookFlight from "./tools/bookFlight.mts";
import { TavilySearch } from "@langchain/tavily";

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

const agentTools = [new TavilySearch({ maxResults: 3 })];

// Create specialized agents
const flightAssistant = createReactAgent({
  llm,
  tools: [bookFlight],
  prompt: "You are a flight booking assistant. Always identify yourself as 'Flight Assistant' in your responses.",
  name: "flight_assistant",
});

const hotelAssistant = createReactAgent({
  llm,
  tools: [bookHotel],
  prompt: "You are a hotel booking assistant. Always identify yourself as 'Hotel Assistant' in your responses.",
  name: "hotel_assistant",
});

const supervisor = createSupervisor({
  agents: [flightAssistant, hotelAssistant],
  llm: AzureUtils.patchAzure(llm),
  tools: agentTools,
  prompt: "You manage a hotel booking assistant and a flight booking assistant and an assistant that can search the web for information",
});

const checkpointer = new MemorySaver()
const store = new InMemoryStore()

const supervisorAgent = supervisor.compile(
  {
    checkpointer,
    store,
  }
);

export { supervisorAgent };

// Run the agent
/*const result = await supervisorAgent.invoke({
  messages: [{
    role: "user",
    content: "first book a flight from BOS to JFK and then book a stay at McKittrick Hotel and find the capital of Norway and check the weather there"
  }]
});
console.log(result.messages[result.messages.length - 1].content);*/

