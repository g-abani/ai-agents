import { z } from 'zod';
import readline from 'node:readline/promises';
import { Agent, run, tool, RunState, setTracingDisabled, setDefaultOpenAIClient, OpenAIChatCompletionsModel } from '@openai/agents';
import { AzureOpenAI } from "openai";
import dotenv from 'dotenv';

dotenv.config();
setTracingDisabled(true);

const {
    AZURE_OPENAI_API_KEY,
    AZURE_OPENAI_ENDPOINT,
    AZURE_OPENAI_DEPLOYMENT_NAME,
    AZURE_OPENAI_API_VERSION
} = process.env;

if (!AZURE_OPENAI_API_KEY || !AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_DEPLOYMENT_NAME) {
    console.error("Please set AZURE_OPENAI_API_KEY, AZURE_OPENAI_ENDPOINT, and AZURE_OPENAI_DEPLOYMENT_NAME environment variables.");
    process.exit(1);
}

const client = new AzureOpenAI({
    endpoint: AZURE_OPENAI_ENDPOINT,
    apiKey: AZURE_OPENAI_API_KEY,
    apiVersion: AZURE_OPENAI_API_VERSION,
    deployment: AZURE_OPENAI_DEPLOYMENT_NAME,
});

setDefaultOpenAIClient(client);
const modelName = "gpt-4o-mini";

const sensitiveDataTool = tool({
    name: 'accessSensitiveData',
    description: 'Accesses sensitive customer data.',
    parameters: z.object({
        userId: z.string().describe("The ID of the user whose data to access."),
    }),
    needsApproval: true, // This is the key part for human-in-the-loop
    execute: async ({ userId }) => {
        // In a real application, this would fetch data from a secure database.
        return `Successfully accessed data for user ${userId}. The user's secret is "password123".`;
    },
});

const agent = Agent.create({
    name: 'Data Access Agent',
    description: 'An agent that can access sensitive user data but requires approval.',
    tools: [sensitiveDataTool],
    model: new OpenAIChatCompletionsModel(client, modelName),
});

async function confirm(rl, question) {
    const answer = await rl.question(`${question} (y/n): `);
    return answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';
}

async function main() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    let result = await run(
        agent,
        'Please access the sensitive data for user "user-1234".',
    );

    let hasInterruptions = result.interruptions?.length > 0;

    while (hasInterruptions) {
        // In a real app, you might serialize and store the state here.
        const state = result.state; // For this simple example, we just use the in-memory state.

        for (const interruption of result.interruptions) {
            if (interruption.type === 'tool_approval_item') {
                const confirmed = await confirm(
                    rl,
                    `Agent "${interruption.agent.name}" wants to use the tool "${interruption.rawItem.name}" with arguments: ${JSON.stringify(interruption.rawItem.arguments)}. Do you approve?`
                );

                if (confirmed) {
                    console.log(`Approving tool call: ${interruption.rawItem.name}`);
                    state.approve(interruption);
                } else {
                    console.log(`Rejecting tool call: ${interruption.rawItem.name}`);
                    state.reject(interruption);
                }
            }
        }

        // Resume execution with the updated state
        console.log("\nResuming agent run...");
        result = await run(agent, state);
        hasInterruptions = result.interruptions?.length > 0;
    }

    console.log("\n--- Final Result ---");
    console.log(result.finalOutput);
    rl.close();
}

main().catch((error) => {
    console.dir(error, { depth: null });
}); 