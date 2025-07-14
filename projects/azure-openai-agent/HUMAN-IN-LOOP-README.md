# Human-in-the-Loop Multi-Agent Chat System

This system demonstrates a comprehensive human-in-the-loop implementation for multi-agent AI systems using Azure OpenAI and the OpenAI Agents framework.

## 🔐 Overview

The system includes a **DataAgent** that handles sensitive data operations requiring explicit human approval before execution. This ensures sensitive operations like data access and deletion are reviewed by humans before being carried out.

## 🏗️ Architecture

### Components

1. **DataAgent** - Handles sensitive data operations
2. **Orchestrator** - Routes requests to appropriate agents
3. **Chat Server** - Manages approval workflow and agent coordination
4. **Web Interface** - Provides UI for approvals and rejections

### Key Features

- ✅ **Tool Approval Workflow** - Sensitive tools require human approval
- ⏸️ **Execution Pausing** - Agent execution pauses until approval decisions
- 🔄 **State Management** - Maintains conversation state during approval process
- 📋 **Approval Tracking** - Tracks pending approvals per session
- 🎯 **Selective Approval** - Different tools can require different approval levels

## 🔧 Technical Implementation

### Tools Requiring Approval

1. **`access_sensitive_data`** - Accesses sensitive customer data
   - Parameters: `userId`, `dataType`
   - Use cases: Personal info, financial data, medical records

2. **`delete_user_data`** - Permanently deletes user data
   - Parameters: `userId`, `confirmationCode`
   - Use cases: GDPR compliance, account deletion

### API Endpoints

#### Chat Endpoint
```bash
POST /api/chat
{
  "message": "Access personal_info for user-123",
  "sessionId": "session-123"
}
```

**Response (when approval needed):**
```json
{
  "success": true,
  "needsApproval": true,
  "pendingApprovals": [
    {
      "id": "approval-id",
      "agent": "DataAgent",
      "toolName": "access_sensitive_data",
      "arguments": "{\"userId\":\"user-123\",\"dataType\":\"personal_info\"}",
      "timestamp": "2025-07-08T08:57:34.100Z"
    }
  ],
  "message": "The agent wants to perform sensitive operations that require your approval."
}
```

#### Approval Endpoint
```bash
POST /api/approve
{
  "sessionId": "session-123",
  "approvalId": "approval-id",
  "approved": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "All approvals processed, execution completed",
  "response": "I have successfully accessed the requested sensitive data...",
  "agent": "DataAgent"
}
```

#### Get Pending Approvals
```bash
GET /api/approvals/:sessionId
```

## 🚀 Usage Examples

### 1. Regular Chat (No Approval)
```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is 25 + 37?", "sessionId": "test"}'
```

### 2. Sensitive Data Access (Approval Required)
```bash
# Step 1: Request sensitive data access
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Access personal_info for user-123", "sessionId": "test"}'

# Step 2: Approve the request
curl -X POST http://localhost:3001/api/approve \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "test", "approvalId": "approval-id", "approved": true}'
```

### 3. Data Deletion (Approval Required)
```bash
# Step 1: Request data deletion
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Delete user data for user-456", "sessionId": "test"}'

# Step 2: Reject the request
curl -X POST http://localhost:3001/api/approve \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "test", "approvalId": "approval-id", "approved": false}'
```

## 🎯 Use Cases

### Data Privacy Compliance
- **GDPR Article 17** - Right to erasure requires human oversight
- **CCPA Section 1798.105** - Consumer data deletion requests
- **HIPAA** - Medical record access requires authorization

### Security Operations
- **Privileged Access Management** - Sensitive system access
- **Incident Response** - Data breach investigations
- **Audit Trail** - Compliance and forensic analysis

### Business Process Management
- **Financial Transactions** - High-value payment approvals
- **HR Operations** - Employee data access and modifications
- **Customer Service** - Sensitive customer information handling

## 🔍 Web Interface Features

### Approval UI Components
- **Approval Container** - Shows pending approval requests
- **Approval Items** - Displays tool details and arguments
- **Action Buttons** - Approve/Reject with visual feedback
- **Real-time Updates** - Live approval status updates

### Visual Indicators
- **🔐 DataAgent** - Gold/orange theme for security context
- **⏸️ Approval Required** - Clear pending approval notifications
- **✅ Approved** - Green confirmation indicators
- **❌ Rejected** - Red rejection indicators

## 📋 Demo Script

Run the comprehensive demo:
```bash
node test-human-in-loop.js
```

This demonstrates:
1. Regular chat without approval
2. Sensitive data access with approval
3. Data deletion with rejection
4. Conversation history tracking
5. Session management

## 🛠️ Configuration

### Environment Variables
```bash
AZURE_OPENAI_API_KEY=your_api_key
AZURE_OPENAI_ENDPOINT=your_endpoint
AZURE_OPENAI_MODEL_NAME=gpt-4o
```

### Agent Configuration
```javascript
const DataAgent = new Agent({
  name: "DataAgent",
  tools: [
    tool({
      name: "access_sensitive_data",
      needsApproval: true,  // This enables human approval
      // ... tool configuration
    })
  ]
});
```

## 📊 Monitoring & Analytics

### Session Tracking
- Active sessions with approval status
- Conversation length per session
- Pending approvals count

### Approval Metrics
- Approval/rejection ratios
- Response times for approval decisions
- Tool usage patterns

## 🔒 Security Considerations

1. **Session Isolation** - Each session has isolated approval state
2. **Approval Timeouts** - Implement timeout for pending approvals
3. **Audit Logging** - Log all approval decisions with timestamps
4. **Access Control** - Ensure only authorized users can approve
5. **Data Encryption** - Encrypt sensitive data in transit and at rest

## 🚦 Best Practices

1. **Clear Tool Descriptions** - Make approval requests understandable
2. **Minimal Permissions** - Only request approval for truly sensitive operations
3. **Graceful Failures** - Handle rejection scenarios appropriately
4. **User Experience** - Provide clear feedback on approval status
5. **Performance** - Don't block non-sensitive operations

## 📝 Future Enhancements

- [ ] **Role-based Approvals** - Different approval levels for different users
- [ ] **Bulk Approvals** - Approve multiple operations at once
- [ ] **Approval Workflows** - Multi-step approval processes
- [ ] **Integration APIs** - Connect with external approval systems
- [ ] **Mobile Support** - Mobile-optimized approval interface

## 🎉 Conclusion

This human-in-the-loop implementation provides a robust foundation for building AI systems that require human oversight for sensitive operations. The system balances automation efficiency with human control, ensuring compliance and security in AI-driven workflows. 