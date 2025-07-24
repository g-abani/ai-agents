# 🔄 LangGraph Supervisor Real-Time Flow Visualization

## Overview

This enhanced chat interface provides **real-time visualization** of the LangGraph Supervisor execution flow, showing how requests are processed, routed between agents, and executed step-by-step.

## 🚀 Features

### Split Interface Design
- **Left Panel**: Traditional chat interface with agent-specific styling
- **Right Panel**: Live execution flow graph with animated transitions

### Real-Time Visualization
- **Live Updates**: Server-Sent Events (SSE) stream execution events in real-time
- **Animated Flow**: Visual representation of data flow between components
- **Step-by-Step Tracking**: Each step in the agent workflow is visualized
- **Color-Coded Agents**: Different colors for each agent type

### Interactive Elements
- **Flow Status**: Shows current execution state (Idle, Processing, Complete, Error)
- **Clear Button**: Reset the visualization
- **Zoom & Pan**: Interactive graph controls
- **Color Legend**: Visual guide to agent types

## 🏗️ Architecture

### Backend Components

#### Server-Sent Events (SSE) Endpoint
```javascript
GET /api/flow/:threadId
```
- Establishes persistent connection for real-time events
- Sends execution events as they happen
- Automatic cleanup on disconnection

#### Enhanced Chat Endpoint
```javascript
POST /api/chat
```
- Processes chat requests
- Captures execution events during LangGraph processing
- Streams events via SSE in real-time

#### Event Types Captured
1. **`request_start`** - Initial request received
2. **`tool_call`** - Tool being called
3. **`tool_execution`** - Tool executing
4. **`tool_result`** - Tool result returned  
5. **`agent_response`** - Agent responding
6. **`agent_message`** - Agent message sent
7. **`request_complete`** - Request processing complete
8. **`error`** - Error occurred

### Frontend Components

#### Graph Visualization (vis.js)
- **Nodes**: Represent agents, tools, and user
- **Edges**: Show data flow with animated transitions
- **Layout**: Fixed positions for consistent visualization
- **Animation**: 3-second animated edges with labels

#### Real-Time Event Handling
- **EventSource**: Connects to SSE endpoint
- **Event Processing**: Handles different event types
- **Visual Updates**: Animates graph based on events

## 🎨 Visual Elements

### Node Types & Colors
- 🔵 **User** (`#2196f3`) - Request originator
- 🟣 **Supervisor** (`#9c27b0`) - Main coordinator
- 🟢 **Flight Assistant** (`#4caf50`) - Flight booking agent
- 🟠 **Hotel Assistant** (`#ff9800`) - Hotel booking agent  
- 🔵 **Search Assistant** (`#00bcd4`) - Information search agent
- 🟤 **Tools** (`#795548`) - External tools and APIs

### Animation Features
- **Highlighted Nodes**: Nodes glow red during active processing
- **Animated Edges**: Flow direction with descriptive labels
- **Status Indicators**: Color-coded status (idle/processing/complete/error)
- **Pulse Animation**: Processing status pulses

## 🔧 Usage Instructions

### Starting the Server
```bash
cd langchain-agent
npx tsx chat-server.js
```

### Accessing the Interface
Open `http://localhost:3001` in your browser

### Using the Visualization
1. **Send a Message**: Type in the chat input and press Send
2. **Watch the Flow**: Observe real-time execution in the right panel
3. **Follow the Steps**: See how your request flows through the system
4. **Check Status**: Monitor the flow status indicator
5. **Clear When Needed**: Use the Clear button to reset the visualization

### Example Flow Patterns

#### Flight Booking Request
```
User → Supervisor → Flight Assistant → Tools → Flight Assistant → Supervisor → User
```

#### Hotel Booking Request  
```
User → Supervisor → Hotel Assistant → Tools → Hotel Assistant → Supervisor → User
```

#### Complex Multi-Agent Request
```
User → Supervisor → Flight Assistant → Tools → 
     ↓
Hotel Assistant → Tools → Search Assistant → Tools → Supervisor → User
```

## 🛠️ Technical Implementation

### SSE Event Streaming
```javascript
// Server-side event sending
function sendFlowEvent(threadId, event) {
  const connection = sseConnections.get(threadId);
  if (connection) {
    connection.write(`data: ${JSON.stringify({
      ...event,
      timestamp: new Date().toISOString()
    })}\n\n`);
  }
}
```

### Real-Time Graph Updates
```javascript
// Client-side event handling
function handleFlowEvent(event) {
  switch (event.type) {
    case 'tool_call':
      animateFlow('supervisor', getNodeId(event.agent), `Tool: ${event.tool}`);
      break;
    // ... other event types
  }
}
```

### Agent Detection Logic
- **Transfer Calls**: Tracks `transfer_to_*` tool calls
- **Agent Responses**: Monitors agent-specific responses
- **Tool Usage**: Maps tools to respective agents
- **Primary Agent**: Determines main handling agent

## 🎯 Benefits

### Development & Debugging
- **Visual Debugging**: See exactly how requests flow through the system
- **Performance Monitoring**: Identify bottlenecks in the execution chain
- **Agent Verification**: Confirm correct agent routing

### User Understanding
- **Transparency**: Users see which agents handle their requests
- **Process Clarity**: Clear visualization of multi-step operations
- **Real-Time Feedback**: Immediate visual feedback during processing

### System Insights
- **Flow Analysis**: Understand complex agent interactions
- **Tool Usage**: Monitor which tools are being utilized
- **Error Tracking**: Visual indication of where errors occur

## 🔍 Troubleshooting

### Common Issues

#### SSE Connection Problems
- **Check Server**: Ensure server is running on port 3001
- **Browser Support**: Modern browsers support SSE
- **Firewall**: Check if port 3001 is accessible

#### Visualization Not Updating
- **JavaScript Console**: Check for errors in browser console
- **Network Tab**: Verify SSE connection in browser dev tools
- **Server Logs**: Check server logs for event sending

#### Graph Layout Issues
- **Browser Zoom**: Reset browser zoom to 100%
- **Screen Size**: Ensure adequate screen space
- **JavaScript Enabled**: Verify JavaScript is enabled

## 🚀 Future Enhancements

### Potential Improvements
- **Message History**: Show historical flows in timeline
- **Performance Metrics**: Add timing information to flows
- **Custom Layouts**: User-configurable graph layouts
- **Export Functionality**: Save flow diagrams as images
- **Advanced Filtering**: Filter events by type or agent

### Integration Possibilities
- **Logging Systems**: Integration with logging frameworks
- **Monitoring Tools**: Connect to monitoring dashboards
- **Analytics**: Flow pattern analysis and insights

## 📊 Example Scenarios

### Simple Flight Booking
1. User sends: "Book a flight from BOS to JFK"
2. Supervisor receives request
3. Transfers to Flight Assistant
4. Flight Assistant processes and responds
5. Supervisor sends final response to user

### Complex Multi-Service Request
1. User sends: "Book flight LAX to NYC and hotel in Manhattan"
2. Supervisor coordinates multiple agents
3. Flight Assistant handles flight booking
4. Hotel Assistant handles hotel booking
5. Search Assistant may provide additional information
6. Supervisor consolidates and responds

---

## 🏁 Getting Started

1. **Start the Server**: `npx tsx chat-server.js`
2. **Open Browser**: Navigate to `http://localhost:3001`
3. **Send a Request**: Try "book a flight from Boston to New York"
4. **Watch the Magic**: Observe the real-time flow visualization!

The system provides unprecedented visibility into LangGraph Supervisor operations, making it easier to understand, debug, and optimize your multi-agent workflows. 