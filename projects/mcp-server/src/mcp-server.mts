/* ──────────────────────────────────────────────────────────────────────────────
   http-server.mts
   Streamable HTTP MCP server (TypeScript) demonstrating **Tools, Resources,
   and Prompts** can be consumed by a LangGraph `createReactAgent`.
   Requires:  @modelcontextprotocol/sdk 1.16+, express 4.x, zod 3.x, cors 2.x
   ─────────────────────────────────────────────────────────────────────────── */

   import express, { Request, Response } from "express";
   import cors from "cors";
   import { randomUUID } from "crypto";
   import { z } from "zod";
   
   import {
     McpServer,
     ResourceTemplate,
   } from "@modelcontextprotocol/sdk/server/mcp.js";
   import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
   import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
   
   /* ───── Express & CORS set-up ───── */
   const app = express();
   app.use(express.json());
   app.use(
     cors({
       origin: "*",
       exposedHeaders: ["Mcp-Session-Id"], // allow browsers to read the session id
     })
   );
   
   /* ───── In-memory transport registry ───── */
   type TransportMap = Record<string, StreamableHTTPServerTransport>;
   const transports: TransportMap = Object.create(null);
   
   /* ───── Mock data for demo resources ───── */
   const documents = {
     "project-overview": {
       title: "Project Overview",
       content: `# Project Overview
   
   This demo document is served via MCP *Resources*.`,
       mimeType: "text/markdown",
     },
   };
   
   const users = {
     alice: {
       id: "alice",
       name: "Alice Johnson",
       role: "Project Manager",
       email: "alice@example.com",
     },
   };
   
   /* ───── POST /mcp — initialise session & handle requests ───── */
   app.post("/mcp", async (req: Request, res: Response) => {
     const sessionId = req.headers["mcp-session-id"] as string | undefined;
     let transport: StreamableHTTPServerTransport | undefined;
     
     if (sessionId) {
       transport = transports[sessionId];
     }

     /* 1️⃣ FIRST request: create a new StreamableHTTP transport + MCP server */
     if (!transport && isInitializeRequest(req.body)) {
       transport = new StreamableHTTPServerTransport({
         sessionIdGenerator: () => randomUUID(),
         onsessioninitialized: (id) => {
           transports[id] = transport!;
         },
       });

       transport.onclose = () => {
         if (transport?.sessionId) delete transports[transport.sessionId];
       };

       /* ── Build MCP server and register capabilities ── */
       const mcp = new McpServer({ name: "demo-mcp-server", version: "1.0.0" });

       /* --- Tools ----------------------------------------------------------- */
       mcp.registerTool(
         "calculate_sum",
         {
           title: "Calculator",
           description: "Adds two numbers",
           inputSchema: {
             a: z.number().describe("First number"),
             b: z.number().describe("Second number"),
           },
         },
         async ({ a, b }) => ({
           content: [
             { type: "text", text: `The sum of ${a} and ${b} is ${a + b}.` },
           ],
         })
       );

       mcp.registerTool(
         "greet_user",
         {
           title: "Greeter",
           description: "Greets a user by name",
           inputSchema: {
             name: z.string().describe("Name to greet"),
           },
         },
         async ({ name }) => ({
           content: [{ type: "text", text: `Hello, ${name}! 👋` }],
         })
       );

       mcp.registerTool(
         "generate_uuid",
         {
           title: "UUID Generator",
           description: "Generates a random UUID",
           inputSchema: {}, // no args
         },
         async () => ({
           content: [{ type: "text", text: randomUUID() }],
         })
       );

       /* --- Resources ------------------------------------------------------- */
       mcp.registerResource(
         "document",
         new ResourceTemplate("doc://{docId}", {
           list: async () => ({
             resources: Object.entries(documents).map(([id, d]) => ({
               name: d.title,
               uri: `doc://${id}`,
               description: "Markdown document",
               mimeType: d.mimeType,
             })),
           }),
         }),
         {
           title: "Demo Documents",
           description: "Static docs exposed via MCP resources",
         },
         async (uri, { docId }) => {
           const doc = documents[docId as keyof typeof documents];
           if (!doc) throw new Error("Document not found");
           return {
             contents: [
               { uri: uri.href, text: doc.content, mimeType: doc.mimeType },
             ],
           };
         }
       );

       mcp.registerResource(
         "user-profile",
         new ResourceTemplate("user://{userId}", {
           list: async () => ({
             resources: Object.values(users).map((u) => ({
               name: `${u.name} Profile`,
               uri: `user://${u.id}`,
               description: `Profile for ${u.name}`,
             })),
           }),
         }),
         {
           title: "Team Profiles",
           description: "Demo user profiles",
         },
         async (uri, { userId }) => {
           const user = users[userId as keyof typeof users];
           if (!user) throw new Error("User not found");
           return {
             contents: [
               {
                 uri: uri.href,
                 text: JSON.stringify(user, null, 2),
                 mimeType: "application/json",
               },
             ],
           };
         }
       );

       /* --- Prompts --------------------------------------------------------- */
       mcp.registerPrompt(
         "simple-summary",
         {
           title: "Summary Prompt",
           description: "Creates a TL;DR summary for supplied text",
           argsSchema: {
             text: z.string().describe("Text to summarise"),
           },
         },
         ({ text }) => ({
           messages: [
             {
               role: "user",
               content: {
                 type: "text",
                 text: `Please provide a concise summary of the following:\n\n${text}`,
               },
             },
           ],
         })
       );

       await mcp.connect(transport);
     }

     /* 2️⃣ Subsequent requests must belong to an existing session */
     if (!transport) {
       return res.status(400).json({
         jsonrpc: "2.0",
         error: { code: -32000, message: "No valid session or initialization" },
         id: null,
       });
     }

     await transport.handleRequest(req, res, req.body);
   });
   
   /* ───── Optional GET / DELETE handlers (stream / cleanup) ───── */
   for (const method of ["get", "delete"] as const) {
     app[method]("/mcp", async (req: Request, res: Response) => {
       const sessionId = req.headers["mcp-session-id"] as string | undefined;
       const transport = sessionId && transports[sessionId];
       if (!transport) return res.status(400).send("Missing or invalid session ID");
   
       await transport.handleRequest(req, res);
       if (method === "delete") {
         transport.close();
         delete transports[sessionId!];
       }
     });
   }
   
   /* ───── Start server ───── */
   const PORT = 3000;
   app.listen(PORT, () => {
     console.log(`✅ MCP server listening on http://localhost:${PORT}/mcp`);
   });
   