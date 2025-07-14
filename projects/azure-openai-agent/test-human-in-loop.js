import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3001';

// Utility function to make API calls
async function makeRequest(endpoint, data = null) {
  const config = {
    method: data ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json' },
  };
  
  if (data) {
    config.body = JSON.stringify(data);
  }
  
  const response = await fetch(`${BASE_URL}${endpoint}`, config);
  return await response.json();
}

// Demo function
async function demonstrateHumanInLoop() {
  console.log('🔐 Human-in-the-Loop Demo for Multi-Agent Chat System');
  console.log('=' .repeat(60));
  
  const sessionId = `demo-${Date.now()}`;
  console.log(`\n📱 Session ID: ${sessionId}`);
  
  // Test 1: Regular chat (no approval needed)
  console.log('\n1️⃣ Testing regular chat (no approval required)');
  console.log('   Request: "What is 25 + 37?"');
  const regularResponse = await makeRequest('/api/chat', {
    message: 'What is 25 + 37?',
    sessionId: sessionId
  });
  console.log('   ✅ Response:', regularResponse.response);
  console.log('   🤖 Agent:', regularResponse.agent);
  
  // Test 2: Sensitive data access (approval required)
  console.log('\n2️⃣ Testing sensitive data access (approval required)');
  console.log('   Request: "Access personal_info for user-123"');
  const sensitiveResponse = await makeRequest('/api/chat', {
    message: 'Access personal_info for user-123',
    sessionId: sessionId
  });
  
  if (sensitiveResponse.needsApproval) {
    console.log('   ⏸️ Approval required!');
    console.log('   📋 Pending approvals:');
    
    for (const approval of sensitiveResponse.pendingApprovals) {
      console.log(`     - ID: ${approval.id}`);
      console.log(`     - Agent: ${approval.agent}`);
      console.log(`     - Tool: ${approval.toolName}`);
      console.log(`     - Arguments: ${JSON.stringify(approval.arguments)}`);
      console.log(`     - Timestamp: ${approval.timestamp}`);
    }
    
    // Approve the request
    console.log('\n   ✅ Approving the request...');
    const approvalResponse = await makeRequest('/api/approve', {
      sessionId: sessionId,
      approvalId: sensitiveResponse.pendingApprovals[0].id,
      approved: true
    });
    
    if (approvalResponse.success) {
      console.log('   ✅ Approval processed successfully!');
      console.log('   📄 Final response:', approvalResponse.response);
      console.log('   🤖 Agent:', approvalResponse.agent);
    }
  }
  
  // Test 3: Data deletion (approval required, then reject)
  console.log('\n3️⃣ Testing data deletion with rejection');
  console.log('   Request: "Delete user data for user-456"');
  const deleteResponse = await makeRequest('/api/chat', {
    message: 'Delete user data for user-456',
    sessionId: sessionId
  });
  
  if (deleteResponse.needsApproval) {
    console.log('   ⏸️ Approval required for deletion!');
    console.log('   📋 Pending deletion approval:');
    
    const approval = deleteResponse.pendingApprovals[0];
    console.log(`     - ID: ${approval.id}`);
    console.log(`     - Agent: ${approval.agent}`);
    console.log(`     - Tool: ${approval.toolName}`);
    console.log(`     - Arguments: ${JSON.stringify(approval.arguments)}`);
    
    // Reject the request
    console.log('\n   ❌ Rejecting the deletion request...');
    const rejectionResponse = await makeRequest('/api/approve', {
      sessionId: sessionId,
      approvalId: approval.id,
      approved: false
    });
    
    if (rejectionResponse.success) {
      console.log('   ❌ Request rejected successfully!');
      console.log('   📄 Final response:', rejectionResponse.response);
      console.log('   🤖 Agent:', rejectionResponse.agent);
    }
  }
  
  // Test 4: Check conversation history
  console.log('\n4️⃣ Checking conversation history');
  const history = await makeRequest(`/api/history/${sessionId}`);
  console.log(`   📚 Total messages: ${history.conversationLength}`);
  console.log('   📜 Conversation history:');
  history.history.forEach((msg, i) => {
    console.log(`     ${i + 1}. ${msg}`);
  });
  
  // Test 5: Session information
  console.log('\n5️⃣ Checking all sessions');
  const sessions = await makeRequest('/api/sessions');
  console.log(`   📊 Active sessions: ${sessions.activeSessions}`);
  sessions.sessions.forEach(session => {
    console.log(`     - ${session.sessionId}: ${session.conversationLength} messages (Pending: ${session.hasPendingApprovals})`);
  });
  
  console.log('\n✅ Human-in-the-Loop Demo completed successfully!');
  console.log('=' .repeat(60));
}

// Run the demo
demonstrateHumanInLoop().catch(console.error); 