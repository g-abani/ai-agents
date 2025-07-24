import "dotenv/config";
import express from "express";
import cors from "cors";
import { AzureOpenAI } from "openai";
import { Agent, OpenAIChatCompletionsModel, Runner, tool, setTracingDisabled, run } from "@openai/agents";
import { z } from 'zod';

// Disable tracing to avoid noise
setTracingDisabled(true);

// Initialize Azure OpenAI
const client = new AzureOpenAI({
    apiKey: process.env.AZURE_OPENAI_API_KEY,
    endpoint: process.env.AZURE_OPENAI_ENDPOINT,
    apiVersion: process.env.AZURE_OPENAI_API_VERSION,
});

const modelName = process.env.AZURE_OPENAI_MODEL_NAME || "gpt-4o";

// 🔍 SearchAgent with Tavily
const SearchAgent = new Agent({
    name: "SearchAgent",
    model: new OpenAIChatCompletionsModel(client, modelName),
    instructions: `You are a search specialist. Use web search to find current information.`,
    tools: [
        tool({
            name: "web_search",
            description: "Search the web for current information",
            parameters: {
                type: "object",
                properties: {
                    query: { type: "string", description: "The search query" },
                },
                required: ["query"],
            },
            async execute({ query }) {
                try {
                    const response = await fetch('https://api.tavily.com/search', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${process.env.TAVILY_API_KEY}`
                        },
                        body: JSON.stringify({
                            query: query,
                            search_depth: "basic",
                            include_answer: true,
                            include_raw_content: false,
                            max_results: 3
                        })
                    });
                    
                    if (!response.ok) {
                        throw new Error(`Tavily API error: ${response.status}`);
                    }
                    
                    const data = await response.json();
                    return data.answer || "No answer found";
                } catch (error) {
                    console.error('Search error:', error);
                    return `Search failed: ${error.message}`;
                }
            },
        }),
    ],
});

// ➗ MathAgent
const MathAgent = new Agent({
    name: "MathAgent",
    model: new OpenAIChatCompletionsModel(client, modelName),
    instructions: `You are a calculator. Respond to math problems with accurate results.`,
});

// 🌤️ WeatherAgent
const WeatherAgent = new Agent({
    name: "WeatherAgent",
    model: new OpenAIChatCompletionsModel(client, modelName),
    instructions: `You are a weather specialist. Use the get_weather tool to retrieve real-time weather information for any city.`,
    tools: [
        tool({
            name: "get_weather",
            description: "Get current weather information for a specific city",
            parameters: {
                type: "object",
                properties: {
                    city: { type: "string", description: "The city name to get weather for" },
                    country: { type: "string", description: "Country code (optional)" }
                },
                required: ["city"],
            },
            async execute({ city, country }) {
                // Simulate weather API call - in production, you'd use a real weather API like OpenWeatherMap
                const weatherConditions = ['sunny', 'cloudy', 'rainy', 'partly cloudy', 'snowy', 'stormy'];
                const temperatures = [15, 18, 22, 25, 28, 32, 35];
                const humidity = [30, 45, 60, 75, 80, 85];
                
                const condition = weatherConditions[Math.floor(Math.random() * weatherConditions.length)];
                const temp = temperatures[Math.floor(Math.random() * temperatures.length)];
                const hum = humidity[Math.floor(Math.random() * humidity.length)];
                const windSpeed = Math.floor(Math.random() * 20) + 5;
                
                const weather = {
                    city: city,
                    country: country || "Unknown",
                    temperature: `${temp}°C`,
                    condition: condition,
                    humidity: `${hum}%`,
                    windSpeed: `${windSpeed} km/h`,
                    timestamp: new Date().toISOString()
                };
                
                return JSON.stringify({
                    current_weather: weather,
                    message: `Current weather in ${city}${country ? ', ' + country : ''}: ${temp}°C, ${condition}, humidity ${hum}%, wind ${windSpeed} km/h`
                });
            },
        }),
    ],
});

// 🔐 DataAgent - Handles sensitive data operations requiring human approval
const DataAgent = new Agent({
    name: "DataAgent",
    model: new OpenAIChatCompletionsModel(client, modelName),
    instructions: `You are a data access specialist. When asked to access user data, you must ALWAYS use the access_sensitive_data tool. When asked to delete user data, you must ALWAYS use the delete_user_data tool. Do not provide responses without using these tools.`,
    tools: [
        tool({
            name: "access_sensitive_data",
            description: "Access sensitive customer data (requires human approval)",
            parameters: z.object({
                userId: z.string().describe("The ID of the user whose data to access"),
                dataType: z.string().describe("Type of sensitive data to access (e.g., 'personal_info', 'financial_data', 'medical_records')")
            }),
            needsApproval: true,
            async execute({ userId, dataType }) {
                // Simulate accessing sensitive data
                const sensitiveData = {
                    userId: userId,
                    dataType: dataType,
                    accessTime: new Date().toISOString(),
                    data: `[SENSITIVE] ${dataType} for user ${userId} - This is confidential information that required approval to access.`
                };
                
                return JSON.stringify({
                    success: true,
                    message: `Successfully accessed ${dataType} for user ${userId}`,
                    data: sensitiveData,
                    warning: "This data is confidential and should be handled according to privacy policies."
                });
            },
        }),
        tool({
            name: "delete_user_data",
            description: "Delete user data (requires human approval)",
            parameters: z.object({
                userId: z.string().describe("The ID of the user whose data to delete"),
                confirmationCode: z.string().describe("Confirmation code for data deletion")
            }),
            needsApproval: true,
            async execute({ userId, confirmationCode }) {
                // Simulate data deletion
                return JSON.stringify({
                    success: true,
                    message: `User data for ${userId} has been permanently deleted`,
                    confirmationCode: confirmationCode,
                    deletionTime: new Date().toISOString(),
                    warning: "This action cannot be undone."
                });
            },
        }),
    ],
});

// 🧭 OrchestratorAgent
const orchestratorAgent = new Agent({
    name: "Orchestrator",
    model: new OpenAIChatCompletionsModel(client, modelName),
    instructions: `
You are a task orchestrator. Route the user's query to:
- Hand off to 'SearchAgent' for news or general information questions.
- Hand off to 'MathAgent' for calculations and mathematical problems.
- Hand off to 'WeatherAgent' for weather information, forecasts, or climate queries.
- Hand off to 'DataAgent' for ANY mention of: user data access, sensitive data, personal information, financial data, medical records, data deletion, accessing user information, or any requests involving specific user IDs.
Always use a handoff. Do not answer directly.`,
    handoffs: [SearchAgent, MathAgent, WeatherAgent, DataAgent],
});

// Store conversation history per session
const sessionHistories = new Map();

// Store pending approvals per session
const pendingApprovals = new Map();

// Store agent states that are waiting for approval
const pendingStates = new Map();

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(express.static("public"));
app.use(cors());
app.use(express.json());

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, sessionId = 'default', stream = false } = req.body;
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ 
        error: 'Message is required and must be a string',
        success: false 
      });
    }

    // Get or create session history
    if (!sessionHistories.has(sessionId)) {
      sessionHistories.set(sessionId, []);
    }
    const conversationHistory = sessionHistories.get(sessionId);

    console.log(`📨 [${sessionId}] User: ${message}`);

    // Handle streaming response
    if (stream) {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });

      const sendEvent = (event, data) => {
        res.write(`event: ${event}\n`);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      };

      try {
        const runner = new Runner();
        
        // Create input with conversation context
        const contextualInput = conversationHistory.length > 0 
          ? `Previous conversation:\n${conversationHistory.join('\n')}\n\nCurrent question: ${message}`
          : message;
        
        // Enable streaming
        const streamResponse = await runner.run(
          orchestratorAgent,
          contextualInput,
          { stream: true }
        );
        
        // Send initial event
        sendEvent('start', { 
          message: 'Starting agent execution...',
          sessionId,
          currentAgent: 'Orchestrator'
        });

        // Capture streamed text and agent information
        let streamedText = '';
        let currentAgent = 'Orchestrator';
        let agentSwitches = ['Orchestrator'];
        
        // Process streaming events
        for await (const event of streamResponse) {
          if (event.type === 'run_item_stream_event') {
            const item = event.item;
            
            if (item.type === 'handoff_call_item') {
              const handoffTarget = item.rawItem?.name?.replace('transfer_to_', '') || 'Unknown';
              sendEvent('handoff', {
                from: currentAgent,
                to: handoffTarget,
                message: `Initiating handoff to: ${handoffTarget}`
              });
            }
            
            if (item.type === 'handoff_output_item') {
              if (item.targetAgent && item.targetAgent.name) {
                currentAgent = item.targetAgent.name;
                agentSwitches.push(currentAgent);
                sendEvent('agent_switch', {
                  agent: currentAgent,
                  message: `Agent taking over: ${currentAgent}`
                });
              }
            }
            
            if (item.type === 'tool_call_item') {
              sendEvent('tool_use', {
                agent: currentAgent,
                tool: item.rawItem?.name || 'Unknown',
                message: `Using tool: ${item.rawItem?.name || 'Unknown'}`
              });
            }
          }
          
          // Stream text chunks
          if (event.type === 'raw_model_stream_event' && event.data?.type === 'output_text_delta') {
            const textDelta = event.data.delta;
            if (textDelta) {
              streamedText += textDelta;
              sendEvent('text_delta', { delta: textDelta });
            }
          }
        }
        
        // Wait for completion
        const result = await streamResponse.completed;
        const finalAgent = result?.finalAgent ? result.finalAgent.name : currentAgent;
        
        // Update conversation history
        conversationHistory.push(`Human: ${message}`);
        if (streamedText.trim()) {
          conversationHistory.push(`Assistant [${finalAgent}]: ${streamedText.trim()}`);
        }
        
        // Send completion event
        sendEvent('complete', {
          finalAgent,
          agentSwitches,
          conversationLength: conversationHistory.length,
          response: streamedText.trim() || "No output received"
        });
        
        console.log(`✅ [${sessionId}] Response by: [${finalAgent}]`);
        
      } catch (error) {
        console.error(`❌ [${sessionId}] Streaming error:`, error);
        sendEvent('error', { 
          error: error.message,
          message: 'An error occurred during streaming'
        });
      }
      
      res.end();
      return;
    }

    // Handle non-streaming response
    try {
      // Create input with conversation context
      const contextualInput = conversationHistory.length > 0 
        ? `Previous conversation:\n${conversationHistory.join('\n')}\n\nCurrent question: ${message}`
        : message;
      
      // Use the new run function instead of runner for better interruption handling
      let result = await run(orchestratorAgent, contextualInput);
      
      // Check for interruptions (human-in-the-loop scenarios)
      if (result.interruptions && result.interruptions.length > 0) {
        // Store the pending state for this session
        pendingStates.set(sessionId, result.state);
        
        // Process interruptions
        const approvals = [];
        for (const interruption of result.interruptions) {
          if (interruption.type === 'tool_approval_item') {
            const approvalId = `${sessionId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            approvals.push({
              id: approvalId,
              agent: interruption.agent.name,
              toolName: interruption.rawItem.name,
              arguments: interruption.rawItem.arguments,
              interruption: interruption,
              timestamp: new Date().toISOString()
            });
          }
        }
        
        // Store pending approvals
        pendingApprovals.set(sessionId, approvals);
        
        console.log(`⏸️ [${sessionId}] Execution paused - waiting for ${approvals.length} approval(s)`);
        
        // Return response indicating approval needed
        return res.json({
          success: true,
          needsApproval: true,
          pendingApprovals: approvals.map(a => ({
            id: a.id,
            agent: a.agent,
            toolName: a.toolName,
            arguments: a.arguments,
            timestamp: a.timestamp
          })),
          message: `The agent wants to perform sensitive operations that require your approval.`,
          sessionId: sessionId,
          conversationLength: conversationHistory.length
        });
      }
      
      // Extract response from result - the structure is different for non-streaming
      let response = "No response generated";
      
      // Try to extract text from the complex result structure
      if (result.state && result.state._currentStep && result.state._currentStep.output) {
        response = result.state._currentStep.output;
      } else if (result.state && result.state._generatedItems && result.state._generatedItems.length > 0) {
        const lastItem = result.state._generatedItems[result.state._generatedItems.length - 1];
        if (lastItem.type === 'message_output_item' && lastItem.rawItem && lastItem.rawItem.content) {
          const textContent = lastItem.rawItem.content.find(content => 
            content.type === 'output_text' && content.text
          );
          if (textContent) {
            response = textContent.text;
          }
        }
      } else if (result.state && result.state._lastTurnResponse && result.state._lastTurnResponse.output) {
        const lastOutput = result.state._lastTurnResponse.output;
        if (Array.isArray(lastOutput) && lastOutput.length > 0) {
          const lastMessage = lastOutput[lastOutput.length - 1];
          if (lastMessage.content && Array.isArray(lastMessage.content)) {
            const textContent = lastMessage.content.find(content => 
              content.type === 'output_text' && content.text
            );
            if (textContent) {
              response = textContent.text;
            }
          }
        }
      } else {
        response = "Unable to extract response from agent";
      }
      const finalAgent = result.state && result.state._currentAgent ? result.state._currentAgent.name : 'Orchestrator';
      
      // Update conversation history
      conversationHistory.push(`Human: ${message}`);
      conversationHistory.push(`Assistant [${finalAgent}]: ${response}`);
      
      console.log(`✅ [${sessionId}] Response by: [${finalAgent}]`);
      
      res.json({
        success: true,
        response: response,
        agent: finalAgent,
        sessionId: sessionId,
        conversationLength: conversationHistory.length
      });
      
    } catch (error) {
      console.error(`❌ [${sessionId}] Agent error:`, error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: 'An error occurred while processing your request'
      });
    }
    
  } catch (error) {
    console.error('❌ Chat endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'An internal server error occurred'
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Get conversation history for a session
app.get('/api/history/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const history = sessionHistories.get(sessionId) || [];
  
  res.json({
    success: true,
    sessionId: sessionId,
    conversationLength: history.length,
    history: history
  });
});

// Clear conversation history for a session
app.delete('/api/history/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  sessionHistories.delete(sessionId);
  
  res.json({
    success: true,
    message: `Conversation history cleared for session: ${sessionId}`
  });
});

// Get all active sessions
app.get('/api/sessions', (req, res) => {
  const sessions = Array.from(sessionHistories.keys()).map(sessionId => ({
    sessionId,
    conversationLength: sessionHistories.get(sessionId).length,
    hasPendingApprovals: pendingApprovals.has(sessionId)
  }));
  
  res.json({
    success: true,
    activeSessions: sessions.length,
    sessions: sessions
  });
});

// Handle approval/rejection of tool calls
app.post('/api/approve', async (req, res) => {
  try {
    const { sessionId, approvalId, approved } = req.body;
    
    if (!sessionId || !approvalId || typeof approved !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: sessionId, approvalId, and approved'
      });
    }
    
    // Get pending approvals for this session
    const approvals = pendingApprovals.get(sessionId);
    if (!approvals) {
      return res.status(404).json({
        success: false,
        error: 'No pending approvals found for this session'
      });
    }
    
    // Find the specific approval
    const approval = approvals.find(a => a.id === approvalId);
    if (!approval) {
      return res.status(404).json({
        success: false,
        error: 'Approval not found'
      });
    }
    
    // Get the stored state
    const state = pendingStates.get(sessionId);
    if (!state) {
      return res.status(404).json({
        success: false,
        error: 'No pending state found for this session'
      });
    }
    
    console.log(`${approved ? '✅' : '❌'} [${sessionId}] Tool ${approval.toolName} ${approved ? 'approved' : 'rejected'} by user`);
    
    // Apply approval or rejection
    if (approved) {
      state.approve(approval.interruption);
    } else {
      state.reject(approval.interruption);
    }
    
    // Remove this approval from pending list
    const updatedApprovals = approvals.filter(a => a.id !== approvalId);
    
    // Check if there are more approvals needed
    if (updatedApprovals.length > 0) {
      pendingApprovals.set(sessionId, updatedApprovals);
      return res.json({
        success: true,
        message: `Tool ${approval.toolName} ${approved ? 'approved' : 'rejected'}`,
        remainingApprovals: updatedApprovals.map(a => ({
          id: a.id,
          agent: a.agent,
          toolName: a.toolName,
          arguments: a.arguments,
          timestamp: a.timestamp
        }))
      });
    }
    
    // All approvals processed, resume execution
    pendingApprovals.delete(sessionId);
    
    try {
      console.log(`🔄 [${sessionId}] Resuming execution after approval decisions`);
      
      // Resume execution with the updated state
      const result = await run(orchestratorAgent, state);
      
      // Clean up stored state
      pendingStates.delete(sessionId);
      
      // Extract response
      let response = "Execution completed";
      if (result.state && result.state._currentStep && result.state._currentStep.output) {
        response = result.state._currentStep.output;
      } else if (result.state && result.state._generatedItems && result.state._generatedItems.length > 0) {
        const lastItem = result.state._generatedItems[result.state._generatedItems.length - 1];
        if (lastItem.type === 'message_output_item' && lastItem.rawItem && lastItem.rawItem.content) {
          const textContent = lastItem.rawItem.content.find(content => 
            content.type === 'output_text' && content.text
          );
          if (textContent) {
            response = textContent.text;
          }
        }
      }
      
      const finalAgent = result.state && result.state._currentAgent ? result.state._currentAgent.name : 'Orchestrator';
      
      // Update conversation history
      const conversationHistory = sessionHistories.get(sessionId) || [];
      conversationHistory.push(`Assistant [${finalAgent}]: ${response}`);
      
      console.log(`✅ [${sessionId}] Execution resumed and completed by: [${finalAgent}]`);
      
      res.json({
        success: true,
        message: 'All approvals processed, execution completed',
        response: response,
        agent: finalAgent,
        sessionId: sessionId,
        conversationLength: conversationHistory.length
      });
      
    } catch (resumeError) {
      console.error(`❌ [${sessionId}] Error resuming execution:`, resumeError);
      pendingStates.delete(sessionId);
      
      res.status(500).json({
        success: false,
        error: 'Error resuming execution after approval',
        details: resumeError.message
      });
    }
    
  } catch (error) {
    console.error('❌ Approval endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'An error occurred while processing the approval'
    });
  }
});

// Get pending approvals for a session
app.get('/api/approvals/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const approvals = pendingApprovals.get(sessionId) || [];
  
  res.json({
    success: true,
    sessionId: sessionId,
    pendingApprovals: approvals.map(a => ({
      id: a.id,
      agent: a.agent,
      toolName: a.toolName,
      arguments: a.arguments,
      timestamp: a.timestamp
    })),
    count: approvals.length
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Multi-Agent Chat Server running on port ${PORT}`);
  console.log(`🏠 Frontend: http://localhost:${PORT}`);
  console.log(`\n📡 API Endpoints:`);
  console.log(`  🔍 Health Check: GET  http://localhost:${PORT}/api/health`);
  console.log(`  💬 Chat (Regular): POST http://localhost:${PORT}/api/chat`);
  console.log(`  📺 Chat (Stream):  POST http://localhost:${PORT}/api/chat (with stream: true)`);
  console.log(`  📚 Get History:    GET  http://localhost:${PORT}/api/history/:sessionId`);
  console.log(`  🗑️  Clear History:  DELETE http://localhost:${PORT}/api/history/:sessionId`);
  console.log(`  📊 List Sessions:  GET  http://localhost:${PORT}/api/sessions`);
  console.log(`  ✅ Handle Approval: POST http://localhost:${PORT}/api/approve`);
  console.log(`  📋 Get Approvals:  GET  http://localhost:${PORT}/api/approvals/:sessionId`);
  console.log(`\n🤖 Available Agents:`);
  console.log(`  🔍 SearchAgent - Web search and general information`);
  console.log(`  ➗ MathAgent - Mathematical calculations`);
  console.log(`  🌤️  WeatherAgent - Weather information`);
  console.log(`  🔐 DataAgent - Sensitive data operations (requires approval)`);
  console.log(`  🧭 Orchestrator - Routes queries to appropriate agents`);
  console.log(`\n🔒 Human-in-the-Loop Features:`);
  console.log(`  - Sensitive data access requires user approval`);
  console.log(`  - User data deletion requires confirmation`);
  console.log(`  - Approval/rejection handled via /api/approve endpoint`);
  console.log(`\n💡 Example Usage:`);
  console.log(`  curl -X POST http://localhost:${PORT}/api/chat \\`);
  console.log(`    -H "Content-Type: application/json" \\`);
  console.log(`    -d '{"message": "What is the weather in Paris?", "sessionId": "test"}'`);
  console.log(`\n🔐 Human-in-Loop Example:`);
  console.log(`  curl -X POST http://localhost:${PORT}/api/chat \\`);
  console.log(`    -H "Content-Type: application/json" \\`);
  console.log(`    -d '{"message": "Access user data for user-123", "sessionId": "test"}'`);
}); 