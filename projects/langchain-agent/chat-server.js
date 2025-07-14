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
    console.log(agentFinalState.messages);
    const response = agentFinalState.messages[agentFinalState.messages.length - 1].content;
    
    res.json({ 
      response,
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