# LangGraph Multi-Agent System with Real-Time Flow Visualization

## Quick Start

### 🔄 Interactive Chat with Flow Visualization (Recommended)
```bash
npx tsx chat-server.js
```
Open `http://localhost:3001` in your browser for:
- **Real-time chat interface** with agent-specific responses
- **Live execution flow visualization** showing agent interactions
- **Animated graph** displaying request routing and processing steps

![Flow Visualization](FLOW-VISUALIZATION-README.md)

### 📝 Command Line Examples
```bash
npx tsx agent.mts
npx tsx advanced.mts
npx tsx supervisor.mts
```

## 🚀 Features

### Real-Time Flow Visualization
- **Split Interface**: Chat on left, live execution graph on right
- **Agent Routing**: See how requests flow between agents in real-time
- **Tool Execution**: Watch tool calls and responses
- **Status Tracking**: Monitor processing state with visual indicators

### Multi-Agent Coordination
- **Supervisor Pattern**: Central coordinator managing specialized agents
- **Flight Assistant**: Handles flight booking requests
- **Hotel Assistant**: Manages hotel reservations  
- **Search Assistant**: Provides information lookup
- **Smart Routing**: Automatic request routing to appropriate agents

### Example Response Flow

```
Supervisor: Delegating tasks to Flight Assistant and Hotel Assistant.
--------------------------------------------------
Flight Assistant: Task completed.
Successfully booked a flight from BOS to JFK.
--------------------------------------------------
Hotel Assistant: Task completed.
Successfully booked a stay at McKittrick Hotel.
--------------------------------------------------
Supervisor: Here is the final response:
The flight from BOS to JFK has been successfully booked, and your stay at McKittrick Hotel is also confirmed. If you need any more assistance, feel free to ask!
--------------------------------------------------
```

## 📖 Documentation

- **[Flow Visualization Guide](FLOW-VISUALIZATION-README.md)** - Comprehensive guide to the real-time visualization system
- **Agent Architecture** - Multi-agent system design and coordination
- **API Reference** - Server endpoints and SSE events
