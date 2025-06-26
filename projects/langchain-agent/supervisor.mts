import { AzureChatOpenAI } from "@langchain/openai";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import "dotenv/config";
import {
  StateGraph,
  MessagesAnnotation,
  END,
  START,
} from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { AIMessage } from "@langchain/core/messages";

const bookHotel = tool(
  async (input: { hotel_name: string }) => {
    return `Successfully booked a stay at ${input.hotel_name}.`;
  },
  {
    name: "book_hotel",
    description: "Book a hotel",
    schema: z.object({
      hotel_name: z.string().describe("The name of the hotel to book"),
    }),
  }
);

const bookFlight = tool(
  async (input: { from_airport: string; to_airport: string }) => {
    return `Successfully booked a flight from ${input.from_airport} to ${input.to_airport}.`;
  },
  {
    name: "book_flight",
    description: "Book a flight",
    schema: z.object({
      from_airport: z.string().describe("The departure airport code"),
      to_airport: z.string().describe("The arrival airport code"),
    }),
  }
);

const tools = [bookFlight, bookHotel];
const toolNode = new ToolNode(tools);

const llm = new AzureChatOpenAI({
  temperature: 0,
  azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
  azureOpenAIApiInstanceName: process.env.AZURE_OPENAI_API_INSTANCE_NAME,
  azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME,
  azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION,
}).bindTools(tools);

function shouldContinue(state: { messages: AIMessage[] }) {
  const { messages } = state;
  const lastMessage = messages[messages.length - 1];
  if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
    return "tools";
  }
  return END;
}

async function callModel(state: { messages: AIMessage[] }) {
  const { messages } = state;
  const response = await llm.invoke(messages);
  return {
    messages: [response],
  };
}

const workflow = new StateGraph(MessagesAnnotation)
  .addNode("agent", callModel)
  .addNode("tools", toolNode);

workflow.addEdge(START, "agent");
workflow.addConditionalEdges("agent", shouldContinue, {
  tools: "tools",
  __end__: END,
});
workflow.addEdge("tools", "agent");

const app = workflow.compile();

const stream = await app.stream({
  messages: [
    {
      role: "user",
      content:
        "first book a flight from BOS to JFK and then book a stay at McKittrick Hotel",
    },
  ],
});

console.log("Trace of operations:\n");

for await (const chunk of stream) {
  const [key, value] = Object.entries(chunk)[0];

  if (key === "agent") {
    const message = (value as { messages: AIMessage[] }).messages[0];
    if (message.tool_calls && message.tool_calls.length) {
      const assistant_names = message.tool_calls
        .map((tc: any) => {
          if (tc.name === "book_flight") return "Flight Assistant";
          if (tc.name === "book_hotel") return "Hotel Assistant";
          return tc.name;
        })
        .join(" and ");
      console.log(`Supervisor: Delegating tasks to ${assistant_names}.`);
      console.log("--------------------------------------------------");
    } else if (message.content) {
      console.log(`Supervisor: Here is the final response:`);
      console.log(message.content);
      console.log("--------------------------------------------------");
    }
  } else if (key === "tools") {
    for (const toolMessage of (value as { messages: AIMessage[] }).messages) {
      let assistant_name = (toolMessage as any).name;
      if ((toolMessage as any).name === "book_flight") {
        assistant_name = "Flight Assistant";
      } else if ((toolMessage as any).name === "book_hotel") {
        assistant_name = "Hotel Assistant";
      }
      console.log(`${assistant_name}: Task completed.`);
      console.log(`${(toolMessage as any).content}`);
      console.log("--------------------------------------------------");
    }
  }
} 