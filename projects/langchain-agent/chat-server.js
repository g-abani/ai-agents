import "dotenv/config";
import express from "express";
import cors from "cors";
import { HumanMessage } from "@langchain/core/messages";
import { agent } from "./agent.mts";
import { v4 as uuidv4 } from "uuid";
import { supervisorAgent } from "./supervised.mts";

const app = express();
const PORT = process.env.PORT || 3001;

// Store active SSE connections
const sseConnections = new Map();

// Middleware
app.use(express.static("public"));
app.use(cors());
app.use(express.json());

// SSE endpoint for real-time flow visualization
app.get('/api/flow/:threadId', (req, res) => {
  const threadId = req.params.threadId;
  
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Store this connection
  sseConnections.set(threadId, res);
  
  // Send initial connection event
  res.write(`data: ${JSON.stringify({
    type: 'connected',
    timestamp: new Date().toISOString()
  })}\n\n`);

  // Clean up on disconnect
  req.on('close', () => {
    sseConnections.delete(threadId);
  });
});

// Function to send SSE events
function sendFlowEvent(threadId, event) {
  const connection = sseConnections.get(threadId);
  if (connection) {
    connection.write(`data: ${JSON.stringify({
      ...event,
      timestamp: new Date().toISOString()
    })}\n\n`);
  }
}

// Enhanced chat endpoint with flow visualization
app.post('/api/chat', async (req, res) => {
  try {
    const { message, threadId = 'default' } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Send initial flow event
    sendFlowEvent(threadId, {
      type: 'request_start',
      message: message,
      agent: 'supervisor'
    });

    // Create a custom stream to capture execution events
    const executionEvents = [];
    
    // Patch console.log to capture LangGraph internal logs
    const originalLog = console.log;
    console.log = (...args) => {
      const logMessage = args.join(' ');
      
      // Capture tool calls
      if (logMessage.includes('Tool calls found:')) {
        const toolCalls = logMessage.match(/\[(.*?)\]/)?.[1]?.split(', ') || [];
        toolCalls.forEach(toolCall => {
          const cleanTool = toolCall.replace(/['"]/g, '');
          sendFlowEvent(threadId, {
            type: 'tool_call',
            tool: cleanTool,
            agent: getAgentFromTool(cleanTool)
          });
        });
      }
      
      // Capture agent responses
      if (logMessage.includes('Agent responses found:')) {
        const agents = logMessage.match(/\[(.*?)\]/)?.[1]?.split(', ') || [];
        agents.forEach(agent => {
          const cleanAgent = agent.replace(/['"]/g, '');
          sendFlowEvent(threadId, {
            type: 'agent_response',
            agent: mapAgentName(cleanAgent)
          });
        });
      }
      
      originalLog(...args);
    };

    const agentFinalState = await supervisorAgent.invoke(
      { messages: [new HumanMessage(message)] },
      { configurable: { thread_id: threadId } }
    );
    
    // Restore console.log
    console.log = originalLog;
    
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

    // Function to get agent from tool name
    function getAgentFromTool(toolName) {
      if (toolName.includes('flight')) return 'Flight Assistant';
      if (toolName.includes('hotel')) return 'Hotel Assistant';
      if (toolName.includes('search') || toolName.includes('tavily')) return 'Search Assistant';
      return 'Supervisor';
    }
    
    // Process messages to extract agent information
    const processedMessages = agentFinalState.messages
      .filter(msg => msg.content && msg.content.trim() !== '') // Filter out empty messages
      .map((msg, index) => {
        let agentName = 'Supervisor';
        
        // Send flow events for each message
        if (msg.constructor.name === 'HumanMessage') {
          sendFlowEvent(threadId, {
            type: 'user_message',
            message: msg.content,
            step: index
          });
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
            
            // Send tool call events
            msg.tool_calls.forEach(tc => {
              sendFlowEvent(threadId, {
                type: 'tool_execution',
                tool: tc.name,
                agent: getAgentFromTool(tc.name),
                step: index
              });
            });
          }
          // Try to determine the agent based on message metadata
          else if (msg.name) {
            agentName = mapAgentName(msg.name);
          }
          
          // Send agent message event
          if (msg.content) {
            sendFlowEvent(threadId, {
              type: 'agent_message',
              agent: agentName,
              message: msg.content.substring(0, 100),
              step: index
            });
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
          
          sendFlowEvent(threadId, {
            type: 'tool_result',
            tool: msg.name,
            agent: agentName,
            result: msg.content.substring(0, 100),
            step: index
          });
          
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
    
    // Send completion event
    sendFlowEvent(threadId, {
      type: 'request_complete',
      agent: primaryAgent,
      response: finalResponse.content.substring(0, 100)
    });
    
    res.json({ 
      response: finalResponse.content,
      agentName: primaryAgent,
      messages: processedMessages,
      threadId,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Chat error:', error);
    sendFlowEvent(req.body.threadId, {
      type: 'error',
      error: error.message
    });
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
  console.log(`Flow visualization: GET http://localhost:${PORT}/api/flow/:threadId`);
}); 