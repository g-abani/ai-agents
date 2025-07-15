import "dotenv/config";
import express from "express";
import cors from "cors";
import { HumanMessage } from "@langchain/core/messages";
import { agent } from "./agent.mts";
import { v4 as uuidv4 } from "uuid";
import { supervisorAgent } from "./supervised.mts";

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.static("public"));
app.use(cors());
app.use(express.json());

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, threadId = 'default' } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const agentFinalState = await supervisorAgent.invoke(
      { messages: [new HumanMessage(message)] },
      { configurable: { thread_id: threadId } }
    );
    
    console.log('All messages:', agentFinalState.messages);
    
    // Function to determine the primary agent based on transfers and responses
    const determinePrimaryAgent = (messages, mapAgentName) => {
      const toolCalls = [];
      const agentResponses = [];
      
      // Extract all tool calls and agent responses from the conversation
      messages.forEach(msg => {
        if (msg.tool_calls && msg.tool_calls.length > 0) {
          toolCalls.push(...msg.tool_calls);
        }
        
        // Track non-supervisor agents that provided content
        if (msg.constructor.name === 'AIMessage' && msg.content && msg.content.trim() !== '') {
          if (msg.name && msg.name !== 'supervisor') {
            agentResponses.push(msg.name);
          }
        }
      });
      
      console.log('Tool calls found:', toolCalls.map(tc => tc.name));
      console.log('Agent responses found:', agentResponses);
      
      // Count agent activity by transfer tool calls and responses
      const agentCounts = {};
      
      // Count by transfer tool calls
      toolCalls.forEach(tc => {
        if (tc.name === 'transfer_to_flight_assistant' || tc.name === 'book_flight') {
          agentCounts['Flight Assistant'] = (agentCounts['Flight Assistant'] || 0) + 1;
        } else if (tc.name === 'transfer_to_hotel_assistant' || tc.name === 'book_hotel') {
          agentCounts['Hotel Assistant'] = (agentCounts['Hotel Assistant'] || 0) + 1;
        } else if (tc.name === 'tavily_search') {
          agentCounts['Search Assistant'] = (agentCounts['Search Assistant'] || 0) + 1;
        }
      });
      
      // Count by agent responses
      agentResponses.forEach(agentName => {
        const displayName = mapAgentName(agentName);
        agentCounts[displayName] = (agentCounts[displayName] || 0) + 1;
      });
      
      console.log('Agent counts:', agentCounts);
      
      // Return the agent with the highest count, or supervisor if none
      const agentNames = Object.keys(agentCounts);
      if (agentNames.length === 0) {
        return 'Supervisor';
      }
      
      // Find the agent with the most activity
      const primaryAgent = agentNames.reduce((a, b) => 
        agentCounts[a] > agentCounts[b] ? a : b
      );
      
      return primaryAgent;
    };
    
    // Function to map internal agent names to display names
    const mapAgentName = (internalName) => {
      const agentNameMap = {
        'flight_assistant': 'Flight Assistant',
        'hotel_assistant': 'Hotel Assistant',
        'tavily_search': 'Search Assistant',
        'supervisor': 'Supervisor'
      };
      return agentNameMap[internalName] || internalName;
    };
    
    // Process messages to extract agent information
    const processedMessages = agentFinalState.messages
      .filter(msg => msg.content && msg.content.trim() !== '') // Filter out empty messages
      .map(msg => {
        let agentName = 'Supervisor';
        
        // Check if this is a user message
        if (msg.constructor.name === 'HumanMessage') {
          return {
            content: msg.content,
            agentName: 'User',
            type: 'user'
          };
        }
        
        // Check if this is an AI message from a specific agent
        if (msg.constructor.name === 'AIMessage') {
          // For messages with tool calls, determine agent by tool name
          if (msg.tool_calls && msg.tool_calls.length > 0) {
            const toolNames = msg.tool_calls.map(tc => tc.name);
            if (toolNames.includes('book_flight')) {
              agentName = 'Flight Assistant';
            } else if (toolNames.includes('book_hotel')) {
              agentName = 'Hotel Assistant';
            } else if (toolNames.includes('tavily_search')) {
              agentName = 'Search Assistant';
            }
          }
          // Try to determine the agent based on message metadata
          else if (msg.name) {
            agentName = mapAgentName(msg.name);
          }
          
          return {
            content: msg.content,
            agentName: agentName,
            type: 'agent',
            toolCalls: msg.tool_calls || []
          };
        }
        
        // For tool messages, try to identify the agent
        if (msg.constructor.name === 'ToolMessage') {
          if (msg.name === 'book_flight') {
            agentName = 'Flight Assistant';
          } else if (msg.name === 'book_hotel') {
            agentName = 'Hotel Assistant';
          } else if (msg.name === 'tavily_search') {
            agentName = 'Search Assistant';
          }
          
          return {
            content: msg.content,
            agentName: agentName,
            type: 'tool',
            toolName: msg.name
          };
        }
        
        return {
          content: msg.content,
          agentName: agentName,
          type: 'unknown'
        };
      });
    
    // Determine the primary agent that handled the request
    const primaryAgent = determinePrimaryAgent(agentFinalState.messages, mapAgentName);
    
    // Get the final response (last AI message)
    const finalResponse = agentFinalState.messages[agentFinalState.messages.length - 1];
    
    console.log('Primary agent determined:', primaryAgent);
    
    res.json({ 
      response: finalResponse.content,
      agentName: primaryAgent,
      messages: processedMessages,
      threadId,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Chat server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`Chat endpoint: POST http://localhost:${PORT}/api/chat`);
}); 