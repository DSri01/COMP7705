import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { randomUUID } from "crypto";
import type { Express, Request, Response } from "express";
import type { PlatformMcpToolContext } from "./context.js";
import { registerAllPlatformMcpTools } from "./tools/registerAll.js";

export type { PlatformMcpToolContext } from "./context.js";

export function createPlatformMcpServer(ctx: PlatformMcpToolContext): McpServer {
  ctx.mcpLogger.info("Creating Platform MCP server");
  const server = new McpServer(
    {
      name: "comp7705-platform-mcp",
      version: "1.0.0",
      description: `
# COMP7705 Platform MCP Server
The COMP7705 project is a centralized container vulnerability intelligence platform that helps security and
engineering teams make risk-based decisions across services.
## Purpose
This platform supports vulnerability tracking and triage for containerized software.
It helps teams monitor discovered CVEs, track investigation/decision status, and
maintain security intelligence for container images across projects/components.
## Terminology
- **Project** — Top-level grouping for a deployment or product context. A project contains one or more components.
- **Component** — A logical unit within a project (for example a service or workload you track). It is not necessarily a single running container instance; it is the entity whose container image you manage and scan in the platform.
- **Container image (platform record)** — An uploaded image tied to a component, ordered in a **chain** (lineage). The **current** image is the latest chain entry used for scans and image-CVE triage; older entries remain for history.
## What data the platform stores
- Projects and components (application/service ownership structure)
- Container images and scan lineage/state
- CVE records and vulnerability intelligence metadata
- Image-to-CVE mappings, including decision/statement lifecycle data
- CISA KEV catalog fetch history and entries
- CVE research documents and analyst notes
- Stored files/artifacts related to ingestion and analysis workflows
## MCP scope and safety
- MCP exposes read-only access for AI-assisted querying and summarization
- No mutation tools (no create/update/delete side effects)
- Intended for least-privilege database credentials (SELECT-only)
`.trim(),
    },
    { capabilities: { tools: {} } },
  );

  registerAllPlatformMcpTools(server, ctx);

  return server;
}

export function registerPlatformMcpRoutes(
  expressApp: Express,
  ctx: PlatformMcpToolContext,
  path = "/mcp",
): void {
  ctx.mcpLogger.info({ path }, "Registering Platform MCP routes");
  const sessionTransports = new Map<string, StreamableHTTPServerTransport>();
  const sessionServers = new Map<string, McpServer>();

  expressApp.all(path, async (req: Request, res: Response) => {
    const sessionIdHeader = req.headers["mcp-session-id"];
    const sessionId = typeof sessionIdHeader === "string" ? sessionIdHeader : undefined;
    let transport = sessionId ? sessionTransports.get(sessionId) : undefined;
    let server = sessionId ? sessionServers.get(sessionId) : undefined;

    ctx.mcpLogger.info({ path, method: req.method, sessionId }, "MCP request received");

    try {
      if (!transport || !server) {
        if (req.method !== "POST") {
          res.status(400).json({
            jsonrpc: "2.0",
            error: {
              code: -32000,
              message: "No valid MCP session for this request. Start with POST initialize.",
            },
            id: null,
          });
          return;
        }

        server = createPlatformMcpServer(ctx);
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (newSessionId) => {
            sessionTransports.set(newSessionId, transport!);
            sessionServers.set(newSessionId, server!);
            ctx.mcpLogger.info({ path, sessionId: newSessionId }, "MCP session initialized");
          },
        });

        transport.onclose = async () => {
          const closedSessionId = transport!.sessionId;
          if (closedSessionId) {
            sessionTransports.delete(closedSessionId);
            sessionServers.delete(closedSessionId);
          }
          await server!.close();
          ctx.mcpLogger.info({ path, sessionId: closedSessionId }, "MCP session closed");
        };

        await server.connect(transport);
      }

      await transport.handleRequest(req, res, req.body);
    } catch (err) {
      ctx.mcpLogger.error({ err, path, method: req.method, sessionId }, "MCP request failed");
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null,
        });
      }
    }
  });
}
